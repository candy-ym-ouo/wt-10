const db = require('../db');

exports.getCollections = async (ctx) => {
  const { page = 1, limit = 12 } = ctx.query;
  const offset = (page - 1) * limit;

  const collections = db.prepare(`
    SELECT c.*, COUNT(cp.id) as patch_count
    FROM collections c
    LEFT JOIN collection_patches cp ON c.id = cp.collection_id
    WHERE c.is_published = 1
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM collections WHERE is_published = 1').get();

  ctx.body = {
    list: collections,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getCollectionDetail = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const userId = ctx.state.user?.id || 0;

  const collection = db.prepare(`
    SELECT c.*, COUNT(cp.id) as patch_count
    FROM collections c
    LEFT JOIN collection_patches cp ON c.id = cp.collection_id
    WHERE c.id = ? AND (c.is_published = 1 OR ? = 1)
    GROUP BY c.id
  `).get(id, ctx.state.user?.role === 'admin' ? 1 : 0);

  if (!collection) {
    ctx.status = 404;
    ctx.body = { error: '专题不存在' };
    return;
  }

  const patches = db.prepare(`
    SELECT p.*, u.username, u.avatar,
           cp.sort_order as cp_sort_order, cp.note as cp_note,
           COUNT(l.id) as real_likes,
           EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND patch_id = p.id) as is_liked,
           EXISTS(SELECT 1 FROM favorites WHERE user_id = ? AND patch_id = p.id) as is_favorited
    FROM collection_patches cp
    JOIN patches p ON cp.patch_id = p.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN likes l ON p.id = l.patch_id
    WHERE cp.collection_id = ? AND p.is_public = 1 AND p.deleted_at IS NULL
    GROUP BY p.id
    ORDER BY cp.sort_order ASC, cp.created_at ASC
  `).all(userId, userId, id);

  ctx.body = { ...collection, patches };
};

exports.adminGetCollections = async (ctx) => {
  const { page = 1, limit = 20, search } = ctx.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (search) {
    where.push('(c.title LIKE ? OR c.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const collections = db.prepare(`
    SELECT c.*, COUNT(cp.id) as patch_count
    FROM collections c
    LEFT JOIN collection_patches cp ON c.id = cp.collection_id
    ${whereSql}
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM collections c ${whereSql}`).get(...params);

  ctx.body = {
    list: collections,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.createCollection = async (ctx) => {
  const { title, description, cover_url, is_published } = ctx.request.body;

  if (!title) {
    ctx.status = 400;
    ctx.body = { error: '请填写专题标题' };
    return;
  }

  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM collections').get();

  const stmt = db.prepare(`
    INSERT INTO collections (title, description, cover_url, sort_order, is_published)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    title,
    description || '',
    cover_url || '',
    maxOrder.max_order + 1,
    is_published ? 1 : 0
  );

  ctx.body = { id: result.lastInsertRowid, success: true };
};

exports.updateCollection = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const { title, description, cover_url, is_published, sort_order } = ctx.request.body;

  let updates = [];
  let params = [];

  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (cover_url !== undefined) { updates.push('cover_url = ?'); params.push(cover_url); }
  if (is_published !== undefined) { updates.push('is_published = ?'); params.push(is_published ? 1 : 0); }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
  }
  params.push(id);

  const stmt = db.prepare(`UPDATE collections SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  ctx.body = { success: true };
};

exports.deleteCollection = async (ctx) => {
  const id = parseInt(ctx.params.id);
  db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  ctx.body = { success: true };
};

exports.addPatchToCollection = async (ctx) => {
  const collectionId = parseInt(ctx.params.id);
  const { patch_id, note } = ctx.request.body;

  if (!patch_id) {
    ctx.status = 400;
    ctx.body = { error: '请选择 Patch' };
    return;
  }

  const collection = db.prepare('SELECT id FROM collections WHERE id = ?').get(collectionId);
  if (!collection) {
    ctx.status = 404;
    ctx.body = { error: '专题不存在' };
    return;
  }

  const patch = db.prepare('SELECT id FROM patches WHERE id = ? AND deleted_at IS NULL').get(patch_id);
  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  const existing = db.prepare('SELECT id FROM collection_patches WHERE collection_id = ? AND patch_id = ?').get(collectionId, patch_id);
  if (existing) {
    if (note !== undefined) {
      db.prepare('UPDATE collection_patches SET note = ? WHERE id = ?').run(note || '', existing.id);
    }
    ctx.body = { id: existing.id, success: true, updated: true };
    return;
  }

  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM collection_patches WHERE collection_id = ?').get(collectionId);

  const stmt = db.prepare(`
    INSERT INTO collection_patches (collection_id, patch_id, sort_order, note)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(collectionId, patch_id, maxOrder.max_order + 1, note || '');

  ctx.body = { id: result.lastInsertRowid, success: true };
};

exports.updatePatchNote = async (ctx) => {
  const collectionId = parseInt(ctx.params.id);
  const patchId = parseInt(ctx.params.patchId);
  const { note } = ctx.request.body;

  const existing = db.prepare('SELECT id FROM collection_patches WHERE collection_id = ? AND patch_id = ?').get(collectionId, patchId);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '该 Patch 不在此专题中' };
    return;
  }

  db.prepare('UPDATE collection_patches SET note = ? WHERE id = ?').run(note || '', existing.id);
  ctx.body = { success: true };
};

exports.removePatchFromCollection = async (ctx) => {
  const collectionId = parseInt(ctx.params.id);
  const patchId = parseInt(ctx.params.patchId);

  db.prepare('DELETE FROM collection_patches WHERE collection_id = ? AND patch_id = ?').run(collectionId, patchId);
  ctx.body = { success: true };
};

exports.reorderPatches = async (ctx) => {
  const collectionId = parseInt(ctx.params.id);
  const { orders } = ctx.request.body;

  if (!Array.isArray(orders)) {
    ctx.status = 400;
    ctx.body = { error: '参数格式错误' };
    return;
  }

  const updateStmt = db.prepare('UPDATE collection_patches SET sort_order = ? WHERE collection_id = ? AND patch_id = ?');
  const transaction = db.transaction(() => {
    for (const item of orders) {
      updateStmt.run(item.sort_order, collectionId, item.patch_id);
    }
  });

  transaction();
  ctx.body = { success: true };
};

exports.reorderCollections = async (ctx) => {
  const { orders } = ctx.request.body;

  if (!Array.isArray(orders)) {
    ctx.status = 400;
    ctx.body = { error: '参数格式错误' };
    return;
  }

  const updateStmt = db.prepare('UPDATE collections SET sort_order = ? WHERE id = ?');
  const transaction = db.transaction(() => {
    for (const item of orders) {
      updateStmt.run(item.sort_order, item.id);
    }
  });

  transaction();
  ctx.body = { success: true };
};
