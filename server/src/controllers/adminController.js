const db = require('../db');
const bcrypt = require('bcryptjs');

exports.getStats = async (ctx) => {
  const stats = {
    users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    patches: db.prepare('SELECT COUNT(*) as count FROM patches').get().count,
    modules: db.prepare('SELECT COUNT(*) as count FROM modules').get().count,
    manufacturers: db.prepare('SELECT COUNT(*) as count FROM manufacturers').get().count,
    likes: db.prepare('SELECT COUNT(*) as count FROM likes').get().count,
    comments: db.prepare('SELECT COUNT(*) as count FROM comments').get().count,
    total_views: db.prepare('SELECT COALESCE(SUM(views_count), 0) as total FROM patches').get().total,
    new_users_today: db.prepare("SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE('now')").get().count,
    new_patches_today: db.prepare("SELECT COUNT(*) as count FROM patches WHERE DATE(created_at) = DATE('now')").get().count
  };

  const recentPatches = db.prepare(`
    SELECT p.*, u.username
    FROM patches p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
    LIMIT 5
  `).all();

  const recentUsers = db.prepare(`
    SELECT id, username, email, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 5
  `).all();

  ctx.body = { stats, recentPatches, recentUsers };
};

exports.getUsers = async (ctx) => {
  const { page = 1, limit = 20, search, role } = ctx.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (search) {
    where.push('(username LIKE ? OR email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role) {
    where.push('role = ?');
    params.push(role);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const users = db.prepare(`
    SELECT id, username, email, avatar, role, bio, created_at, updated_at
    FROM users
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM users ${whereSql}`).get(...params);

  ctx.body = {
    list: users,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.updateUser = async (ctx) => {
  const userId = parseInt(ctx.params.id);
  const { username, email, role, bio, password } = ctx.request.body;

  let updates = [];
  let params = [];

  if (username) { updates.push('username = ?'); params.push(username); }
  if (email) { updates.push('email = ?'); params.push(email); }
  if (role) { updates.push('role = ?'); params.push(role); }
  if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
  if (password) {
    updates.push('password = ?');
    params.push(bcrypt.hashSync(password, 10));
  }
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(userId);

  const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  const user = db.prepare('SELECT id, username, email, role, bio FROM users WHERE id = ?').get(userId);
  ctx.body = user;
};

exports.deleteUser = async (ctx) => {
  const userId = parseInt(ctx.params.id);

  if (userId === ctx.state.user.id) {
    ctx.status = 400;
    ctx.body = { error: '不能删除自己' };
    return;
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  ctx.body = { success: true };
};

exports.getAllPatches = async (ctx) => {
  const { page = 1, limit = 20, search, user_id } = ctx.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (search) {
    where.push('(p.title LIKE ? OR p.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (user_id) {
    where.push('p.user_id = ?');
    params.push(parseInt(user_id));
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const patches = db.prepare(`
    SELECT p.*, u.username
    FROM patches p
    JOIN users u ON p.user_id = u.id
    ${whereSql}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM patches p ${whereSql}`).get(...params);

  ctx.body = {
    list: patches,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.togglePatchPublic = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const { is_public } = ctx.request.body;

  db.prepare('UPDATE patches SET is_public = ? WHERE id = ?').run(is_public ? 1 : 0, patchId);
  ctx.body = { success: true, is_public: is_public ? 1 : 0 };
};

exports.adminDeletePatch = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  db.prepare('DELETE FROM patches WHERE id = ?').run(patchId);
  ctx.body = { success: true };
};

exports.getAllModules = async (ctx) => {
  const { page = 1, limit = 20 } = ctx.query;
  const offset = (page - 1) * limit;

  const modules = db.prepare(`
    SELECT mod.*, m.name as manufacturer_name
    FROM modules mod
    LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id
    ORDER BY mod.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM modules').get();

  ctx.body = {
    list: modules,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getAllManufacturers = async (ctx) => {
  const manufacturers = db.prepare('SELECT * FROM manufacturers ORDER BY name').all();
  ctx.body = manufacturers;
};

exports.updateManufacturer = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const { name, website, description } = ctx.request.body;

  const stmt = db.prepare(`
    UPDATE manufacturers SET
      name = COALESCE(?, name),
      website = COALESCE(?, website),
      description = COALESCE(?, description)
    WHERE id = ?
  `);
  stmt.run(name, website, description, id);

  ctx.body = db.prepare('SELECT * FROM manufacturers WHERE id = ?').get(id);
};

exports.deleteManufacturer = async (ctx) => {
  const id = parseInt(ctx.params.id);
  db.prepare('DELETE FROM manufacturers WHERE id = ?').run(id);
  ctx.body = { success: true };
};

exports.getRecentUsers = async (ctx) => {
  const users = db.prepare(`
    SELECT id, username, email, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 10
  `).all();
  ctx.body = users;
};

exports.getRecentPatches = async (ctx) => {
  const patches = db.prepare(`
    SELECT p.*, u.username as author_name
    FROM patches p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
    LIMIT 10
  `).all();
  ctx.body = patches;
};

exports.updatePatchStatus = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const { status } = ctx.request.body;

  const validStatuses = ['pending', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    ctx.status = 400;
    ctx.body = { error: '无效的状态值' };
    return;
  }

  db.prepare('UPDATE patches SET status = ? WHERE id = ?').run(status, patchId);
  ctx.body = { success: true, status };
};

exports.createModule = async (ctx) => {
  const { name, manufacturer_id, type, hp, description, specs, status } = ctx.request.body;

  if (!name || !manufacturer_id || !type || !hp) {
    ctx.status = 400;
    ctx.body = { error: '缺少必填字段' };
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO modules (name, manufacturer_id, type, hp, description, specs, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    name,
    manufacturer_id,
    type,
    hp,
    description || '',
    specs || '',
    status || 'active'
  );

  ctx.body = { id: result.lastInsertRowid, success: true };
};

exports.updateModule = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const { name, manufacturer_id, type, hp, description, specs, status } = ctx.request.body;

  let updates = [];
  let params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (manufacturer_id !== undefined) { updates.push('manufacturer_id = ?'); params.push(manufacturer_id); }
  if (type !== undefined) { updates.push('type = ?'); params.push(type); }
  if (hp !== undefined) { updates.push('hp = ?'); params.push(hp); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (specs !== undefined) { updates.push('specs = ?'); params.push(specs); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
  }
  params.push(id);

  const stmt = db.prepare(`UPDATE modules SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  ctx.body = { success: true };
};

exports.createManufacturer = async (ctx) => {
  const { name, country, website, description } = ctx.request.body;

  if (!name) {
    ctx.status = 400;
    ctx.body = { error: '缺少必填字段' };
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO manufacturers (name, country, website, description)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(name, country || '', website || '', description || '');

  ctx.body = { id: result.lastInsertRowid, success: true };
};
