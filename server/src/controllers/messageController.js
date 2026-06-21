const db = require('../db');

const VALID_CATEGORIES = ['comment', 'like', 'favorite', 'review'];

const createMessage = (userId, type, category, options = {}) => {
  try {
    if (!VALID_CATEGORIES.includes(category)) return;

    const fromUserId = options.fromUserId || null;
    const targetType = options.targetType || null;
    const targetId = options.targetId || null;
    const title = options.title || null;
    const content = options.content || '';
    const linkUrl = options.linkUrl || null;
    const extraData = options.extraData ? JSON.stringify(options.extraData) : null;

    db.prepare(`
      INSERT INTO messages (user_id, type, category, from_user_id, target_type, target_id, title, content, link_url, extra_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, type, category, fromUserId, targetType, targetId, title, content, linkUrl, extraData);
  } catch (e) {
    console.error('创建消息失败:', e);
  }
};

exports.getMyMessages = async (ctx) => {
  const { page = 1, limit = 20, category, unread_only } = ctx.query;
  const offset = (page - 1) * limit;
  const userId = ctx.state.user.id;

  let where = 'm.user_id = ?';
  let params = [userId];

  if (unread_only === '1') {
    where += ' AND m.is_read = 0';
  }

  if (category && category !== 'all' && VALID_CATEGORIES.includes(category)) {
    where += ' AND m.category = ?';
    params.push(category);
  }

  const messages = db.prepare(`
    SELECT m.*, u.username as from_username, u.avatar as from_avatar
    FROM messages m
    LEFT JOIN users u ON m.from_user_id = u.id
    WHERE ${where}
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM messages m WHERE ${where}`).get(...params);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND is_read = 0
  `).get(userId);

  const categoryCounts = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM messages
    WHERE user_id = ? AND is_read = 0
    GROUP BY category
  `).all(userId);

  const countsByCategory = {};
  categoryCounts.forEach(c => {
    countsByCategory[c.category] = c.count;
  });

  ctx.body = {
    list: messages,
    total: total.count,
    unreadCount: unreadCount.count,
    countsByCategory,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getUnreadCount = async (ctx) => {
  const userId = ctx.state.user.id;

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND is_read = 0
  `).get(userId);

  const categoryCounts = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM messages
    WHERE user_id = ? AND is_read = 0
    GROUP BY category
  `).all(userId);

  const countsByCategory = {};
  categoryCounts.forEach(c => {
    countsByCategory[c.category] = c.count;
  });

  ctx.body = {
    unreadCount: unreadCount.count,
    countsByCategory
  };
};

exports.markMessageRead = async (ctx) => {
  const messageId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  const msg = db.prepare('SELECT id, category FROM messages WHERE id = ? AND user_id = ?').get(messageId, userId);
  if (!msg) {
    ctx.status = 404;
    ctx.body = { error: '消息不存在' };
    return;
  }

  db.prepare('UPDATE messages SET is_read = 1 WHERE id = ? AND user_id = ?').run(messageId, userId);

  ctx.body = { success: true };
};

exports.markAllMessagesRead = async (ctx) => {
  const userId = ctx.state.user.id;
  const { category } = ctx.request.body || {};

  let sql = 'UPDATE messages SET is_read = 1 WHERE user_id = ? AND is_read = 0';
  let params = [userId];

  if (category && category !== 'all' && VALID_CATEGORIES.includes(category)) {
    sql += ' AND category = ?';
    params.push(category);
  }

  db.prepare(sql).run(...params);

  ctx.body = { success: true };
};

exports.markBatchMessagesRead = async (ctx) => {
  const userId = ctx.state.user.id;
  const { ids } = ctx.request.body || {};

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    ctx.status = 400;
    ctx.body = { error: '请选择要标记的消息' };
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`
    UPDATE messages SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})
  `).run(userId, ...ids);

  ctx.body = { success: true };
};

exports.deleteMessage = async (ctx) => {
  const messageId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  const result = db.prepare('DELETE FROM messages WHERE id = ? AND user_id = ?').run(messageId, userId);

  if (result.changes === 0) {
    ctx.status = 404;
    ctx.body = { error: '消息不存在' };
    return;
  }

  ctx.body = { success: true };
};

exports.deleteBatchMessages = async (ctx) => {
  const userId = ctx.state.user.id;
  const { ids } = ctx.request.body || {};

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    ctx.status = 400;
    ctx.body = { error: '请选择要删除的消息' };
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM messages WHERE user_id = ? AND id IN (${placeholders})`).run(userId, ...ids);

  ctx.body = { success: true };
};

exports.clearReadMessages = async (ctx) => {
  const userId = ctx.state.user.id;
  const { category } = ctx.request.body || {};

  let sql = 'DELETE FROM messages WHERE user_id = ? AND is_read = 1';
  let params = [userId];

  if (category && category !== 'all' && VALID_CATEGORIES.includes(category)) {
    sql += ' AND category = ?';
    params.push(category);
  }

  db.prepare(sql).run(...params);

  ctx.body = { success: true };
};

exports.createMessage = createMessage;
