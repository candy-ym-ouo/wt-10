const db = require('../db');

exports.toggleLike = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  const existing = db.prepare('SELECT * FROM likes WHERE user_id = ? AND patch_id = ?').get(userId, patchId);

  if (existing) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
    db.prepare('UPDATE patches SET likes_count = likes_count - 1 WHERE id = ?').run(patchId);
    ctx.body = { liked: false, likes_count: Math.max(0, db.prepare('SELECT likes_count FROM patches WHERE id = ?').get(patchId).likes_count) };
  } else {
    db.prepare('INSERT INTO likes (user_id, patch_id) VALUES (?, ?)').run(userId, patchId);
    db.prepare('UPDATE patches SET likes_count = likes_count + 1 WHERE id = ?').run(patchId);
    ctx.body = { liked: true, likes_count: db.prepare('SELECT likes_count FROM patches WHERE id = ?').get(patchId).likes_count };
  }
};

exports.toggleFavorite = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;
  const { folder = 'default' } = ctx.request.body;

  const existing = db.prepare('SELECT * FROM favorites WHERE user_id = ? AND patch_id = ?').get(userId, patchId);

  if (existing) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
    ctx.body = { favorited: false };
  } else {
    db.prepare('INSERT INTO favorites (user_id, patch_id, folder) VALUES (?, ?, ?)').run(userId, patchId, folder);
    ctx.body = { favorited: true };
  }
};

exports.getMyFavorites = async (ctx) => {
  const { page = 1, limit = 12, folder } = ctx.query;
  const offset = (page - 1) * limit;
  const userId = ctx.state.user.id;

  let where = 'f.user_id = ?';
  let params = [userId];

  if (folder) {
    where += ' AND f.folder = ?';
    params.push(folder);
  }

  const favorites = db.prepare(`
    SELECT p.*, u.username, u.avatar, f.folder, f.created_at as favorited_at,
           COUNT(l.id) as real_likes
    FROM favorites f
    JOIN patches p ON f.patch_id = p.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN likes l ON p.id = l.patch_id
    WHERE ${where}
    GROUP BY p.id
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM favorites f WHERE ${where}`).get(...params);

  const folders = db.prepare(`
    SELECT DISTINCT folder, COUNT(*) as count
    FROM favorites
    WHERE user_id = ?
    GROUP BY folder
    ORDER BY folder
  `).all(userId);

  ctx.body = {
    list: favorites,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit),
    folders
  };
};

exports.getMyPatches = async (ctx) => {
  const { page = 1, limit = 12 } = ctx.query;
  const offset = (page - 1) * limit;
  const userId = ctx.state.user.id;

  const patches = db.prepare(`
    SELECT p.*, COUNT(l.id) as real_likes
    FROM patches p
    LEFT JOIN likes l ON p.id = l.patch_id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM patches WHERE user_id = ?').get(userId);

  ctx.body = {
    list: patches,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getCompareList = async (ctx) => {
  const userId = ctx.state.user.id;

  let compareList = db.prepare('SELECT * FROM compare_lists WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);

  if (!compareList) {
    const stmt = db.prepare('INSERT INTO compare_lists (user_id, name, patch_ids) VALUES (?, ?, ?)');
    const result = stmt.run(userId, '我的对比列表', JSON.stringify([]));
    compareList = db.prepare('SELECT * FROM compare_lists WHERE id = ?').get(result.lastInsertRowid);
  }

  const patchIds = JSON.parse(compareList.patch_ids || '[]');
  let patches = [];

  if (patchIds.length > 0) {
    const placeholders = patchIds.map(() => '?').join(',');
    patches = db.prepare(`
      SELECT p.*, u.username, u.avatar
      FROM patches p
      JOIN users u ON p.user_id = u.id
      WHERE p.id IN (${placeholders})
    `).all(...patchIds);
  }

  ctx.body = {
    ...compareList,
    patch_ids: patchIds,
    patches
  };
};

exports.addToCompare = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;
  let updatedIds = [patchId];

  let compareList = db.prepare('SELECT * FROM compare_lists WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);

  if (!compareList) {
    const stmt = db.prepare('INSERT INTO compare_lists (user_id, name, patch_ids) VALUES (?, ?, ?)');
    const result = stmt.run(userId, '我的对比列表', JSON.stringify([patchId]));
    compareList = db.prepare('SELECT * FROM compare_lists WHERE id = ?').get(result.lastInsertRowid);
  } else {
    const patchIds = JSON.parse(compareList.patch_ids || '[]');
    if (!patchIds.includes(patchId)) {
      if (patchIds.length >= 5) {
        ctx.status = 400;
        ctx.body = { error: '最多只能对比 5 个 Patch' };
        return;
      }
      patchIds.push(patchId);
    }
    updatedIds = patchIds;
    db.prepare('UPDATE compare_lists SET patch_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(JSON.stringify(patchIds), compareList.id);
  }

  ctx.body = { patch_ids: updatedIds, count: updatedIds.length };
};

exports.removeFromCompare = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  const compareList = db.prepare('SELECT * FROM compare_lists WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);

  if (compareList) {
    const patchIds = JSON.parse(compareList.patch_ids || '[]').filter(id => id !== patchId);
    db.prepare('UPDATE compare_lists SET patch_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(JSON.stringify(patchIds), compareList.id);
    ctx.body = { patch_ids: patchIds, count: patchIds.length };
  } else {
    ctx.body = { patch_ids: [], count: 0 };
  }
};

exports.clearCompare = async (ctx) => {
  const userId = ctx.state.user.id;
  db.prepare('UPDATE compare_lists SET patch_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(JSON.stringify([]), userId);
  ctx.body = { patch_ids: [], count: 0 };
};

exports.comparePatches = async (ctx) => {
  const { ids } = ctx.query;
  const patchIds = ids ? ids.split(',').map(Number) : [];

  if (patchIds.length < 2) {
    ctx.status = 400;
    ctx.body = { error: '至少需要 2 个 Patch 进行对比' };
    return;
  }

  if (patchIds.length > 5) {
    ctx.status = 400;
    ctx.body = { error: '最多只能对比 5 个 Patch' };
    return;
  }

  const placeholders = patchIds.map(() => '?').join(',');
  const patches = db.prepare(`
    SELECT p.*, u.username, u.avatar
    FROM patches p
    JOIN users u ON p.user_id = u.id
    WHERE p.id IN (${placeholders})
  `).all(...patchIds);

  const paramKeys = ['oscillators', 'filter', 'envelope', 'lfo', 'effects'];
  const comparison = {};

  paramKeys.forEach(key => {
    comparison[key] = patches.map(patch => {
      const params = JSON.parse(patch.parameters || '{}');
      return {
        patch_id: patch.id,
        title: patch.title,
        value: params[key] || null
      };
    });
  });

  ctx.body = {
    patches,
    comparison,
    module_usage: patches.map(p => ({
      patch_id: p.id,
      title: p.title,
      modules: JSON.parse(p.modules_used || '[]')
    }))
  };
};
