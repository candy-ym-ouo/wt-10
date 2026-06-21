const db = require('../db');
const bcrypt = require('bcryptjs');
const { createMessage } = require('./messageController');

const typeToCategory = {
  'comment': 'comment',
  'like': 'like',
  'favorite': 'favorite',
  'follow': 'follow',
  'review': 'review',
  'activity': 'activity',
  'system': 'system'
};

const createNotification = (userId, type, fromUserId, patchId, content, options = {}) => {
  try {
    const category = options.category || typeToCategory[type] || 'system';

    const subscription = db.prepare(`
      SELECT enabled FROM notification_subscriptions 
      WHERE user_id = ? AND category = ?
    `).get(userId, category);

    if (subscription && subscription.enabled === 0) {
      return;
    }

    const linkUrl = options.linkUrl || null;
    const extraData = options.extraData ? JSON.stringify(options.extraData) : null;

    db.prepare(`
      INSERT INTO notifications (user_id, type, category, from_user_id, patch_id, content, link_url, extra_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, type, category, fromUserId, patchId, content, linkUrl, extraData);
  } catch (e) {
    console.error('创建通知失败:', e);
  }
};

exports.getStats = async (ctx) => {
  const stats = {
    users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    patches: db.prepare('SELECT COUNT(*) as count FROM patches WHERE deleted_at IS NULL').get().count,
    modules: db.prepare('SELECT COUNT(*) as count FROM modules').get().count,
    manufacturers: db.prepare('SELECT COUNT(*) as count FROM manufacturers').get().count,
    likes: db.prepare('SELECT COUNT(*) as count FROM likes').get().count,
    comments: db.prepare('SELECT COUNT(*) as count FROM comments').get().count,
    total_views: db.prepare('SELECT COALESCE(SUM(views_count), 0) as total FROM patches WHERE deleted_at IS NULL').get().total,
    new_users_today: db.prepare("SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE('now')").get().count,
    new_patches_today: db.prepare("SELECT COUNT(*) as count FROM patches WHERE DATE(created_at) = DATE('now') AND deleted_at IS NULL").get().count
  };

  const recentPatches = db.prepare(`
    SELECT p.*, u.username
    FROM patches p
    JOIN users u ON p.user_id = u.id
    WHERE p.deleted_at IS NULL
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
  const { page = 1, limit = 20, search, keyword, user_id, status } = ctx.query;
  const offset = (page - 1) * limit;

  const searchQuery = search || keyword;

  let where = ['p.deleted_at IS NULL'];
  let params = [];

  if (searchQuery) {
    where.push('(p.title LIKE ? OR p.description LIKE ? OR u.username LIKE ?)');
    params.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
  }
  if (user_id) {
    where.push('p.user_id = ?');
    params.push(parseInt(user_id));
  }
  if (status) {
    where.push('p.status = ?');
    params.push(status);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const patches = db.prepare(`
    SELECT p.*, u.username, u.avatar, u.is_creator_verified
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
  const patch = db.prepare('SELECT * FROM patches WHERE id = ? AND deleted_at IS NULL').get(patchId);

  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  db.prepare('UPDATE patches SET deleted_at = CURRENT_TIMESTAMP, is_public = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(patchId);
  ctx.body = { success: true, message: '已移入回收站' };
};

exports.adminRestorePatch = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const patch = db.prepare('SELECT * FROM patches WHERE id = ? AND deleted_at IS NOT NULL').get(patchId);

  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: '回收站中不存在此 Patch' };
    return;
  }

  const restoreIsPublic = ['approved', 'pending', 'scheduled'].includes(patch.status) ? 1 : 0;
  db.prepare('UPDATE patches SET deleted_at = NULL, is_public = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(restoreIsPublic, patchId);
  ctx.body = { success: true, message: '已恢复' };
};

exports.getTrashPatches = async (ctx) => {
  const { page = 1, limit = 20, search, keyword, user_id, status } = ctx.query;
  const offset = (page - 1) * limit;

  const searchQuery = search || keyword;

  let where = ['p.deleted_at IS NOT NULL'];
  let params = [];

  if (searchQuery) {
    where.push('(p.title LIKE ? OR p.description LIKE ? OR u.username LIKE ?)');
    params.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
  }
  if (user_id) {
    where.push('p.user_id = ?');
    params.push(parseInt(user_id));
  }
  if (status) {
    where.push('p.status = ?');
    params.push(status);
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  const patches = db.prepare(`
    SELECT p.*, u.username, u.avatar, u.is_creator_verified
    FROM patches p
    JOIN users u ON p.user_id = u.id
    ${whereSql}
    ORDER BY p.deleted_at DESC
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

exports.permanentDeletePatch = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const patch = db.prepare('SELECT * FROM patches WHERE id = ? AND deleted_at IS NOT NULL').get(patchId);

  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: '回收站中不存在此 Patch，仅可永久删除已在回收站中的 Patch' };
    return;
  }

  db.prepare('DELETE FROM patches WHERE id = ?').run(patchId);
  ctx.body = { success: true, message: '已永久删除' };
};

exports.getAllModules = async (ctx) => {
  const { 
    page = 1, 
    limit = 20, 
    keyword,
    type, 
    manufacturer_id, 
    hp_min,
    hp_max,
    hp,
    power,
    status
  } = ctx.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (keyword) {
    where.push('(mod.name LIKE ? OR m.name LIKE ? OR mod.description LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (type) {
    if (type.includes(',')) {
      const types = type.split(',').filter(t => t.trim());
      const placeholders = types.map(() => '?').join(',');
      where.push(`mod.type IN (${placeholders})`);
      params.push(...types);
    } else {
      where.push('mod.type = ?');
      params.push(type);
    }
  }
  if (manufacturer_id) {
    if (String(manufacturer_id).includes(',')) {
      const manuIds = String(manufacturer_id).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (manuIds.length) {
        const placeholders = manuIds.map(() => '?').join(',');
        where.push(`mod.manufacturer_id IN (${placeholders})`);
        params.push(...manuIds);
      }
    } else {
      where.push('mod.manufacturer_id = ?');
      params.push(manufacturer_id);
    }
  }
  if (hp !== undefined && hp !== '') {
    where.push('mod.hp = ?');
    params.push(parseInt(hp));
  }
  if (hp_min !== undefined && hp_min !== '') {
    where.push('mod.hp >= ?');
    params.push(parseInt(hp_min));
  }
  if (hp_max !== undefined && hp_max !== '') {
    where.push('mod.hp <= ?');
    params.push(parseInt(hp_max));
  }
  if (power) {
    where.push('mod.power LIKE ?');
    params.push(`%${power}%`);
  }
  if (status) {
    where.push('mod.status = ?');
    params.push(status);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const modules = db.prepare(`
    SELECT mod.*, m.name as manufacturer_name
    FROM modules mod
    LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id
    ${whereSql}
    ORDER BY mod.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  modules.forEach(mod => {
    try {
      mod.combination_count = db.prepare('SELECT COUNT(*) as count FROM module_combination_stats WHERE module_id = ?').get(mod.id).count;
    } catch (e) {
      mod.combination_count = 0;
    }
  });

  const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM modules mod LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id ${whereSql}`);
  const total = totalStmt.get(...params);

  const moduleTypes = db.prepare('SELECT DISTINCT type FROM modules ORDER BY type').all().map(r => r.type);
  const hpValues = db.prepare('SELECT DISTINCT hp FROM modules WHERE hp IS NOT NULL ORDER BY hp').all().map(r => r.hp);
  const powerValues = db.prepare("SELECT DISTINCT power FROM modules WHERE power IS NOT NULL AND power != '' ORDER BY power").all().map(r => r.power);

  ctx.body = {
    list: modules,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit),
    types: moduleTypes,
    hp_values: hpValues,
    power_values: powerValues
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
    WHERE p.deleted_at IS NULL
    ORDER BY p.created_at DESC
    LIMIT 10
  `).all();
  ctx.body = patches;
};

exports.updatePatchStatus = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const { status, scheduled_at, review_note } = ctx.request.body;
  const adminId = ctx.state.user.id;

  const validStatuses = ['draft', 'pending', 'approved', 'rejected', 'scheduled', 'needs_revision'];
  if (!validStatuses.includes(status)) {
    ctx.status = 400;
    ctx.body = { error: '无效的状态值' };
    return;
  }

  const patch = db.prepare('SELECT user_id, title, status as old_status FROM patches WHERE id = ? AND deleted_at IS NULL').get(patchId);
  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  let scheduledAt = scheduled_at || null;
  if (status !== 'scheduled') {
    scheduledAt = null;
  }
  if (status === 'scheduled' && !scheduledAt && !patch.scheduled_at) {
    ctx.status = 400;
    ctx.body = { error: '定时发布需要指定发布时间' };
    return;
  }

  let isPublic = undefined;
  if (status === 'draft' || status === 'needs_revision') {
    isPublic = 0;
  } else if (status === 'scheduled' || status === 'pending' || status === 'approved') {
    isPublic = 1;
  }

  const updateFields = ['status = ?', 'scheduled_at = ?'];
  const updateParams = [status, scheduledAt];
  
  if (isPublic !== undefined) {
    updateFields.push('is_public = ?');
    updateParams.push(isPublic);
  }
  
  if (review_note !== undefined) {
    updateFields.push('review_note = ?');
    updateParams.push(review_note);
  }
  
  updateFields.push('updated_at = CURRENT_TIMESTAMP');
  updateParams.push(patchId);

  db.prepare(`UPDATE patches SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateParams);

  const statusLabels = {
    draft: '草稿',
    pending: '待审核',
    approved: '审核通过',
    rejected: '审核未通过',
    scheduled: '定时发布',
    needs_revision: '待修改'
  };

  if (status === 'approved' && patch.old_status !== 'approved') {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(patch.user_id);
    const followers = db.prepare(`
      SELECT follower_id FROM follows WHERE following_id = ?
    `).all(patch.user_id);
    
    followers.forEach(follower => {
      createNotification(
        follower.follower_id,
        'new_patch',
        patch.user_id,
        patchId,
        `${user.username} 发布了新 Patch：${patch.title}`,
        { linkUrl: `/patches/${patchId}` }
      );
    });
  }

  if (patch.user_id !== adminId) {
    let notificationContent = `你的 Patch "${patch.title}" 状态已变更为：${statusLabels[status] || status}`;
    if (review_note && review_note.trim()) {
      notificationContent += `\n审核备注：${review_note}`;
    }
    
    createNotification(
      patch.user_id,
      'review',
      adminId,
      patchId,
      notificationContent,
      {
        category: 'review',
        linkUrl: `/patches/${patchId}`,
        extraData: {
          review_status: status,
          review_note: review_note || null
        }
      }
    );
    createMessage(patch.user_id, 'review', 'review', {
      fromUserId: adminId,
      targetType: 'patch',
      targetId: patchId,
      title: `Patch 审核结果`,
      content: notificationContent,
      linkUrl: `/patches/${patchId}`,
      extraData: {
        review_status: status,
        review_note: review_note || null
      }
    });
  }

  ctx.body = { success: true, status, scheduled_at: scheduledAt, review_note: review_note || null };
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
