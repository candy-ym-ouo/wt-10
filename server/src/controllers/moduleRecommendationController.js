const db = require('../db');

const DEFAULT_CONFIG = {
  min_co_occurrence: 2,
  min_confidence_score: 0.1,
  max_recommendations: 8,
  max_popular_combinations: 20,
  auto_calculate: '1'
};

function getConfig() {
  try {
    const configs = db.prepare('SELECT key, value FROM module_recommendation_config').all();
    const result = { ...DEFAULT_CONFIG };
    configs.forEach(c => {
      if (c.value !== undefined && c.value !== null && c.value !== '') {
        result[c.key] = c.value;
      }
    });
    return result;
  } catch (e) {
    return { ...DEFAULT_CONFIG };
  }
}

function parseIntSafe(v, def) {
  const n = parseInt(v);
  return isNaN(n) ? def : n;
}

function parseFloatSafe(v, def) {
  const n = parseFloat(v);
  return isNaN(n) ? def : n;
}

function calculateModuleCombinations() {
  const patches = db.prepare(`
    SELECT id, modules_used, likes_count
    FROM patches
    WHERE status = 'approved' AND is_public = 1 AND modules_used IS NOT NULL AND deleted_at IS NULL
  `).all();

  const comboCounts = new Map();
  const comboLikes = new Map();
  const modulePatchCounts = new Map();

  patches.forEach(patch => {
    let moduleIds = [];
    try {
      moduleIds = JSON.parse(patch.modules_used) || [];
    } catch (e) {
      return;
    }

    if (!Array.isArray(moduleIds) || moduleIds.length < 2) return;

    const uniqueIds = [...new Set(moduleIds)].sort((a, b) => a - b);

    uniqueIds.forEach(id => {
      modulePatchCounts.set(id, (modulePatchCounts.get(id) || 0) + 1);
    });

    for (let i = 0; i < uniqueIds.length; i++) {
      for (let j = 0; j < uniqueIds.length; j++) {
        if (i === j) continue;
        const key = `${uniqueIds[i]}-${uniqueIds[j]}`;
        comboCounts.set(key, (comboCounts.get(key) || 0) + 1);
        const likes = comboLikes.get(key) || [];
        likes.push(patch.likes_count || 0);
        comboLikes.set(key, likes);
      }
    }
  });

  const insertOrUpdate = db.prepare(`
    INSERT INTO module_combination_stats 
      (module_id, paired_module_id, co_occurrence_count, avg_patch_likes, confidence_score, last_calculated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(module_id, paired_module_id) DO UPDATE SET
      co_occurrence_count = excluded.co_occurrence_count,
      avg_patch_likes = excluded.avg_patch_likes,
      confidence_score = excluded.confidence_score,
      last_calculated_at = CURRENT_TIMESTAMP
  `);

  const updateMany = db.transaction((entries) => {
    entries.forEach(e => insertOrUpdate.run(...e));
  });

  const batch = [];
  const batchSize = 100;
  const totalPatches = patches.length || 1;

  for (const [key, count] of comboCounts) {
    const [moduleId, pairedId] = key.split('-').map(Number);
    const likes = comboLikes.get(key) || [];
    const avgLikes = likes.length > 0 ? likes.reduce((a, b) => a + b, 0) / likes.length : 0;

    const moduleCount = modulePatchCounts.get(moduleId) || 1;
    const pairedCount = modulePatchCounts.get(pairedId) || 1;

    const support = count / totalPatches;
    const confidence = count / moduleCount;
    const lift = (count / totalPatches) / ((moduleCount / totalPatches) * (pairedCount / totalPatches));

    const confidenceScore = (support * 0.3 + confidence * 0.4 + Math.min(lift, 5) / 5 * 0.3);

    batch.push([moduleId, pairedId, count, parseFloat(avgLikes.toFixed(2)), parseFloat(confidenceScore.toFixed(4))]);

    if (batch.length >= batchSize) {
      updateMany(batch);
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    updateMany(batch);
  }

  return comboCounts.size;
}

exports.getRecommendedCombinations = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const config = getConfig();
  const defaultLimit = parseIntSafe(config.max_recommendations, 8);
  const defaultMinScore = parseFloatSafe(config.min_confidence_score, 0.1);
  const defaultMinCount = parseIntSafe(config.min_co_occurrence, 2);

  const { limit = defaultLimit, min_score = defaultMinScore, min_count = defaultMinCount } = ctx.query;

  const module = db.prepare('SELECT id FROM modules WHERE id = ?').get(moduleId);
  if (!module) {
    ctx.status = 404;
    ctx.body = { error: '模块不存在' };
    return;
  }

  const manualRecs = db.prepare(`
    SELECT mrc.*, mod.name as paired_name, mod.type as paired_type, mod.hp as paired_hp, 
           mod.description as paired_description, m.name as paired_manufacturer_name
    FROM module_recommended_combinations mrc
    JOIN modules mod ON mrc.paired_module_id = mod.id
    LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id
    WHERE mrc.module_id = ? AND mod.status = 'active'
    ORDER BY mrc.sort_order ASC, mrc.weight DESC, mrc.id ASC
  `).all(moduleId);

  const manualIds = new Set(manualRecs.map(r => r.paired_module_id));
  const manualLimit = limit;
  const statsLimit = Math.max(0, limit - manualRecs.length);

  let statsRecs = [];
  if (statsLimit > 0) {
    statsRecs = db.prepare(`
      SELECT mcs.*, mod.name as paired_name, mod.type as paired_type, mod.hp as paired_hp,
             mod.description as paired_description, m.name as paired_manufacturer_name
      FROM module_combination_stats mcs
      JOIN modules mod ON mcs.paired_module_id = mod.id
      LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id
      WHERE mcs.module_id = ? 
        AND mod.status = 'active'
        AND mcs.confidence_score >= ?
        AND mcs.co_occurrence_count >= ?
        AND mcs.paired_module_id NOT IN (
          SELECT paired_module_id FROM module_recommended_combinations WHERE module_id = ?
        )
      ORDER BY mcs.confidence_score DESC, mcs.co_occurrence_count DESC
      LIMIT ?
    `).all(moduleId, min_score, min_count, moduleId, statsLimit);
  }

  const combined = [
    ...manualRecs.map(r => ({ ...r, is_manual: true, source: 'manual' })),
    ...statsRecs.map(r => ({ ...r, is_manual: false, source: 'stats' }))
  ].slice(0, parseIntSafe(limit, defaultLimit));

  const patchSample = db.prepare(`
    SELECT p.id, p.title, p.likes_count, p.views_count, u.username
    FROM patches p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'approved' AND p.is_public = 1 AND p.deleted_at IS NULL
      AND p.modules_used LIKE ? AND p.modules_used LIKE ?
    ORDER BY p.likes_count DESC, p.created_at DESC
    LIMIT 3
  `);

  const patchCountStmt = db.prepare(`
    SELECT COUNT(*) as count FROM patches
    WHERE status = 'approved' AND is_public = 1 AND deleted_at IS NULL
      AND modules_used LIKE ? AND modules_used LIKE ?
  `);

  const topPatchStmt = db.prepare(`
    SELECT p.id, p.title, p.likes_count, u.username
    FROM patches p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'approved' AND p.is_public = 1 AND p.deleted_at IS NULL
      AND p.modules_used LIKE ? AND p.modules_used LIKE ?
    ORDER BY p.likes_count DESC
    LIMIT 1
  `);

  combined.forEach(item => {
    item.sample_patches = patchSample.all(`%${moduleId}%`, `%${item.paired_module_id}%`);
    item.patch_count = patchCountStmt.get(`%${moduleId}%`, `%${item.paired_module_id}%`).count;
    const topPatch = topPatchStmt.get(`%${moduleId}%`, `%${item.paired_module_id}%`);
    item.top_patch = topPatch || null;
  });

  ctx.body = {
    list: combined,
    module_id: moduleId,
    total: combined.length,
    config: {
      min_co_occurrence: defaultMinCount,
      min_confidence_score: defaultMinScore,
      max_recommendations: defaultLimit
    }
  };
};

