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
