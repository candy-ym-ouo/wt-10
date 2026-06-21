const db = require('../db');

exports.globalSearch = async (ctx) => {
  const { keyword, types, page = 1, limit = 5 } = ctx.query;

  if (!keyword || !keyword.trim()) {
    ctx.status = 400;
    ctx.body = { error: '请输入搜索关键词' };
    return;
  }

  const kw = keyword.trim();
  const likeKw = `%${kw}%`;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const requestedTypes = types ? String(types).split(',').map(t => t.trim()) : ['patch', 'module', 'manufacturer', 'user', 'collection'];
  const validTypes = ['patch', 'module', 'manufacturer', 'user', 'collection'];
  const searchTypes = requestedTypes.filter(t => validTypes.includes(t));

  const results = {};
  let totalResults = 0;

  const searchPatch = searchTypes.includes('patch');
  const searchModule = searchTypes.includes('module');
  const searchManufacturer = searchTypes.includes('manufacturer');
  const searchUser = searchTypes.includes('user');
  const searchCollection = searchTypes.includes('collection');

  if (searchPatch) {
    const patches = db.prepare(`
      SELECT p.id, p.title, p.description, p.image_url, p.tags, p.likes_count, p.views_count, p.favorites_count,
             u.username, u.avatar, u.is_creator_verified
      FROM patches p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.is_public = 1 AND p.status = 'approved' AND p.deleted_at IS NULL
        AND (p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)
      ORDER BY p.likes_count DESC, p.views_count DESC
      LIMIT ? OFFSET ?
    `).all(likeKw, likeKw, likeKw, limitNum, offset);
    const patchCount = db.prepare(`
      SELECT COUNT(*) as count FROM patches
      WHERE is_public = 1 AND status = 'approved' AND deleted_at IS NULL
        AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)
    `).get(likeKw, likeKw, likeKw);
    results.patches = { list: patches, total: patchCount.count };
    totalResults += patchCount.count;
  }

  if (searchModule) {
    const modules = db.prepare(`
      SELECT mod.id, mod.name, mod.type, mod.hp, mod.image, mod.manufacturer_id,
             m.name as manufacturer_name
      FROM modules mod
      LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id
      WHERE mod.status = 'active'
        AND (mod.name LIKE ? OR m.name LIKE ? OR mod.description LIKE ?)
      ORDER BY mod.name
      LIMIT ? OFFSET ?
    `).all(likeKw, likeKw, likeKw, limitNum, offset);
    const moduleCount = db.prepare(`
      SELECT COUNT(*) as count FROM modules mod
      LEFT JOIN manufacturers m ON mod.manufacturer_id = m.id
      WHERE mod.status = 'active'
        AND (mod.name LIKE ? OR m.name LIKE ? OR mod.description LIKE ?)
    `).get(likeKw, likeKw, likeKw);
    results.modules = { list: modules, total: moduleCount.count };
    totalResults += moduleCount.count;
  }

  if (searchManufacturer) {
    const manufacturers = db.prepare(`
      SELECT m.id, m.name, m.logo, m.country, m.description,
             COUNT(mod.id) as modules_count
      FROM manufacturers m
      LEFT JOIN modules mod ON m.id = mod.manufacturer_id
      WHERE m.name LIKE ? OR m.description LIKE ?
      GROUP BY m.id
      ORDER BY modules_count DESC
      LIMIT ? OFFSET ?
    `).all(likeKw, likeKw, limitNum, offset);
    const mfrCount = db.prepare(`
      SELECT COUNT(*) as count FROM manufacturers
      WHERE name LIKE ? OR description LIKE ?
    `).get(likeKw, likeKw);
    results.manufacturers = { list: manufacturers, total: mfrCount.count };
    totalResults += mfrCount.count;
  }

  if (searchUser) {
    const users = db.prepare(`
      SELECT id, username, avatar, bio, is_creator_verified, creator_verified_at
      FROM users
      WHERE role != 'banned'
        AND (username LIKE ? OR bio LIKE ?)
      ORDER BY is_creator_verified DESC, id
      LIMIT ? OFFSET ?
    `).all(likeKw, likeKw, limitNum, offset);
    const userCount = db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE role != 'banned'
        AND (username LIKE ? OR bio LIKE ?)
    `).get(likeKw, likeKw);
    results.users = { list: users, total: userCount.count };
    totalResults += userCount.count;
  }

  if (searchCollection) {
    const collections = db.prepare(`
      SELECT c.id, c.title, c.description, c.cover_url,
             COUNT(cp.id) as patch_count
      FROM collections c
      LEFT JOIN collection_patches cp ON c.id = cp.collection_id
      WHERE c.is_published = 1
        AND (c.title LIKE ? OR c.description LIKE ?)
      GROUP BY c.id
      ORDER BY patch_count DESC
      LIMIT ? OFFSET ?
    `).all(likeKw, likeKw, limitNum, offset);
    const collCount = db.prepare(`
      SELECT COUNT(*) as count FROM collections
      WHERE is_published = 1 AND (title LIKE ? OR description LIKE ?)
    `).get(likeKw, likeKw);
    results.collections = { list: collections, total: collCount.count };
    totalResults += collCount.count;
  }

  try {
    const userId = ctx.state.user?.id || null;
    db.prepare(`
      INSERT INTO search_histories (user_id, keyword) VALUES (?, ?)
    `).run(userId, kw);

    db.prepare(`
      INSERT INTO search_hot_queries (keyword, search_count) VALUES (?, 1)
      ON CONFLICT(keyword) DO UPDATE SET search_count = search_count + 1, updated_at = CURRENT_TIMESTAMP
    `).run(kw);
  } catch (e) {
    console.error('记录搜索历史失败:', e);
  }

  ctx.body = {
    keyword: kw,
    results,
    total: totalResults,
    page: pageNum,
    limit: limitNum
  };
};

exports.getHotQueries = async (ctx) => {
  const { limit = 10 } = ctx.query;

  const queries = db.prepare(`
    SELECT keyword, search_count, is_pinned
    FROM search_hot_queries
    WHERE is_active = 1
    ORDER BY is_pinned DESC, search_count DESC
    LIMIT ?
  `).all(parseInt(limit));

  ctx.body = { list: queries };
};

exports.getSearchAds = async (ctx) => {
  const { position = 'search_top' } = ctx.query;
  const now = new Date().toISOString();

  const ads = db.prepare(`
    SELECT id, title, description, image_url, link_url, link_type, position
    FROM search_ad_placements
    WHERE is_active = 1 AND position = ?
      AND (start_time IS NULL OR start_time <= ?)
      AND (end_time IS NULL OR end_time >= ?)
    ORDER BY sort_order ASC
  `).all(position, now, now);

  ctx.body = { list: ads };
};

exports.getSearchHistory = async (ctx) => {
  const userId = ctx.state.user?.id;
  if (!userId) {
    ctx.body = { list: [] };
    return;
  }

  const { limit = 10 } = ctx.query;
  const histories = db.prepare(`
    SELECT DISTINCT keyword, MAX(created_at) as last_searched
    FROM search_histories
    WHERE user_id = ?
    GROUP BY keyword
    ORDER BY last_searched DESC
    LIMIT ?
  `).all(userId, parseInt(limit));

  ctx.body = { list: histories };
};

exports.clearSearchHistory = async (ctx) => {
  const userId = ctx.state.user?.id;
  if (!userId) {
    ctx.status = 401;
    ctx.body = { error: '请先登录' };
    return;
  }

  db.prepare('DELETE FROM search_histories WHERE user_id = ?').run(userId);
  ctx.body = { message: '搜索历史已清除' };
};

exports.suggestSearch = async (ctx) => {
  const { keyword, limit = 8 } = ctx.query;

  if (!keyword || !keyword.trim()) {
    ctx.body = { suggestions: [] };
    return;
  }

  const likeKw = `${keyword.trim()}%`;
  const suggestions = db.prepare(`
    SELECT DISTINCT keyword
    FROM search_hot_queries
    WHERE is_active = 1 AND keyword LIKE ?
    ORDER BY search_count DESC
    LIMIT ?
  `).all(likeKw, parseInt(limit));

  ctx.body = { suggestions: suggestions.map(s => s.keyword) };
};

exports.adminGetHotQueries = async (ctx) => {
  const { page = 1, limit = 20 } = ctx.query;
  const offset = (page - 1) * limit;

  const queries = db.prepare(`
    SELECT * FROM search_hot_queries
    ORDER BY is_pinned DESC, search_count DESC
    LIMIT ? OFFSET ?
  `).all(parseInt(limit), offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM search_hot_queries').get();

  ctx.body = {
    list: queries,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.adminUpdateHotQuery = async (ctx) => {
  const { id } = ctx.params;
  const { is_pinned, is_active } = ctx.request.body;

  const existing = db.prepare('SELECT id FROM search_hot_queries WHERE id = ?').get(id);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '热搜词不存在' };
    return;
  }

  const updates = [];
  const params = [];

  if (is_pinned !== undefined) {
    updates.push('is_pinned = ?');
    params.push(is_pinned ? 1 : 0);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    db.prepare(`UPDATE search_hot_queries SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  ctx.body = { message: '更新成功' };
};

exports.adminCreateHotQuery = async (ctx) => {
  const { keyword, is_pinned } = ctx.request.body;

  if (!keyword || !keyword.trim()) {
    ctx.status = 400;
    ctx.body = { error: '关键词不能为空' };
    return;
  }

  try {
    db.prepare(`
      INSERT INTO search_hot_queries (keyword, search_count, is_pinned)
      VALUES (?, 0, ?)
      ON CONFLICT(keyword) DO UPDATE SET is_pinned = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
    `).run(keyword.trim(), is_pinned ? 1 : 0, is_pinned ? 1 : 0);
    ctx.body = { message: '创建成功' };
  } catch (e) {
    ctx.status = 500;
    ctx.body = { error: '创建失败' };
  }
};

exports.adminDeleteHotQuery = async (ctx) => {
  const { id } = ctx.params;
  db.prepare('DELETE FROM search_hot_queries WHERE id = ?').run(id);
  ctx.body = { message: '删除成功' };
};

exports.adminGetAdPlacements = async (ctx) => {
  const { page = 1, limit = 20, position } = ctx.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (position) {
    where.push('position = ?');
    params.push(position);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const ads = db.prepare(`
    SELECT * FROM search_ad_placements
    ${whereSql}
    ORDER BY sort_order ASC, created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM search_ad_placements ${whereSql}`).get(...params);

  ctx.body = {
    list: ads,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.adminCreateAdPlacement = async (ctx) => {
  const { title, description, image_url, link_url, link_type, position, sort_order, is_active, start_time, end_time } = ctx.request.body;

  if (!title || !link_url) {
    ctx.status = 400;
    ctx.body = { error: '标题和链接不能为空' };
    return;
  }

  const result = db.prepare(`
    INSERT INTO search_ad_placements (title, description, image_url, link_url, link_type, position, sort_order, is_active, start_time, end_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, description || null, image_url || null, link_url,
    link_type || 'internal', position || 'search_top',
    sort_order || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1,
    start_time || null, end_time || null
  );

  ctx.body = { message: '创建成功', id: result.lastInsertRowid };
};

exports.adminUpdateAdPlacement = async (ctx) => {
  const { id } = ctx.params;
  const { title, description, image_url, link_url, link_type, position, sort_order, is_active, start_time, end_time } = ctx.request.body;

  const existing = db.prepare('SELECT id FROM search_ad_placements WHERE id = ?').get(id);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '运营位不存在' };
    return;
  }

  db.prepare(`
    UPDATE search_ad_placements
    SET title = ?, description = ?, image_url = ?, link_url = ?, link_type = ?,
        position = ?, sort_order = ?, is_active = ?, start_time = ?, end_time = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title, description || null, image_url || null, link_url,
    link_type || 'internal', position || 'search_top',
    sort_order || 0, is_active !== undefined ? (is_active ? 1 : 0) : 1,
    start_time || null, end_time || null, id
  );

  ctx.body = { message: '更新成功' };
};

exports.adminDeleteAdPlacement = async (ctx) => {
  const { id } = ctx.params;
  db.prepare('DELETE FROM search_ad_placements WHERE id = ?').run(id);
  ctx.body = { message: '删除成功' };
};