exports.getCombinationPatches = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const pairedId = parseInt(ctx.params.pairedId);
  const { page = 1, limit = 20 } = ctx.query;
  const offset = (page - 1) * limit;

  const patches = db.prepare(`
    SELECT p.*, u.username, u.avatar
    FROM patches p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'approved' AND p.is_public = 1 AND p.deleted_at IS NULL
      AND p.modules_used LIKE ? AND p.modules_used LIKE ?
    ORDER BY p.likes_count DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(`%${moduleId}%`, `%${pairedId}%`, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM patches p
    WHERE p.status = 'approved' AND p.is_public = 1 AND p.deleted_at IS NULL
      AND p.modules_used LIKE ? AND p.modules_used LIKE ?
  `).get(`%${moduleId}%`, `%${pairedId}%`);

  ctx.body = {
    list: patches,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getPopularCombinations = async (ctx) => {
  const config = getConfig();
  const defaultLimit = parseIntSafe(config.max_popular_combinations, 20);
  const defaultMinScore = parseFloatSafe(config.min_confidence_score, 0.1);
  const defaultMinCount = parseIntSafe(config.min_co_occurrence, 2);

  const { limit = defaultLimit, type = '', min_score = defaultMinScore, min_count = defaultMinCount } = ctx.query;

  let typeFilter = '';
  let params = [];

  if (type) {
    typeFilter = 'AND (mod.type = ? OR paired.type = ?)';
    params.push(type, type);
  }

  const combos = db.prepare(`
    SELECT mcs.*, 
           mod.name as module_name, mod.type as module_type,
           paired.name as paired_name, paired.type as paired_type,
           m1.name as module_manufacturer,
           m2.name as paired_manufacturer
    FROM module_combination_stats mcs
    JOIN modules mod ON mcs.module_id = mod.id
    JOIN modules paired ON mcs.paired_module_id = paired.id
    LEFT JOIN manufacturers m1 ON mod.manufacturer_id = m1.id
    LEFT JOIN manufacturers m2 ON paired.manufacturer_id = m2.id
    WHERE mod.status = 'active' AND paired.status = 'active'
      AND mcs.module_id < mcs.paired_module_id
      AND mcs.confidence_score >= ?
      AND mcs.co_occurrence_count >= ?
      ${typeFilter}
    ORDER BY mcs.confidence_score DESC, mcs.co_occurrence_count DESC
    LIMIT ?
  `).all(min_score, min_count, ...params, limit);

  ctx.body = { list: combos };
};

exports.recalculateStats = async (ctx) => {
  try {
    const count = calculateModuleCombinations();
    ctx.body = { success: true, combinations_calculated: count };
  } catch (e) {
    ctx.status = 500;
    ctx.body = { error: '重新计算失败: ' + e.message };
  }
};

exports.getConfig = async (ctx) => {
  const configs = db.prepare('SELECT key, value FROM module_recommendation_config').all();
  const result = {};
  configs.forEach(c => {
    result[c.key] = c.value;
  });
  ctx.body = result;
};

exports.updateConfig = async (ctx) => {
  const { key, value } = ctx.request.body;

  if (!key) {
    ctx.status = 400;
    ctx.body = { error: '缺少配置键' };
    return;
  }

  db.prepare(`
    INSERT INTO module_recommendation_config (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `).run(key, value || '');

  ctx.body = { success: true, key, value };
};

exports.batchUpdateConfig = async (ctx) => {
  const configs = ctx.request.body || {};

  const stmt = db.prepare(`
    INSERT INTO module_recommendation_config (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `);

  const updateMany = db.transaction((items) => {
    items.forEach(([k, v]) => stmt.run(k, v));
  });

  updateMany(Object.entries(configs));

  ctx.body = { success: true, updated: Object.keys(configs).length };
};

exports.getModuleStats = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);

  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_combinations,
      SUM(CASE WHEN co_occurrence_count >= 3 THEN 1 ELSE 0 END) as strong_combinations,
      AVG(confidence_score) as avg_confidence,
      MAX(confidence_score) as max_confidence
    FROM module_combination_stats
    WHERE module_id = ?
  `).get(moduleId);

  const topPartners = db.prepare(`
    SELECT mcs.paired_module_id, mod.name, mod.type, m.name as manufacturer,
           mcs.co_occurrence_count, mcs.confidence_score
    FROM module_combination_stats mcs
    JOIN modules mod ON mcs.paired_module_id = mod.id
    LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id
    WHERE mcs.module_id = ?
    ORDER BY mcs.confidence_score DESC
    LIMIT 5
  `).all(moduleId);

  const manualCount = db.prepare(`
    SELECT COUNT(*) as count FROM module_recommended_combinations WHERE module_id = ?
  `).get(moduleId);

  ctx.body = {
    stats: {
      total_combinations: stats.total_combinations || 0,
      strong_combinations: stats.strong_combinations || 0,
      avg_confidence: parseFloat((stats.avg_confidence || 0).toFixed(4)),
      max_confidence: parseFloat((stats.max_confidence || 0).toFixed(4)),
      manual_recommendations: manualCount.count || 0
    },
    top_partners: topPartners
  };
};

exports.adminGetRecommendedCombinations = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);

  const manualRecs = db.prepare(`
    SELECT mrc.*, mod.name as paired_name, mod.type as paired_type, m.name as paired_manufacturer_name
    FROM module_recommended_combinations mrc
    JOIN modules mod ON mrc.paired_module_id = mod.id
    LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id
    WHERE mrc.module_id = ?
    ORDER BY mrc.sort_order ASC, mrc.id ASC
  `).all(moduleId);

  const statsRecs = db.prepare(`
    SELECT mcs.*, mod.name as paired_name, mod.type as paired_type, m.name as paired_manufacturer_name
    FROM module_combination_stats mcs
    JOIN modules mod ON mcs.paired_module_id = mod.id
    LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id
    WHERE mcs.module_id = ?
    ORDER BY mcs.confidence_score DESC, mcs.co_occurrence_count DESC
    LIMIT 20
  `).all(moduleId);

  ctx.body = {
    manual: manualRecs,
    stats: statsRecs
  };
};

exports.adminAddRecommendedCombination = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const { paired_module_id, reason, sort_order, weight } = ctx.request.body;

  if (!paired_module_id) {
    ctx.status = 400;
    ctx.body = { error: '请选择搭配模块' };
    return;
  }

  if (parseInt(paired_module_id) === moduleId) {
    ctx.status = 400;
    ctx.body = { error: '不能推荐模块自身' };
    return;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO module_recommended_combinations 
        (module_id, paired_module_id, reason, sort_order, is_manual, weight)
      VALUES (?, ?, ?, ?, 1, ?)
    `);
    const result = stmt.run(
      moduleId,
      paired_module_id,
      reason || '',
      sort_order || 0,
      weight || 1
    );
    ctx.body = { id: result.lastInsertRowid, success: true };
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      ctx.status = 400;
      ctx.body = { error: '该搭配已在推荐列表中' };
    } else {
      throw err;
    }
  }
};

