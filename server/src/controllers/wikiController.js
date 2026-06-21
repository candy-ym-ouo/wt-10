const db = require('../db');

exports.getModuleWiki = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);

  const module = db.prepare(`
    SELECT mod.*, m.name as manufacturer_name, m.website as manufacturer_website
    FROM modules mod
    LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id
    WHERE mod.id = ?
  `).get(moduleId);

  if (!module) {
    ctx.status = 404;
    ctx.body = { error: '模块不存在' };
    return;
  }

  const wiki = db.prepare('SELECT * FROM module_wiki WHERE module_id = ?').get(moduleId);

  const parameters = db.prepare(`
    SELECT * FROM module_parameters 
    WHERE module_id = ? 
    ORDER BY sort_order ASC, id ASC
  `).all(moduleId);

  const tips = db.prepare(`
    SELECT * FROM module_tips 
    WHERE module_id = ? 
    ORDER BY sort_order ASC, id ASC
  `).all(moduleId);

  const recommendedPatches = db.prepare(`
    SELECT mrp.*, p.title, p.description, p.image_url, u.username, p.likes_count
    FROM module_recommended_patches mrp
    JOIN patches p ON mrp.patch_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE mrp.module_id = ? AND p.status = 'approved' AND p.is_public = 1
    ORDER BY mrp.sort_order ASC, mrp.id ASC
  `).all(moduleId);

  const patches = db.prepare(`
    SELECT p.*, u.username
    FROM patches p
    JOIN users u ON p.user_id = u.id
    WHERE p.modules_used LIKE ? AND p.status = 'approved' AND p.is_public = 1
    ORDER BY p.created_at DESC
    LIMIT 10
  `).all(`%${moduleId}%`);

  ctx.body = {
    module,
    wiki: wiki || null,
    parameters,
    tips,
    recommendedPatches,
    patches
  };
};

exports.getModuleParameters = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const parameters = db.prepare(`
    SELECT * FROM module_parameters 
    WHERE module_id = ? 
    ORDER BY sort_order ASC, id ASC
  `).all(moduleId);
  ctx.body = parameters;
};

exports.getBatchModuleParameters = async (ctx) => {
  const { module_ids } = ctx.query;

  if (!module_ids) {
    ctx.body = { parameters: {} };
    return;
  }

  const idList = String(module_ids).split(',')
    .map(i => parseInt(i.trim()))
    .filter(i => !isNaN(i));

  if (idList.length === 0) {
    ctx.body = { parameters: {} };
    return;
  }

  const placeholders = idList.map(() => '?').join(',');
  const parameters = db.prepare(`
    SELECT * FROM module_parameters 
    WHERE module_id IN (${placeholders})
    ORDER BY module_id, sort_order ASC, id ASC
  `).all(...idList);

  const result = {};
  idList.forEach(mid => { result[mid] = []; });

  parameters.forEach(p => {
    if (result[p.module_id]) {
      result[p.module_id].push(p);
    }
  });

  ctx.body = { parameters: result };
};

exports.getModuleTips = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const tips = db.prepare(`
    SELECT * FROM module_tips 
    WHERE module_id = ? 
    ORDER BY sort_order ASC, id ASC
  `).all(moduleId);
  ctx.body = tips;
};

exports.getRecommendedPatches = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const patches = db.prepare(`
    SELECT mrp.*, p.title, p.description, p.image_url, u.username
    FROM module_recommended_patches mrp
    JOIN patches p ON mrp.patch_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE mrp.module_id = ? AND p.status = 'approved' AND p.is_public = 1
    ORDER BY mrp.sort_order ASC, mrp.id ASC
  `).all(moduleId);
  ctx.body = patches;
};

exports.adminGetWiki = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);

  const wiki = db.prepare('SELECT * FROM module_wiki WHERE module_id = ?').get(moduleId);
  const parameters = db.prepare(`
    SELECT * FROM module_parameters 
    WHERE module_id = ? 
    ORDER BY sort_order ASC, id ASC
  `).all(moduleId);
  const tips = db.prepare(`
    SELECT * FROM module_tips 
    WHERE module_id = ? 
    ORDER BY sort_order ASC, id ASC
  `).all(moduleId);
  const recommendedPatches = db.prepare(`
    SELECT mrp.*, p.title
    FROM module_recommended_patches mrp
    JOIN patches p ON mrp.patch_id = p.id
    WHERE mrp.module_id = ?
    ORDER BY mrp.sort_order ASC, mrp.id ASC
  `).all(moduleId);

  ctx.body = {
    wiki: wiki || null,
    parameters,
    tips,
    recommendedPatches
  };
};

