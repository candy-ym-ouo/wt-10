const db = require('../db');

exports.getManufacturers = async (ctx) => {
  const { page = 1, limit = 50 } = ctx.query;
  const offset = (page - 1) * limit;

  const manufacturers = db.prepare(`
    SELECT m.*, COUNT(mod.id) as modules_count
    FROM manufacturers m
    LEFT JOIN modules mod ON m.id = mod.manufacturer_id
    GROUP BY m.id
    ORDER BY m.name
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM manufacturers').get();

  ctx.body = {
    list: manufacturers,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getModules = async (ctx) => {
  const { page = 1, limit = 20, type, manufacturer_id, search, ids } = ctx.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (ids) {
    const idList = String(ids).split(',').map(i => parseInt(i.trim())).filter(i => !isNaN(i));
    if (idList.length) {
      const placeholders = idList.map(() => '?').join(',');
      where.push(`mod.id IN (${placeholders})`);
      params.push(...idList);
    }
  }
  if (type) {
    where.push('mod.type = ?');
    params.push(type);
  }
  if (manufacturer_id) {
    where.push('mod.manufacturer_id = ?');
    params.push(manufacturer_id);
  }
  if (search) {
    where.push('(mod.name LIKE ? OR m.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const modules = db.prepare(`
    SELECT mod.*, m.name as manufacturer_name
    FROM modules mod
    LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id
    ${whereSql}
    ORDER BY mod.name
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM modules mod LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id ${whereSql}`);
  const total = totalStmt.get(...params);

  const moduleTypes = db.prepare('SELECT DISTINCT type FROM modules ORDER BY type').all().map(r => r.type);

  ctx.body = {
    list: modules,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit),
    types: moduleTypes
  };
};

exports.getModuleDetail = async (ctx) => {
  const id = parseInt(ctx.params.id);

  const module = db.prepare(`
    SELECT mod.*, m.name as manufacturer_name, m.website as manufacturer_website
    FROM modules mod
    LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id
    WHERE mod.id = ?
  `).get(id);

  if (!module) {
    ctx.status = 404;
    ctx.body = { error: '模块不存在' };
    return;
  }

  const patches = db.prepare(`
    SELECT p.*, u.username
    FROM patches p
    JOIN users u ON p.user_id = u.id
    WHERE p.modules_used LIKE ?
    ORDER BY p.created_at DESC
    LIMIT 10
  `).all(`%${id}%`);

  ctx.body = { ...module, patches };
};

exports.createManufacturer = async (ctx) => {
  const { name, country, website, description } = ctx.request.body;

  const stmt = db.prepare('INSERT INTO manufacturers (name, country, website, description) VALUES (?, ?, ?, ?)');
  const result = stmt.run(name, country || '', website || '', description || '');

  ctx.body = { id: result.lastInsertRowid, name, country, website, description };
};

exports.createModule = async (ctx) => {
  const { name, manufacturer_id, type, hp, power, description, specs, status } = ctx.request.body;

  const stmt = db.prepare(`
    INSERT INTO modules (name, manufacturer_id, type, hp, power, description, specs, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, manufacturer_id, type, hp || 0, power || '', description || '', JSON.stringify(specs || {}), status || 'active');

  ctx.body = { id: result.lastInsertRowid };
};

exports.updateModule = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const { name, manufacturer_id, type, hp, power, description, specs, status } = ctx.request.body;

  const stmt = db.prepare(`
    UPDATE modules SET
      name = COALESCE(?, name),
      manufacturer_id = COALESCE(?, manufacturer_id),
      type = COALESCE(?, type),
      hp = COALESCE(?, hp),
      power = COALESCE(?, power),
      description = COALESCE(?, description),
      specs = COALESCE(?, specs),
      status = COALESCE(?, status),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(
    name, manufacturer_id, type, hp, power, description,
    specs ? JSON.stringify(specs) : null, status, id
  );

  ctx.body = { success: true };
};

exports.deleteModule = async (ctx) => {
  const id = parseInt(ctx.params.id);
  db.prepare('DELETE FROM modules WHERE id = ?').run(id);
  ctx.body = { success: true };
};

exports.getParameterTemplates = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const userId = ctx.state.user?.id || 0;

  const module = db.prepare('SELECT id FROM modules WHERE id = ?').get(moduleId);
  if (!module) {
    ctx.status = 404;
    ctx.body = { error: '模块不存在' };
    return;
  }

  const templates = db.prepare(`
    SELECT mpt.*, u.username as creator_name,
      CASE WHEN mpt.created_by IS NULL THEN 1 ELSE 0 END as is_official
    FROM module_parameter_templates mpt
    LEFT JOIN users u ON mpt.created_by = u.id
    WHERE mpt.module_id = ?
      AND (mpt.created_by IS NULL OR mpt.created_by = ?)
    ORDER BY mpt.is_default DESC, mpt.use_count DESC, mpt.created_at DESC
  `).all(moduleId, userId);

  templates.forEach(t => {
    try {
      t.parameter_values = JSON.parse(t.parameter_values);
    } catch (e) {
      t.parameter_values = {};
    }
  });

  ctx.body = {
    list: templates,
    total: templates.length
  };
};

exports.createParameterTemplate = async (ctx) => {
  const moduleId = parseInt(ctx.params.id);
  const userId = ctx.state.user?.id;
  const { name, description, parameter_values, is_default } = ctx.request.body;

  if (!name) {
    ctx.status = 400;
    ctx.body = { error: '请输入模板名称' };
    return;
  }
  if (!parameter_values || typeof parameter_values !== 'object') {
    ctx.status = 400;
    ctx.body = { error: '参数值格式错误' };
    return;
  }

  const module = db.prepare('SELECT id FROM modules WHERE id = ?').get(moduleId);
  if (!module) {
    ctx.status = 404;
    ctx.body = { error: '模块不存在' };
    return;
  }

  if (is_default) {
    db.prepare(`
      UPDATE module_parameter_templates SET is_default = 0, updated_at = CURRENT_TIMESTAMP
      WHERE module_id = ? AND (created_by IS NULL OR created_by = ?)
    `).run(moduleId, userId || 0);
  }

  const stmt = db.prepare(`
    INSERT INTO module_parameter_templates
    (module_id, name, description, parameter_values, is_default, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    moduleId,
    name,
    description || '',
    JSON.stringify(parameter_values),
    is_default ? 1 : 0,
    userId || null
  );

  const template = db.prepare(`
    SELECT mpt.*, u.username as creator_name,
      CASE WHEN mpt.created_by IS NULL THEN 1 ELSE 0 END as is_official
    FROM module_parameter_templates mpt
    LEFT JOIN users u ON mpt.created_by = u.id
    WHERE mpt.id = ?
  `).get(result.lastInsertRowid);
  template.parameter_values = JSON.parse(template.parameter_values);

  ctx.body = {
    id: result.lastInsertRowid,
    ...template
  };
};

exports.updateParameterTemplate = async (ctx) => {
  const templateId = parseInt(ctx.params.templateId);
  const userId = ctx.state.user?.id;
  const isAdmin = ctx.state.user?.role === 'admin';
  const { name, description, parameter_values, is_default } = ctx.request.body;

  const existing = db.prepare('SELECT * FROM module_parameter_templates WHERE id = ?').get(templateId);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '模板不存在' };
    return;
  }

  if (existing.created_by !== null && existing.created_by !== userId && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '无权限修改此模板' };
    return;
  }

  if (existing.created_by === null && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '只有管理员可以修改官方模板' };
    return;
  }

  if (is_default) {
    db.prepare(`
      UPDATE module_parameter_templates SET is_default = 0, updated_at = CURRENT_TIMESTAMP
      WHERE module_id = ? AND id != ? AND (created_by IS NULL OR created_by = ?)
    `).run(existing.module_id, templateId, userId || 0);
  }

  const stmt = db.prepare(`
    UPDATE module_parameter_templates SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      parameter_values = COALESCE(?, parameter_values),
      is_default = COALESCE(?, is_default),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(
    name,
    description,
    parameter_values ? JSON.stringify(parameter_values) : null,
    is_default !== undefined ? (is_default ? 1 : 0) : null,
    templateId
  );

  const template = db.prepare(`
    SELECT mpt.*, u.username as creator_name,
      CASE WHEN mpt.created_by IS NULL THEN 1 ELSE 0 END as is_official
    FROM module_parameter_templates mpt
    LEFT JOIN users u ON mpt.created_by = u.id
    WHERE mpt.id = ?
  `).get(templateId);
  template.parameter_values = JSON.parse(template.parameter_values);

  ctx.body = template;
};

exports.deleteParameterTemplate = async (ctx) => {
  const templateId = parseInt(ctx.params.templateId);
  const userId = ctx.state.user?.id;
  const isAdmin = ctx.state.user?.role === 'admin';

  const existing = db.prepare('SELECT * FROM module_parameter_templates WHERE id = ?').get(templateId);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '模板不存在' };
    return;
  }

  if (existing.created_by !== null && existing.created_by !== userId && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '无权限删除此模板' };
    return;
  }

  if (existing.created_by === null && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '只有管理员可以删除官方模板' };
    return;
  }

  db.prepare('DELETE FROM module_parameter_templates WHERE id = ?').run(templateId);
  ctx.body = { success: true };
};

exports.setDefaultTemplate = async (ctx) => {
  const templateId = parseInt(ctx.params.templateId);
  const userId = ctx.state.user?.id;
  const isAdmin = ctx.state.user?.role === 'admin';

  const existing = db.prepare('SELECT * FROM module_parameter_templates WHERE id = ?').get(templateId);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '模板不存在' };
    return;
  }

  if (existing.created_by !== null && existing.created_by !== userId && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '无权限修改此模板' };
    return;
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE module_parameter_templates SET is_default = 0, updated_at = CURRENT_TIMESTAMP
      WHERE module_id = ? AND (created_by IS NULL OR created_by = ?)
    `).run(existing.module_id, userId || 0);

    db.prepare(`
      UPDATE module_parameter_templates SET is_default = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(templateId);
  });
  tx();

  ctx.body = { success: true };
};

exports.useTemplate = async (ctx) => {
  const templateId = parseInt(ctx.params.templateId);

  const template = db.prepare(`
    SELECT mpt.*, m.name as module_name, m.type as module_type
    FROM module_parameter_templates mpt
    JOIN modules m ON mpt.module_id = m.id
    WHERE mpt.id = ?
  `).get(templateId);

  if (!template) {
    ctx.status = 404;
    ctx.body = { error: '模板不存在' };
    return;
  }

  db.prepare(`
    UPDATE module_parameter_templates SET use_count = use_count + 1
    WHERE id = ?
  `).run(templateId);

  try {
    template.parameter_values = JSON.parse(template.parameter_values);
  } catch (e) {
    template.parameter_values = {};
  }

  ctx.body = {
    id: template.id,
    module_id: template.module_id,
    module_name: template.module_name,
    module_type: template.module_type,
    name: template.name,
    description: template.description,
    parameter_values: template.parameter_values
  };
};

exports.getBatchTemplates = async (ctx) => {
  const { module_ids } = ctx.query;

  if (!module_ids) {
    ctx.body = { templates: {} };
    return;
  }

  const idList = String(module_ids).split(',')
    .map(i => parseInt(i.trim()))
    .filter(i => !isNaN(i));

  if (idList.length === 0) {
    ctx.body = { templates: {} };
    return;
  }

  const placeholders = idList.map(() => '?').join(',');
  const templates = db.prepare(`
    SELECT mpt.*, m.name as module_name, m.type as module_type,
      u.username as creator_name,
      CASE WHEN mpt.created_by IS NULL THEN 1 ELSE 0 END as is_official
    FROM module_parameter_templates mpt
    JOIN modules m ON mpt.module_id = m.id
    LEFT JOIN users u ON mpt.created_by = u.id
    WHERE mpt.module_id IN (${placeholders})
    ORDER BY mpt.module_id, mpt.is_default DESC, mpt.use_count DESC, mpt.created_at DESC
  `).all(...idList);

  const result = {};
  idList.forEach(mid => { result[mid] = []; });

  templates.forEach(t => {
    try {
      t.parameter_values = JSON.parse(t.parameter_values);
    } catch (e) {
      t.parameter_values = {};
    }
    if (result[t.module_id]) {
      result[t.module_id].push(t);
    }
  });

  ctx.body = { templates: result };
};
