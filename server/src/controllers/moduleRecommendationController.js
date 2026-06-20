const db = require('../db');

function calculateModuleCombinations() {
  const patches = db.prepare(`
    SELECT id, modules_used, likes_count
    FROM patches
    WHERE status = 'approved' AND is_public = 1 AND modules_used IS NOT NULL
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
  const { limit = 8, min_score = 0.1 } = ctx.query;

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

  const statsRecs = db.prepare(`
    SELECT mcs.*, mod.name as paired_name, mod.type as paired_type, mod.hp as paired_hp,
           mod.description as paired_description, m.name as paired_manufacturer_name
    FROM module_combination_stats mcs
    JOIN modules mod ON mcs.paired_module_id = mod.id
    LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id
    WHERE mcs.module_id = ? 
      AND mod.status = 'active'
      AND mcs.confidence_score >= ?
      AND mcs.paired_module_id NOT IN (
        SELECT paired_module_id FROM module_recommended_combinations WHERE module_id = ?
      )
    ORDER BY mcs.confidence_score DESC, mcs.co_occurrence_count DESC
    LIMIT ?
  `).all(moduleId, min_score, moduleId, limit);

  const combined = [
    ...manualRecs.map(r => ({ ...r, is_manual: true, source: 'manual' })),
    ...statsRecs.map(r => ({ ...r, is_manual: false, source: 'stats' }))
  ].slice(0, limit);

  const patchSample = db.prepare(`
    SELECT p.id, p.title, p.likes_count, p.views_count, u.username
    FROM patches p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'approved' AND p.is_public = 1
      AND p.modules_used LIKE ? AND p.modules_used LIKE ?
    ORDER BY p.likes_count DESC, p.created_at DESC
    LIMIT 3
  `);

  combined.forEach(item => {
    item.sample_patches = patchSample.all(`%${moduleId}%`, `%${item.paired_module_id}%`);
  });

  ctx.body = {
    list: combined,
    module_id: moduleId,
    total: combined.length
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
    WHERE p.status = 'approved' AND p.is_public = 1
      AND p.modules_used LIKE ? AND p.modules_used LIKE ?
    ORDER BY p.likes_count DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(`%${moduleId}%`, `%${pairedId}%`, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM patches p
    WHERE p.status = 'approved' AND p.is_public = 1
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
  const { limit = 20, type = '' } = ctx.query;

  let typeFilter = '';
  let params = [];

  if (type) {
    typeFilter = 'AND mod.type = ?';
    params.push(type);
  }

  params.push(limit);

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
      ${typeFilter}
    ORDER BY mcs.confidence_score DESC, mcs.co_occurrence_count DESC
    LIMIT ?
  `).all(...params);

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