exports.adminSaveWiki = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const { overview, history, design_philosophy, notable_features, use_cases, status } = ctx.request.body;

  const existing = db.prepare('SELECT id FROM module_wiki WHERE module_id = ?').get(moduleId);

  if (existing) {
    db.prepare(`
      UPDATE module_wiki SET
        overview = COALESCE(?, overview),
        history = COALESCE(?, history),
        design_philosophy = COALESCE(?, design_philosophy),
        notable_features = COALESCE(?, notable_features),
        use_cases = COALESCE(?, use_cases),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE module_id = ?
    `).run(overview, history, design_philosophy, notable_features, use_cases, status, moduleId);
  } else {
    db.prepare(`
      INSERT INTO module_wiki (module_id, overview, history, design_philosophy, notable_features, use_cases, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(moduleId, overview || '', history || '', design_philosophy || '', notable_features || '', use_cases || '', status || 'draft');
  }

  ctx.body = { success: true };
};

exports.adminCreateParameter = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const { name, label, type, min_value, max_value, default_value, unit, description, tips, sort_order } = ctx.request.body;

  const stmt = db.prepare(`
    INSERT INTO module_parameters (module_id, name, label, type, min_value, max_value, default_value, unit, description, tips, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    moduleId, name, label || name, type || 'knob',
    min_value !== undefined ? min_value : null,
    max_value !== undefined ? max_value : null,
    default_value || '',
    unit || '',
    description || '',
    tips || '',
    sort_order || 0
  );

  ctx.body = { id: result.lastInsertRowid };
};

exports.adminUpdateParameter = async (ctx) => {
  const id = parseInt(ctx.params.paramId);
  const { name, label, type, min_value, max_value, default_value, unit, description, tips, sort_order } = ctx.request.body;

  db.prepare(`
    UPDATE module_parameters SET
      name = COALESCE(?, name),
      label = COALESCE(?, label),
      type = COALESCE(?, type),
      min_value = ?,
      max_value = ?,
      default_value = COALESCE(?, default_value),
      unit = COALESCE(?, unit),
      description = COALESCE(?, description),
      tips = COALESCE(?, tips),
      sort_order = COALESCE(?, sort_order),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, label, type, min_value, max_value, default_value, unit, description, tips, sort_order, id);

  ctx.body = { success: true };
};

exports.adminDeleteParameter = async (ctx) => {
  const id = parseInt(ctx.params.paramId);
  db.prepare('DELETE FROM module_parameters WHERE id = ?').run(id);
  ctx.body = { success: true };
};

exports.adminReorderParameters = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const { orders } = ctx.request.body;

  const stmt = db.prepare('UPDATE module_parameters SET sort_order = ? WHERE id = ? AND module_id = ?');
  const updateMany = db.transaction((items) => {
    items.forEach(item => stmt.run(item.sort_order, item.id, moduleId));
  });
  updateMany(orders);

  ctx.body = { success: true };
};

exports.adminCreateTip = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const { title, content, category, difficulty, sort_order } = ctx.request.body;

  const stmt = db.prepare(`
    INSERT INTO module_tips (module_id, title, content, category, difficulty, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    moduleId, title, content || '',
    category || 'general',
    difficulty || 'beginner',
    sort_order || 0
  );

  ctx.body = { id: result.lastInsertRowid };
};

exports.adminUpdateTip = async (ctx) => {
  const id = parseInt(ctx.params.tipId);
  const { title, content, category, difficulty, sort_order } = ctx.request.body;

  db.prepare(`
    UPDATE module_tips SET
      title = COALESCE(?, title),
      content = COALESCE(?, content),
      category = COALESCE(?, category),
      difficulty = COALESCE(?, difficulty),
      sort_order = COALESCE(?, sort_order),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, content, category, difficulty, sort_order, id);

  ctx.body = { success: true };
};

exports.adminDeleteTip = async (ctx) => {
  const id = parseInt(ctx.params.tipId);
  db.prepare('DELETE FROM module_tips WHERE id = ?').run(id);
  ctx.body = { success: true };
};

exports.adminReorderTips = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const { orders } = ctx.request.body;

  const stmt = db.prepare('UPDATE module_tips SET sort_order = ? WHERE id = ? AND module_id = ?');
  const updateMany = db.transaction((items) => {
    items.forEach(item => stmt.run(item.sort_order, item.id, moduleId));
  });
  updateMany(orders);

  ctx.body = { success: true };
};

exports.adminAddRecommendedPatch = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const { patch_id, reason, sort_order } = ctx.request.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO module_recommended_patches (module_id, patch_id, reason, sort_order)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(moduleId, patch_id, reason || '', sort_order || 0);
    ctx.body = { id: result.lastInsertRowid };
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      ctx.status = 400;
      ctx.body = { error: '该 Patch 已在推荐列表中' };
    } else {
      throw err;
    }
  }
};

exports.adminUpdateRecommendedPatch = async (ctx) => {
  const id = parseInt(ctx.params.recId);
  const { reason, sort_order } = ctx.request.body;

  db.prepare(`
    UPDATE module_recommended_patches SET
      reason = COALESCE(?, reason),
      sort_order = COALESCE(?, sort_order)
    WHERE id = ?
  `).run(reason, sort_order, id);

  ctx.body = { success: true };
};

exports.adminRemoveRecommendedPatch = async (ctx) => {
  const id = parseInt(ctx.params.recId);
  db.prepare('DELETE FROM module_recommended_patches WHERE id = ?').run(id);
  ctx.body = { success: true };
};

exports.adminReorderRecommendedPatches = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const { orders } = ctx.request.body;

  const stmt = db.prepare('UPDATE module_recommended_patches SET sort_order = ? WHERE id = ? AND module_id = ?');
  const updateMany = db.transaction((items) => {
    items.forEach(item => stmt.run(item.sort_order, item.id, moduleId));
  });
  updateMany(orders);

  ctx.body = { success: true };
};

exports.adminSearchPatches = async (ctx) => {
  const { keyword, limit = 20 } = ctx.query;

  let patches = [];
  if (keyword) {
    patches = db.prepare(`
      SELECT p.id, p.title, p.status
      FROM patches p
      WHERE p.title LIKE ?
      ORDER BY p.created_at DESC
      LIMIT ?
    `).all(`%${keyword}%`, limit);
  }

  ctx.body = patches;
};
