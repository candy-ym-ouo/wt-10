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

exports.getCreatorStats = async (ctx) => {
  const userId = ctx.state.user.id;

  const patchesStats = db.prepare(`
    SELECT 
      COUNT(*) as total_patches,
      COALESCE(SUM(CASE WHEN is_public = 1 THEN 1 ELSE 0 END), 0) as published_patches,
      COALESCE(SUM(CASE WHEN is_public = 0 THEN 1 ELSE 0 END), 0) as draft_count,
      COALESCE(SUM(views_count), 0) as total_views
    FROM patches 
    WHERE user_id = ?
  `).get(userId);

  const likesStats = db.prepare(`
    SELECT COALESCE(SUM(likes_count), 0) as total_likes
    FROM patches 
    WHERE user_id = ?
  `).get(userId);

  const favoritesStats = db.prepare(`
    SELECT COUNT(*) as total_favorites
    FROM favorites 
    WHERE user_id = ?
  `).get(userId);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as unread_count
    FROM notifications 
    WHERE user_id = ? AND read = 0
  `).get(userId);

  ctx.body = {
    totalPatches: patchesStats.total_patches || 0,
    publishedPatches: patchesStats.published_patches || 0,
    totalDrafts: patchesStats.draft_count || 0,
    totalViews: patchesStats.total_views || 0,
    totalLikes: likesStats.total_likes || 0,
    totalFavorites: favoritesStats.total_favorites || 0,
    unreadNotifications: unreadCount.unread_count || 0
  };
};

exports.getMyDrafts = async (ctx) => {
  const { page = 1, limit = 12 } = ctx.query;
  const offset = (page - 1) * limit;
  const userId = ctx.state.user.id;

  const drafts = db.prepare(`
    SELECT p.*, COUNT(l.id) as real_likes
    FROM patches p
    LEFT JOIN likes l ON p.id = l.patch_id
    WHERE p.user_id = ? AND p.is_public = 0
    GROUP BY p.id
    ORDER BY p.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM patches WHERE user_id = ? AND is_public = 0').get(userId);

  ctx.body = {
    list: drafts,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getMyNotifications = async (ctx) => {
  const { page = 1, limit = 20, unread_only } = ctx.query;
  const offset = (page - 1) * limit;
  const userId = ctx.state.user.id;

  let where = 'n.user_id = ?';
  let params = [userId];

  if (unread_only === '1') {
    where += ' AND n.read = 0';
  }

  const notifications = db.prepare(`
    SELECT n.*, u.username, u.avatar, p.title as patch_title
    FROM notifications n
    LEFT JOIN users u ON n.from_user_id = u.id
    LEFT JOIN patches p ON n.patch_id = p.id
    WHERE ${where}
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM notifications n WHERE ${where}`).get(...params);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0
  `).get(userId);

  ctx.body = {
    list: notifications,
    total: total.count,
    unreadCount: unreadCount.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.markNotificationRead = async (ctx) => {
  const notificationId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  const result = db.prepare(`
    UPDATE notifications SET read = 1 
    WHERE id = ? AND user_id = ?
  `).run(notificationId, userId);

  if (result.changes === 0) {
    ctx.status = 404;
    ctx.body = { error: '通知不存在' };
    return;
  }

  ctx.body = { success: true };
};

exports.markAllNotificationsRead = async (ctx) => {
  const userId = ctx.state.user.id;

  db.prepare(`
    UPDATE notifications SET read = 1 
    WHERE user_id = ? AND read = 0
  `).run(userId);

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

const createNotificationForFollowers = (creatorId, type, fromUserId, patchId, content) => {
  try {
    const followers = db.prepare(`
      SELECT follower_id FROM follows WHERE following_id = ?
    `).all(creatorId);
    
    followers.forEach(follower => {
      createNotification(follower.follower_id, type, fromUserId, patchId, content);
    });
  } catch (e) {
    console.error('为粉丝创建通知失败:', e);
  }
};

const updateUserFollowCounts = (userId) => {
  const followerCount = db.prepare(`
    SELECT COUNT(*) as count FROM follows WHERE following_id = ?
  `).get(userId);
  
  const followingCount = db.prepare(`
    SELECT COUNT(*) as count FROM follows WHERE follower_id = ?
  `).get(userId);
  
  db.prepare(`
    UPDATE users SET followers_count = ?, following_count = ? WHERE id = ?
  `).run(followerCount.count, followingCount.count, userId);
};

exports.followUser = async (ctx) => {
  const followingId = parseInt(ctx.params.id);
  const followerId = ctx.state.user.id;

  if (followingId === followerId) {
    ctx.status = 400;
    ctx.body = { error: '不能关注自己' };
    return;
  }

  const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(followingId);
  if (!targetUser) {
    ctx.status = 404;
    ctx.body = { error: '用户不存在' };
    return;
  }

  const existing = db.prepare('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?').get(followerId, followingId);

  if (existing) {
    db.prepare('DELETE FROM follows WHERE id = ?').run(existing.id);
    updateUserFollowCounts(followerId);
    updateUserFollowCounts(followingId);
    ctx.body = { following: false };
  } else {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(followerId, followingId);
    updateUserFollowCounts(followerId);
    updateUserFollowCounts(followingId);
    
    const follower = db.prepare('SELECT username FROM users WHERE id = ?').get(followerId);
    createNotification(
      followingId,
      'follow',
      followerId,
      null,
      `${follower?.username || '用户'} 关注了你`
    );
    
    ctx.body = { following: true };
  }
};

exports.checkFollowStatus = async (ctx) => {
  const userId = parseInt(ctx.params.id);
  const currentUserId = ctx.state.user?.id;

  if (!currentUserId) {
    ctx.body = { following: false };
    return;
  }

  const follow = db.prepare('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?').get(currentUserId, userId);
  ctx.body = { following: !!follow };
};

exports.getFollowers = async (ctx) => {
  const userId = parseInt(ctx.params.id);
  const { page = 1, limit = 20 } = ctx.query;
  const offset = (page - 1) * limit;
  const currentUserId = ctx.state.user?.id;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    ctx.status = 404;
    ctx.body = { error: '用户不存在' };
    return;
  }

  const followers = db.prepare(`
    SELECT u.id, u.username, u.avatar, u.bio, u.followers_count, u.following_count,
           f.created_at as followed_at,
           CASE WHEN f2.id IS NOT NULL THEN 1 ELSE 0 END as is_following_back
    FROM follows f
    JOIN users u ON f.follower_id = u.id
    LEFT JOIN follows f2 ON f2.follower_id = ? AND f2.following_id = u.id
    WHERE f.following_id = ?
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(currentUserId || 0, userId, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(userId);

  ctx.body = {
    list: followers,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getFollowing = async (ctx) => {
  const userId = parseInt(ctx.params.id);
  const { page = 1, limit = 20 } = ctx.query;
  const offset = (page - 1) * limit;
  const currentUserId = ctx.state.user?.id;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    ctx.status = 404;
    ctx.body = { error: '用户不存在' };
    return;
  }

  const following = db.prepare(`
    SELECT u.id, u.username, u.avatar, u.bio, u.followers_count, u.following_count,
           f.created_at as followed_at,
           CASE WHEN f2.id IS NOT NULL THEN 1 ELSE 0 END as is_following_back
    FROM follows f
    JOIN users u ON f.following_id = u.id
    LEFT JOIN follows f2 ON f2.follower_id = ? AND f2.following_id = u.id
    WHERE f.follower_id = ?
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(currentUserId || 0, userId, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(userId);

  ctx.body = {
    list: following,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getFollowingFeed = async (ctx) => {
  const userId = ctx.state.user.id;
  const { page = 1, limit = 12 } = ctx.query;
  const offset = (page - 1) * limit;

  const patches = db.prepare(`
    SELECT p.*, u.username, u.avatar,
           COUNT(l.id) as real_likes,
           CASE WHEN l2.id IS NOT NULL THEN 1 ELSE 0 END as is_liked,
           CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
    FROM follows fol
    JOIN patches p ON fol.following_id = p.user_id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN likes l ON p.id = l.patch_id
    LEFT JOIN likes l2 ON l2.patch_id = p.id AND l2.user_id = ?
    LEFT JOIN favorites f ON f.patch_id = p.id AND f.user_id = ?
    WHERE fol.follower_id = ? AND p.is_public = 1
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, userId, userId, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(DISTINCT p.id) as count
    FROM follows fol
    JOIN patches p ON fol.following_id = p.user_id
    WHERE fol.follower_id = ? AND p.is_public = 1
  `).get(userId);

  ctx.body = {
    list: patches,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getMyFollowers = async (ctx) => {
  const userId = ctx.state.user.id;
  const { page = 1, limit = 20 } = ctx.query;
  const offset = (page - 1) * limit;

  const followers = db.prepare(`
    SELECT u.id, u.username, u.avatar, u.bio, u.followers_count, u.following_count,
           f.created_at as followed_at,
           CASE WHEN f2.id IS NOT NULL THEN 1 ELSE 0 END as is_following_back
    FROM follows f
    JOIN users u ON f.follower_id = u.id
    LEFT JOIN follows f2 ON f2.follower_id = ? AND f2.following_id = u.id
    WHERE f.following_id = ?
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, userId, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(userId);

  ctx.body = {
    list: followers,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getMyFollowing = async (ctx) => {
  const userId = ctx.state.user.id;
  const { page = 1, limit = 20 } = ctx.query;
  const offset = (page - 1) * limit;

  const following = db.prepare(`
    SELECT u.id, u.username, u.avatar, u.bio, u.followers_count, u.following_count,
           f.created_at as followed_at,
           CASE WHEN f2.id IS NOT NULL THEN 1 ELSE 0 END as is_following_back
    FROM follows f
    JOIN users u ON f.following_id = u.id
    LEFT JOIN follows f2 ON f2.follower_id = ? AND f2.following_id = u.id
    WHERE f.follower_id = ?
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, userId, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?').get(userId);

  ctx.body = {
    list: following,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.toggleLike = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  const patch = db.prepare('SELECT user_id, title FROM patches WHERE id = ?').get(patchId);
  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  const existing = db.prepare('SELECT * FROM likes WHERE user_id = ? AND patch_id = ?').get(userId, patchId);

  if (existing) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
    db.prepare('UPDATE patches SET likes_count = likes_count - 1 WHERE id = ?').run(patchId);
    ctx.body = { liked: false, likes_count: Math.max(0, db.prepare('SELECT likes_count FROM patches WHERE id = ?').get(patchId).likes_count) };
  } else {
    db.prepare('INSERT INTO likes (user_id, patch_id) VALUES (?, ?)').run(userId, patchId);
    db.prepare('UPDATE patches SET likes_count = likes_count + 1 WHERE id = ?').run(patchId);
    
    if (patch.user_id !== userId) {
      const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
      createNotification(
        patch.user_id,
        'like',
        userId,
        patchId,
        `${user?.username || '用户'} 赞了你的 Patch "${patch.title}"`
      );
    }
    
    ctx.body = { liked: true, likes_count: db.prepare('SELECT likes_count FROM patches WHERE id = ?').get(patchId).likes_count };
  }
};

exports.toggleFavorite = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;
  const { folder = 'default' } = ctx.request.body;

  const patch = db.prepare('SELECT user_id, title FROM patches WHERE id = ?').get(patchId);
  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  const existing = db.prepare('SELECT * FROM favorites WHERE user_id = ? AND patch_id = ?').get(userId, patchId);

  if (existing) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
    ctx.body = { favorited: false };
  } else {
    db.prepare('INSERT INTO favorites (user_id, patch_id, folder) VALUES (?, ?, ?)').run(userId, patchId, folder);
    
    if (patch.user_id !== userId) {
      const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
      createNotification(
        patch.user_id,
        'favorite',
        userId,
        patchId,
        `${user?.username || '用户'} 收藏了你的 Patch "${patch.title}"`
      );
    }
    
    ctx.body = { favorited: true };
  }
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
