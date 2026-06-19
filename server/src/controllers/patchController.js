const db = require('../db');

exports.getPatches = async (ctx) => {
  const { page = 1, limit = 12, search, tag, user_id, sort = 'newest' } = ctx.query;
  const offset = (page - 1) * limit;

  let where = ['p.is_public = 1'];
  let params = [];

  if (search) {
    where.push('(p.title LIKE ? OR p.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (tag) {
    where.push('p.tags LIKE ?');
    params.push(`%${tag}%`);
  }
  if (user_id) {
    where.push('p.user_id = ?');
    params.push(parseInt(user_id));
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  let orderSql = 'ORDER BY p.created_at DESC';
  if (sort === 'popular') orderSql = 'ORDER BY p.likes_count DESC, p.views_count DESC';
  if (sort === 'views') orderSql = 'ORDER BY p.views_count DESC';

  const patches = db.prepare(`
    SELECT p.*, u.username, u.avatar,
           COUNT(l.id) as real_likes,
           EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND patch_id = p.id) as is_liked,
           EXISTS(SELECT 1 FROM favorites WHERE user_id = ? AND patch_id = p.id) as is_favorited
    FROM patches p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN likes l ON p.id = l.patch_id
    ${whereSql}
    GROUP BY p.id
    ${orderSql}
    LIMIT ? OFFSET ?
  `).all(ctx.state.user?.id || 0, ctx.state.user?.id || 0, ...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM patches p ${whereSql}`).get(...params);

  ctx.body = {
    list: patches,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getPatchDetail = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const userId = ctx.state.user?.id || 0;

  db.prepare('UPDATE patches SET views_count = views_count + 1 WHERE id = ?').run(id);

  const patch = db.prepare(`
    SELECT p.*, u.username, u.avatar,
           COUNT(l.id) as real_likes,
           EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND patch_id = p.id) as is_liked,
           EXISTS(SELECT 1 FROM favorites WHERE user_id = ? AND patch_id = p.id) as is_favorited
    FROM patches p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN likes l ON p.id = l.patch_id
    WHERE p.id = ?
    GROUP BY p.id
  `).get(userId, userId, id);

  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.patch_id = ?
    ORDER BY c.created_at DESC
  `).all(id);

  ctx.body = { ...patch, comments };
};

exports.createPatch = async (ctx) => {
  const {
    title, description, modules_used, parameters,
    cables, audio_url, image_url, patch_file, tags, is_public
  } = ctx.request.body;

  if (!title) {
    ctx.status = 400;
    ctx.body = { error: '请填写标题' };
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO patches (title, description, user_id, modules_used, parameters,
                         cables, audio_url, image_url, patch_file, tags, is_public)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    title, description, ctx.state.user.id,
    JSON.stringify(modules_used || []),
    JSON.stringify(parameters || {}),
    JSON.stringify(cables || []),
    audio_url, image_url, patch_file,
    JSON.stringify(tags || []),
    is_public ? 1 : 0
  );

  ctx.body = { id: result.lastInsertRowid };
};

exports.updatePatch = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const patch = db.prepare('SELECT * FROM patches WHERE id = ?').get(id);

  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  if (patch.user_id !== ctx.state.user.id && ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { error: '无权限修改' };
    return;
  }

  const {
    title, description, modules_used, parameters,
    cables, audio_url, image_url, patch_file, tags, is_public
  } = ctx.request.body;

  const stmt = db.prepare(`
    UPDATE patches SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      modules_used = COALESCE(?, modules_used),
      parameters = COALESCE(?, parameters),
      cables = COALESCE(?, cables),
      audio_url = COALESCE(?, audio_url),
      image_url = COALESCE(?, image_url),
      patch_file = COALESCE(?, patch_file),
      tags = COALESCE(?, tags),
      is_public = COALESCE(?, is_public),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(
    title, description,
    modules_used ? JSON.stringify(modules_used) : null,
    parameters ? JSON.stringify(parameters) : null,
    cables ? JSON.stringify(cables) : null,
    audio_url, image_url, patch_file,
    tags ? JSON.stringify(tags) : null,
    is_public !== undefined ? (is_public ? 1 : 0) : null,
    id
  );

  ctx.body = { success: true };
};

exports.deletePatch = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const patch = db.prepare('SELECT * FROM patches WHERE id = ?').get(id);

  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  if (patch.user_id !== ctx.state.user.id && ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { error: '无权限删除' };
    return;
  }

  db.prepare('DELETE FROM patches WHERE id = ?').run(id);
  ctx.body = { success: true };
};

const createNotification = (userId, type, fromUserId, patchId, content) => {
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, type, from_user_id, patch_id, content)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, type, fromUserId, patchId, content);
  } catch (e) {
    console.error('创建通知失败:', e);
  }
};

exports.addComment = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const { content } = ctx.request.body;
  const userId = ctx.state.user.id;

  if (!content) {
    ctx.status = 400;
    ctx.body = { error: '请填写评论内容' };
    return;
  }

  const patch = db.prepare('SELECT user_id, title FROM patches WHERE id = ?').get(id);
  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  const stmt = db.prepare('INSERT INTO comments (user_id, patch_id, content) VALUES (?, ?, ?)');
  const result = stmt.run(userId, id, content);

  if (patch.user_id !== userId) {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
    const truncatedContent = content.length > 30 ? content.substring(0, 30) + '...' : content;
    createNotification(
      patch.user_id,
      'comment',
      userId,
      id,
      `${user?.username || '用户'} 评论了你的 Patch "${patch.title}": "${truncatedContent}"`
    );
  }

  const comment = db.prepare(`
    SELECT c.*, u.username, u.avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  ctx.body = comment;
};

exports.deleteComment = async (ctx) => {
  const commentId = parseInt(ctx.params.commentId);
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);

  if (!comment) {
    ctx.status = 404;
    ctx.body = { error: '评论不存在' };
    return;
  }

  if (comment.user_id !== ctx.state.user.id && ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { error: '无权限删除' };
    return;
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
  ctx.body = { success: true };
};