exports.adminUpdateRecommendedCombination = async (ctx) => {
  const id = parseInt(ctx.params.comboId);
  const { reason, sort_order, weight } = ctx.request.body;

  db.prepare(`
    UPDATE module_recommended_combinations SET
      reason = COALESCE(?, reason),
      sort_order = COALESCE(?, sort_order),
      weight = COALESCE(?, weight),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(reason, sort_order, weight, id);

  ctx.body = { success: true };
};

exports.adminRemoveRecommendedCombination = async (ctx) => {
  const id = parseInt(ctx.params.comboId);
  db.prepare('DELETE FROM module_recommended_combinations WHERE id = ?').run(id);
  ctx.body = { success: true };
};

exports.adminReorderRecommendedCombinations = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const { orders } = ctx.request.body;

  const stmt = db.prepare(`
    UPDATE module_recommended_combinations 
    SET sort_order = ? 
    WHERE id = ? AND module_id = ?
  `);

  const updateMany = db.transaction((items) => {
    items.forEach(item => stmt.run(item.sort_order, item.id, moduleId));
  });

  updateMany(orders);

  ctx.body = { success: true };
};

exports.adminGetCombinationStatsList = async (ctx) => {
  const { page = 1, limit = 50, module_id, min_count = 0 } = ctx.query;
  const offset = (page - 1) * limit;

  let where = ['mod.status = \'active\'', 'paired.status = \'active\''];
  let params = [];

  if (module_id) {
    where.push('(mcs.module_id = ? OR mcs.paired_module_id = ?)');
    params.push(parseInt(module_id), parseInt(module_id));
  }
  if (min_count > 0) {
    where.push('mcs.co_occurrence_count >= ?');
    params.push(parseInt(min_count));
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  const combos = db.prepare(`
    SELECT mcs.*,
           mod.name as module_name, mod.type as module_type,
           paired.name as paired_name, paired.type as paired_type,
           m1.name as module_manufacturer,
           m2.name as paired_manufacturer
    FROM module_combination_stats mcs
    JOIN modules mod ON mcs.module_id = mod.id
    JOIN modules paired ON mcs.paired_module_id = paired.id
    LEFT JOIN manufacturers m1 ON mod.manufacturer_id = m1.id
    LEFT JOIN manufacturers m2 ON paired.manufacturer_id = m2.id
    ${whereSql}
    ORDER BY mcs.confidence_score DESC, mcs.co_occurrence_count DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count
    FROM module_combination_stats mcs
    JOIN modules mod ON mcs.module_id = mod.id
    JOIN modules paired ON mcs.paired_module_id = paired.id
    ${whereSql}
  `).get(...params);

  ctx.body = {
    list: combos,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getSimilarPatches = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const config = getConfig();
  const defaultLimit = parseIntSafe(config.max_similar_patches, 8);
  const defaultMinScore = parseFloatSafe(config.min_similarity_score, 0.1);
  const { limit = defaultLimit, min_score = defaultMinScore } = ctx.query;

  const patch = db.prepare('SELECT id, modules_used, likes_count FROM patches WHERE id = ? AND deleted_at IS NULL').get(patchId);
  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  let similarFromDB = [];
  try {
    similarFromDB = db.prepare(`
      SELECT ps.similar_patch_id, ps.similarity_score, ps.shared_count, ps.shared_modules,
             p.title, p.description, p.likes_count, p.views_count, p.tags,
             p.modules_used, p.created_at, p.image_url,
             u.username, u.avatar
      FROM patch_similarity ps
      JOIN patches p ON ps.similar_patch_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE ps.patch_id = ?
        AND p.status = 'approved' AND p.is_public = 1
        AND ps.similarity_score >= ?
      ORDER BY ps.similarity_score DESC
      LIMIT ?
    `).all(patchId, min_score, limit);
  } catch (e) {
    similarFromDB = [];
  }

  if (similarFromDB.length > 0) {
    similarFromDB.forEach(p => {
      try {
        p.tags = JSON.parse(p.tags || '[]');
      } catch { p.tags = []; }
      try {
        p.shared_modules = JSON.parse(p.shared_modules || '[]');
      } catch { p.shared_modules = []; }
      try {
        const mUsed = JSON.parse(p.modules_used || '[]');
        p.module_count = Array.isArray(mUsed) ? mUsed.length : 0;
      } catch { p.module_count = 0; }
      delete p.modules_used;
    });

    ctx.body = {
      list: similarFromDB,
      source_patch_id: patchId,
      total: similarFromDB.length
    };
    return;
  }

  let sourceModules = [];
  try {
    sourceModules = JSON.parse(patch.modules_used) || [];
    sourceModules = [...new Set(sourceModules)];
  } catch (e) {
    sourceModules = [];
  }

  if (sourceModules.length === 0) {
    ctx.body = { list: [], source_patch_id: patchId, total: 0 };
    return;
  }

  const moduleConditions = sourceModules.map(() => 
    'EXISTS (SELECT 1 FROM json_each(p.modules_used) WHERE value = ?)'
  ).join(' OR ');
  const moduleParams = sourceModules.map(id => id);

  const candidates = db.prepare(`
    SELECT p.id, p.title, p.description, p.likes_count, p.views_count, p.tags,
           p.modules_used, p.created_at, p.image_url,
           u.username, u.avatar
    FROM patches p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'approved' AND p.is_public = 1 AND p.deleted_at IS NULL
      AND p.id != ?
      AND (${moduleConditions})
    ORDER BY p.likes_count DESC, p.created_at DESC
    LIMIT 50
  `).all(patchId, ...moduleParams);

  const scored = candidates.map(candidate => {
    let candidateModules = [];
    try {
      candidateModules = JSON.parse(candidate.modules_used) || [];
      candidateModules = [...new Set(candidateModules)];
    } catch (e) {
      candidateModules = [];
    }

    const sourceSet = new Set(sourceModules);
    const shared = candidateModules.filter(m => sourceSet.has(m));
    const unionSize = new Set([...sourceModules, ...candidateModules]).size;
    const jaccard = unionSize > 0 ? shared.length / unionSize : 0;
    const overlapRatio = shared.length / Math.max(Math.min(sourceModules.length, candidateModules.length), 1);
    const likesBoost = Math.min((candidate.likes_count || 0) / 50, 1) * 0.1;
    const similarityScore = jaccard * 0.5 + overlapRatio * 0.4 + likesBoost;

    return {
      similar_patch_id: candidate.id,
      title: candidate.title,
      description: candidate.description,
      likes_count: candidate.likes_count,
      views_count: candidate.views_count,
      username: candidate.username,
      avatar: candidate.avatar,
      created_at: candidate.created_at,
      image_url: candidate.image_url,
      similarity_score: parseFloat(similarityScore.toFixed(4)),
      shared_count: shared.length,
      shared_modules: shared,
      module_count: candidateModules.length
    };
  });

  scored.sort((a, b) => {
    if (b.shared_count !== a.shared_count) {
      return b.shared_count - a.shared_count;
    }
    return b.similarity_score - a.similarity_score;
  });

  const results = scored
    .filter(p => p.similarity_score >= parseFloat(min_score))
    .slice(0, parseIntSafe(limit, defaultLimit));

  ctx.body = {
    list: results,
    source_patch_id: patchId,
    total: results.length
  };
};

exports.getModulePatchRecommendations = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const config = getConfig();
  const defaultLimit = parseIntSafe(config.max_recommendations, 8);
  const { limit = defaultLimit, sort_by = 'affinity' } = ctx.query;

  const module = db.prepare('SELECT id FROM modules WHERE id = ?').get(moduleId);
  if (!module) {
    ctx.status = 404;
    ctx.body = { error: '模块不存在' };
    return;
  }

  let affinityPatches = [];
  try {
    affinityPatches = db.prepare(`
      SELECT mpa.affinity_score, mpa.shared_module_count, mpa.combination_weight,
             p.id, p.title, p.description, p.likes_count, p.views_count, p.tags,
             p.modules_used, p.created_at, p.image_url,
             u.username, u.avatar
      FROM module_patch_affinity mpa
      JOIN patches p ON mpa.patch_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE mpa.module_id = ?
        AND p.status = 'approved' AND p.is_public = 1
      ORDER BY mpa.${sort_by === 'combination' ? 'combination_weight' : sort_by === 'shared' ? 'shared_module_count' : 'affinity_score'} DESC
      LIMIT ?
    `).all(moduleId, limit);
  } catch (e) {
    affinityPatches = [];
  }

  if (affinityPatches.length > 0) {
    affinityPatches.forEach(p => {
      try {
        p.tags = JSON.parse(p.tags || '[]');
      } catch { p.tags = []; }
      try {
        const mUsed = JSON.parse(p.modules_used || '[]');
        p.module_count = Array.isArray(mUsed) ? mUsed.length : 0;
        const moduleSet = new Set(mUsed);
        p.uses_current_module = moduleSet.has(moduleId);
      } catch { p.module_count = 0; p.uses_current_module = false; }
      delete p.modules_used;
    });

    ctx.body = {
      list: affinityPatches,
      module_id: moduleId,
      total: affinityPatches.length
    };
    return;
  }

  const patches = db.prepare(`
    SELECT p.*, u.username, u.avatar
    FROM patches p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'approved' AND p.is_public = 1 AND p.deleted_at IS NULL
      AND p.modules_used LIKE ?
    ORDER BY p.likes_count DESC, p.created_at DESC
    LIMIT ?
  `).all(`%${moduleId}%`, limit);

  patches.forEach(p => {
    try {
      p.tags = JSON.parse(p.tags || '[]');
    } catch { p.tags = []; }
    p.affinity_score = 0;
    p.shared_module_count = 0;
    p.combination_weight = 0;
    p.uses_current_module = true;
    try {
      const mUsed = JSON.parse(p.modules_used || '[]');
      p.module_count = Array.isArray(mUsed) ? mUsed.length : 0;
    } catch { p.module_count = 0; }
  });

  ctx.body = {
    list: patches,
    module_id: moduleId,
    total: patches.length
  };
};

exports.recalculateAffinity = async (ctx) => {
  try {
    const patches = db.prepare(`
      SELECT id, modules_used, likes_count
      FROM patches
      WHERE status = 'approved' AND is_public = 1 AND modules_used IS NOT NULL AND deleted_at IS NULL
    `).all();

    const insertStmt = db.prepare(`
      INSERT INTO module_patch_affinity (module_id, patch_id, affinity_score, shared_module_count, combination_weight, last_calculated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(module_id, patch_id) DO UPDATE SET
        affinity_score = excluded.affinity_score,
        shared_module_count = excluded.shared_module_count,
        combination_weight = excluded.combination_weight,
        last_calculated_at = CURRENT_TIMESTAMP
    `);

    const batch = [];
    const batchSize = 100;
    const runBatch = db.transaction((items) => {
      items.forEach(item => insertStmt.run(...item));
    });

    let patchCount = 0;

    patches.forEach(patch => {
      let moduleIds = [];
      try {
        moduleIds = JSON.parse(patch.modules_used) || [];
      } catch (e) { return; }
      if (!Array.isArray(moduleIds) || moduleIds.length === 0) return;

      const uniqueIds = [...new Set(moduleIds)];
      patchCount++;

      uniqueIds.forEach(mid => {
        const comboStats = db.prepare(`
          SELECT COALESCE(SUM(confidence_score), 0) as total_confidence,
                 COUNT(*) as combo_count
          FROM module_combination_stats
          WHERE module_id = ?
        `).get(mid);

        const affinityScore = (comboStats.combo_count || 0) * 0.3 +
          (comboStats.total_confidence || 0) * 0.4 +
          uniqueIds.length * 0.1 +
          (patch.likes_count || 0) * 0.002;

        const combinationWeight = (comboStats.total_confidence || 0) * (comboStats.combo_count || 0);

        batch.push([mid, patch.id, parseFloat(affinityScore.toFixed(4)), uniqueIds.length, parseFloat(combinationWeight.toFixed(4))]);

        if (batch.length >= batchSize) {
          runBatch(batch);
          batch.length = 0;
        }
      });
    });

    if (batch.length > 0) {
      runBatch(batch);
    }

    ctx.body = {
      success: true,
      patches_processed: patchCount,
      message: '关联评分重新计算完成'
    };
  } catch (e) {
    ctx.status = 500;
    ctx.body = { error: '重新计算失败: ' + e.message };
  }
};
