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

exports.getMyPatches = async (ctx) => {
  const { page = 1, limit = 12, status } = ctx.query;
  const offset = (page - 1) * limit;
  const userId = ctx.state.user.id;

  let where = 'p.user_id = ?';
  let params = [userId];

  if (status && status !== 'all') {
    where += ' AND p.status = ?';
    params.push(status);
  }

  const patches = db.prepare(`
    SELECT p.*, COUNT(l.id) as real_likes
    FROM patches p
    LEFT JOIN likes l ON p.id = l.patch_id
    WHERE ${where}
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM patches p WHERE ${where}`).get(...params);

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
      COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) as published_patches,
      COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0) as draft_count,
      COALESCE(SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END), 0) as scheduled_count,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count,
      COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected_count,
      COALESCE(SUM(views_count), 0) as total_views
    FROM patches 
    WHERE user_id = ?
  `).get(userId);

  const likesStats = db.prepare(`
    SELECT COALESCE(SUM(likes_count), 0) as total_likes
    FROM patches 
    WHERE user_id = ? AND status = 'approved' AND is_public = 1
  `).get(userId);

  const favoritesStats = db.prepare(`
    SELECT COALESCE(SUM(favorites_count), 0) as total_favorites
    FROM patches 
    WHERE user_id = ? AND status = 'approved' AND is_public = 1
  `).get(userId);

  const myFavoritesStats = db.prepare(`
    SELECT COUNT(*) as my_favorites_count
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
    totalScheduled: patchesStats.scheduled_count || 0,
    totalPending: patchesStats.pending_count || 0,
    totalRejected: patchesStats.rejected_count || 0,
    totalViews: patchesStats.total_views || 0,
    totalLikes: likesStats.total_likes || 0,
    totalFavorites: favoritesStats.total_favorites || 0,
    myFavoritesCount: myFavoritesStats.my_favorites_count || 0,
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
    WHERE p.user_id = ? AND p.status = 'draft'
    GROUP BY p.id
    ORDER BY p.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);

  const total = db.prepare("SELECT COUNT(*) as count FROM patches WHERE user_id = ? AND status = 'draft'").get(userId);

  ctx.body = {
    list: drafts,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getMyScheduled = async (ctx) => {
  const { page = 1, limit = 12 } = ctx.query;
  const offset = (page - 1) * limit;
  const userId = ctx.state.user.id;

  const scheduled = db.prepare(`
    SELECT p.*, COUNT(l.id) as real_likes
    FROM patches p
    LEFT JOIN likes l ON p.id = l.patch_id
    WHERE p.user_id = ? AND p.status = 'scheduled'
    GROUP BY p.id
    ORDER BY p.scheduled_at ASC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);

  const total = db.prepare("SELECT COUNT(*) as count FROM patches WHERE user_id = ? AND status = 'scheduled'").get(userId);

  ctx.body = {
    list: scheduled,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getMyNotifications = async (ctx) => {
  const { page = 1, limit = 20, unread_only, category } = ctx.query;
  const offset = (page - 1) * limit;
  const userId = ctx.state.user.id;

  let where = 'n.user_id = ?';
  let params = [userId];

  if (unread_only === '1') {
    where += ' AND n.read = 0';
  }

  if (category && category !== 'all') {
    where += ' AND n.category = ?';
    params.push(category);
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

  const categoryCounts = db.prepare(`
    SELECT category, COUNT(*) as count 
    FROM notifications 
    WHERE user_id = ? AND read = 0
    GROUP BY category
  `).all(userId);

  const countsByCategory = {};
  categoryCounts.forEach(c => {
    countsByCategory[c.category] = c.count;
  });

  ctx.body = {
    list: notifications,
    total: total.count,
    unreadCount: unreadCount.count,
    countsByCategory,
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
  const { category } = ctx.request.body || {};

  let sql = 'UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0';
  let params = [userId];

  if (category && category !== 'all') {
    sql += ' AND category = ?';
    params.push(category);
  }

  db.prepare(sql).run(...params);

  ctx.body = { success: true };
};

exports.markBatchNotificationsRead = async (ctx) => {
  const userId = ctx.state.user.id;
  const { ids } = ctx.request.body || {};

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    ctx.status = 400;
    ctx.body = { error: '请选择要标记的通知' };
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`
    UPDATE notifications SET read = 1 
    WHERE user_id = ? AND id IN (${placeholders})
  `).run(userId, ...ids);

  ctx.body = { success: true, count: ids.length };
};

exports.deleteNotification = async (ctx) => {
  const notificationId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  const result = db.prepare(`
    DELETE FROM notifications 
    WHERE id = ? AND user_id = ?
  `).run(notificationId, userId);

  if (result.changes === 0) {
    ctx.status = 404;
    ctx.body = { error: '通知不存在' };
    return;
  }

  ctx.body = { success: true };
};

exports.deleteBatchNotifications = async (ctx) => {
  const userId = ctx.state.user.id;
  const { ids } = ctx.request.body || {};

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    ctx.status = 400;
    ctx.body = { error: '请选择要删除的通知' };
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`
    DELETE FROM notifications 
    WHERE user_id = ? AND id IN (${placeholders})
  `).run(userId, ...ids);

  ctx.body = { success: true, count: result.changes };
};

exports.clearReadNotifications = async (ctx) => {
  const userId = ctx.state.user.id;
  const { category } = ctx.request.body || {};

  let sql = 'DELETE FROM notifications WHERE user_id = ? AND read = 1';
  let params = [userId];

  if (category && category !== 'all') {
    sql += ' AND category = ?';
    params.push(category);
  }

  const result = db.prepare(sql).run(...params);

  ctx.body = { success: true, count: result.changes };
};

exports.getNotificationSubscriptions = async (ctx) => {
  const userId = ctx.state.user.id;

  const subscriptions = db.prepare(`
    SELECT category, enabled
    FROM notification_subscriptions
    WHERE user_id = ?
  `).all(userId);

  const defaultCategories = [
    { category: 'comment', label: '评论通知', description: '有人评论或回复你的内容时通知', enabled: 1 },
    { category: 'review', label: '审核通知', description: '内容审核状态变更时通知', enabled: 1 },
    { category: 'follow', label: '关注通知', description: '有人关注你或关注的人发布内容时通知', enabled: 1 },
    { category: 'activity', label: '活动通知', description: '活动相关的通知', enabled: 1 },
    { category: 'like', label: '点赞通知', description: '有人点赞你的内容或评论时通知', enabled: 1 },
    { category: 'favorite', label: '收藏通知', description: '有人收藏你的 Patch 时通知', enabled: 1 },
    { category: 'system', label: '系统通知', description: '系统相关的通知', enabled: 1 }
  ];

  const result = defaultCategories.map(def => {
    const sub = subscriptions.find(s => s.category === def.category);
    return {
      ...def,
      enabled: sub ? sub.enabled : def.enabled
    };
  });

  ctx.body = { subscriptions: result };
};

exports.updateNotificationSubscription = async (ctx) => {
  const userId = ctx.state.user.id;
  const { category, enabled } = ctx.request.body || {};

  if (!category) {
    ctx.status = 400;
    ctx.body = { error: '缺少分类参数' };
    return;
  }

  const enabledVal = enabled ? 1 : 0;

  db.prepare(`
    INSERT INTO notification_subscriptions (user_id, category, enabled, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, category) DO UPDATE SET
      enabled = excluded.enabled,
      updated_at = CURRENT_TIMESTAMP
  `).run(userId, category, enabledVal);

  ctx.body = { success: true, category, enabled: !!enabledVal };
};

exports.updateNotificationSubscriptionsBatch = async (ctx) => {
  const userId = ctx.state.user.id;
  const { subscriptions } = ctx.request.body || {};

  if (!subscriptions || !Array.isArray(subscriptions)) {
    ctx.status = 400;
    ctx.body = { error: '参数格式错误' };
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO notification_subscriptions (user_id, category, enabled, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, category) DO UPDATE SET
      enabled = excluded.enabled,
      updated_at = CURRENT_TIMESTAMP
  `);

  const tx = db.transaction((items) => {
    items.forEach(item => {
      if (item.category) {
        stmt.run(userId, item.category, item.enabled ? 1 : 0);
      }
    });
  });

  tx(subscriptions);

  ctx.body = { success: true, count: subscriptions.length };
};

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

const createNotificationForFollowers = (creatorId, type, fromUserId, patchId, content, options = {}) => {
  try {
    const followers = db.prepare(`
      SELECT follower_id FROM follows WHERE following_id = ?
    `).all(creatorId);
    
    followers.forEach(follower => {
      createNotification(follower.follower_id, type, fromUserId, patchId, content, options);
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

const ensureDefaultFolder = (userId) => {
  const defaultFolder = db.prepare(`
    SELECT * FROM favorite_folders WHERE user_id = ? AND is_default = 1
  `).get(userId);
  
  if (!defaultFolder) {
    const maxOrder = db.prepare(`
      SELECT COALESCE(MAX(sort_order), -1) as max_order
      FROM favorite_folders WHERE user_id = ?
    `).get(userId);
    
    db.prepare(`
      INSERT INTO favorite_folders (user_id, name, sort_order, is_default)
      VALUES (?, 'default', ?, 1)
    `).run(userId, maxOrder.max_order + 1);
    
    return db.prepare(`
      SELECT * FROM favorite_folders WHERE user_id = ? AND is_default = 1
    `).get(userId);
  }
  
  return defaultFolder;
};

exports.getFavoriteFolders = async (ctx) => {
  const userId = ctx.state.user.id;
  
  ensureDefaultFolder(userId);
  
  const folders = db.prepare(`
    SELECT ff.*, 
           COUNT(f.id) as patch_count
    FROM favorite_folders ff
    LEFT JOIN favorites f ON ff.id = f.folder_id
    WHERE ff.user_id = ?
    GROUP BY ff.id
    ORDER BY ff.sort_order ASC, ff.created_at ASC
  `).all(userId);
  
  const totalCount = db.prepare(`
    SELECT COUNT(*) as count FROM favorites WHERE user_id = ?
  `).get(userId);
  
  ctx.body = {
    folders,
    total_count: totalCount.count
  };
};

exports.createFavoriteFolder = async (ctx) => {
  const userId = ctx.state.user.id;
  const { name, description, color } = ctx.request.body;
  
  if (!name || !name.trim()) {
    ctx.status = 400;
    ctx.body = { error: '请输入分组名称' };
    return;
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length > 50) {
    ctx.status = 400;
    ctx.body = { error: '分组名称不能超过50个字符' };
    return;
  }
  
  const existing = db.prepare(`
    SELECT id FROM favorite_folders WHERE user_id = ? AND name = ?
  `).get(userId, trimmedName);
  
  if (existing) {
    ctx.status = 400;
    ctx.body = { error: '该分组名称已存在' };
    return;
  }
  
  const maxOrder = db.prepare(`
    SELECT COALESCE(MAX(sort_order), -1) as max_order
    FROM favorite_folders WHERE user_id = ?
  `).get(userId);
  
  const result = db.prepare(`
    INSERT INTO favorite_folders (user_id, name, description, color, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    userId,
    trimmedName,
    description || '',
    color || '#ffd700',
    maxOrder.max_order + 1
  );
  
  ctx.body = {
    id: result.lastInsertRowid,
    success: true,
    folder: {
      id: result.lastInsertRowid,
      name: trimmedName,
      description: description || '',
      color: color || '#ffd700',
      sort_order: maxOrder.max_order + 1,
      patch_count: 0
    }
  };
};

exports.updateFavoriteFolder = async (ctx) => {
  const folderId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;
  const { name, description, color } = ctx.request.body;
  
  const folder = db.prepare(`
    SELECT * FROM favorite_folders WHERE id = ? AND user_id = ?
  `).get(folderId, userId);
  
  if (!folder) {
    ctx.status = 404;
    ctx.body = { error: '分组不存在' };
    return;
  }
  
  if (folder.is_default && name && name.trim() !== 'default') {
    ctx.status = 400;
    ctx.body = { error: '默认分组名称不能修改' };
    return;
  }
  
  let updates = [];
  let params = [];
  
  if (name !== undefined) {
    const trimmedName = name.trim();
    if (trimmedName.length > 50) {
      ctx.status = 400;
      ctx.body = { error: '分组名称不能超过50个字符' };
      return;
    }
    
    const existing = db.prepare(`
      SELECT id FROM favorite_folders WHERE user_id = ? AND name = ? AND id != ?
    `).get(userId, trimmedName, folderId);
    
    if (existing) {
      ctx.status = 400;
      ctx.body = { error: '该分组名称已存在' };
      return;
    }
    
    updates.push('name = ?');
    params.push(trimmedName);
  }
  
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description || '');
  }
  
  if (color !== undefined) {
    updates.push('color = ?');
    params.push(color || '#ffd700');
  }
  
  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(folderId);
    
    db.prepare(`
      UPDATE favorite_folders SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);
    
    if (name !== undefined && name.trim() !== folder.name) {
      db.prepare(`
        UPDATE favorites SET folder = ? WHERE folder_id = ? AND user_id = ?
      `).run(name.trim(), folderId, userId);
    }
  }
  
  ctx.body = { success: true };
};

exports.deleteFavoriteFolder = async (ctx) => {
  const folderId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;
  const { move_to_folder_id } = ctx.request.body;
  
  const folder = db.prepare(`
    SELECT * FROM favorite_folders WHERE id = ? AND user_id = ?
  `).get(folderId, userId);
  
  if (!folder) {
    ctx.status = 404;
    ctx.body = { error: '分组不存在' };
    return;
  }
  
  if (folder.is_default) {
    ctx.status = 400;
    ctx.body = { error: '默认分组不能删除' };
    return;
  }
  
  let targetFolderId = null;
  if (move_to_folder_id) {
    const targetFolder = db.prepare(`
      SELECT * FROM favorite_folders WHERE id = ? AND user_id = ?
    `).get(parseInt(move_to_folder_id), userId);
    
    if (!targetFolder) {
      ctx.status = 400;
      ctx.body = { error: '目标分组不存在' };
      return;
    }
    targetFolderId = targetFolder.id;
  } else {
    const defaultFolder = ensureDefaultFolder(userId);
    targetFolderId = defaultFolder.id;
  }
  
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE favorites 
      SET folder_id = ?, folder = (SELECT name FROM favorite_folders WHERE id = ?)
      WHERE folder_id = ? AND user_id = ?
    `).run(targetFolderId, targetFolderId, folderId, userId);
    
    db.prepare(`
      DELETE FROM favorite_folders WHERE id = ? AND user_id = ?
    `).run(folderId, userId);
  });
  
  tx();
  
  ctx.body = { success: true, moved_to_folder_id: targetFolderId };
};

exports.reorderFavoriteFolders = async (ctx) => {
  const userId = ctx.state.user.id;
  const { orders } = ctx.request.body;
  
  if (!Array.isArray(orders) || orders.length === 0) {
    ctx.status = 400;
    ctx.body = { error: '参数格式错误' };
    return;
  }
  
  const tx = db.transaction(() => {
    const updateStmt = db.prepare(`
      UPDATE favorite_folders SET sort_order = ? WHERE id = ? AND user_id = ?
    `);
    
    for (const item of orders) {
      updateStmt.run(item.sort_order, parseInt(item.id), userId);
    }
  });
  
  tx();
  
  ctx.body = { success: true };
};

exports.updateFavoriteFolderId = async (ctx) => {
  const favoriteId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;
  const { folder_id } = ctx.request.body;
  
  const favorite = db.prepare(`
    SELECT * FROM favorites WHERE id = ? AND user_id = ?
  `).get(favoriteId, userId);
  
  if (!favorite) {
    ctx.status = 404;
    ctx.body = { error: '收藏不存在' };
    return;
  }
  
  let folderName = 'default';
  let folderIdToSet = null;
  
  if (folder_id) {
    const folder = db.prepare(`
      SELECT * FROM favorite_folders WHERE id = ? AND user_id = ?
    `).get(parseInt(folder_id), userId);
    
    if (!folder) {
      ctx.status = 400;
      ctx.body = { error: '分组不存在' };
      return;
    }
    
    folderName = folder.name;
    folderIdToSet = folder.id;
  } else {
    const defaultFolder = ensureDefaultFolder(userId);
    folderIdToSet = defaultFolder.id;
    folderName = 'default';
  }
  
  db.prepare(`
    UPDATE favorites SET folder_id = ?, folder = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(folderIdToSet, folderName, favoriteId, userId);
  
  ctx.body = { success: true, folder_id: folderIdToSet, folder: folderName };
};

exports.moveFavoriteToFolder = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;
  const { folder_id } = ctx.request.body;
  
  const favorite = db.prepare(`
    SELECT * FROM favorites WHERE patch_id = ? AND user_id = ?
  `).get(patchId, userId);
  
  if (!favorite) {
    ctx.status = 404;
    ctx.body = { error: '未收藏该 Patch' };
    return;
  }
  
  let folderName = 'default';
  let folderIdToSet = null;
  
  if (folder_id) {
    const folder = db.prepare(`
      SELECT * FROM favorite_folders WHERE id = ? AND user_id = ?
    `).get(parseInt(folder_id), userId);
    
    if (!folder) {
      ctx.status = 400;
      ctx.body = { error: '分组不存在' };
      return;
    }
    
    folderName = folder.name;
    folderIdToSet = folder.id;
  } else {
    const defaultFolder = ensureDefaultFolder(userId);
    folderIdToSet = defaultFolder.id;
    folderName = 'default';
  }
  
  db.prepare(`
    UPDATE favorites SET folder_id = ?, folder = ?, updated_at = CURRENT_TIMESTAMP
    WHERE patch_id = ? AND user_id = ?
  `).run(folderIdToSet, folderName, patchId, userId);
  
  ctx.body = { success: true, folder_id: folderIdToSet, folder: folderName };
};

exports.batchMoveFavorites = async (ctx) => {
  const userId = ctx.state.user.id;
  const { patch_ids, folder_id } = ctx.request.body;
  
  if (!Array.isArray(patch_ids) || patch_ids.length === 0) {
    ctx.status = 400;
    ctx.body = { error: '请选择要移动的收藏' };
    return;
  }
  
  let folderName = 'default';
  let folderIdToSet = null;
  
  if (folder_id) {
    const folder = db.prepare(`
      SELECT * FROM favorite_folders WHERE id = ? AND user_id = ?
    `).get(parseInt(folder_id), userId);
    
    if (!folder) {
      ctx.status = 400;
      ctx.body = { error: '目标分组不存在' };
      return;
    }
    
    folderName = folder.name;
    folderIdToSet = folder.id;
  } else {
    const defaultFolder = ensureDefaultFolder(userId);
    folderIdToSet = defaultFolder.id;
    folderName = 'default';
  }
  
  const placeholders = patch_ids.map(() => '?').join(',');
  const params = [folderIdToSet, folderName, userId, ...patch_ids.map(Number)];
  
  const result = db.prepare(`
    UPDATE favorites 
    SET folder_id = ?, folder = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND patch_id IN (${placeholders})
  `).run(...params);
  
  ctx.body = { 
    success: true, 
    moved_count: result.changes,
    folder_id: folderIdToSet,
    folder: folderName
  };
};

exports.batchDeleteFavorites = async (ctx) => {
  const userId = ctx.state.user.id;
  const { patch_ids } = ctx.request.body;
  
  if (!Array.isArray(patch_ids) || patch_ids.length === 0) {
    ctx.status = 400;
    ctx.body = { error: '请选择要删除的收藏' };
    return;
  }
  
  const placeholders = patch_ids.map(() => '?').join(',');
  const params = [userId, ...patch_ids.map(Number)];
  
  const result = db.prepare(`
    DELETE FROM favorites WHERE user_id = ? AND patch_id IN (${placeholders})
  `).run(...params);

  if (result.changes > 0) {
    patch_ids.forEach(pid => {
      db.prepare('UPDATE patches SET favorites_count = MAX(0, favorites_count - 1) WHERE id = ?').run(Number(pid));
    });
  }

  ctx.body = { success: true, deleted_count: result.changes };
};

exports.toggleFavorite = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;
  const { folder = 'default', folder_id } = ctx.request.body;
  
  const patch = db.prepare('SELECT user_id, title FROM patches WHERE id = ?').get(patchId);
  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }
  
  const existing = db.prepare('SELECT * FROM favorites WHERE user_id = ? AND patch_id = ?').get(userId, patchId);
  
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
    db.prepare('UPDATE patches SET favorites_count = MAX(0, favorites_count - 1) WHERE id = ?').run(patchId);
    ctx.body = { favorited: false };
  } else {
    let folderIdToSet = null;
    let folderName = folder || 'default';
    
    if (folder_id) {
      const folderObj = db.prepare(`
        SELECT * FROM favorite_folders WHERE id = ? AND user_id = ?
      `).get(parseInt(folder_id), userId);
      
      if (folderObj) {
        folderIdToSet = folderObj.id;
        folderName = folderObj.name;
      } else {
        const defaultFolder = ensureDefaultFolder(userId);
        folderIdToSet = defaultFolder.id;
        folderName = 'default';
      }
    } else if (folder && folder !== 'default') {
      let folderObj = db.prepare(`
        SELECT * FROM favorite_folders WHERE user_id = ? AND name = ?
      `).get(userId, folder);
      
      if (!folderObj) {
        const maxOrder = db.prepare(`
          SELECT COALESCE(MAX(sort_order), -1) as max_order
          FROM favorite_folders WHERE user_id = ?
        `).get(userId);
        
        const result = db.prepare(`
          INSERT INTO favorite_folders (user_id, name, sort_order)
          VALUES (?, ?, ?)
        `).run(userId, folder, maxOrder.max_order + 1);
        
        folderIdToSet = result.lastInsertRowid;
      } else {
        folderIdToSet = folderObj.id;
      }
    } else {
      const defaultFolder = ensureDefaultFolder(userId);
      folderIdToSet = defaultFolder.id;
      folderName = 'default';
    }
    
    db.prepare(`
      INSERT INTO favorites (user_id, patch_id, folder, folder_id) 
      VALUES (?, ?, ?, ?)
    `).run(userId, patchId, folderName, folderIdToSet);
    
    db.prepare('UPDATE patches SET favorites_count = favorites_count + 1 WHERE id = ?').run(patchId);
    
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
    
    ctx.body = { 
      favorited: true,
      folder_id: folderIdToSet,
      folder: folderName
    };
  }
};

exports.getMyFavorites = async (ctx) => {
  const { page = 1, limit = 12, folder, folder_id } = ctx.query;
  const offset = (page - 1) * limit;
  const userId = ctx.state.user.id;
  
  ensureDefaultFolder(userId);
  
  let where = 'f.user_id = ?';
  let params = [userId];
  
  if (folder_id) {
    where += ' AND f.folder_id = ?';
    params.push(parseInt(folder_id));
  } else if (folder) {
    where += ' AND f.folder = ?';
    params.push(folder);
  }
  
  const favorites = db.prepare(`
    SELECT f.id as favorite_id, f.folder, f.folder_id, f.created_at as favorited_at,
           p.*, u.username, u.avatar,
           COUNT(l.id) as real_likes,
           CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as is_liked
    FROM favorites f
    JOIN patches p ON f.patch_id = p.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN likes l ON p.id = l.patch_id AND l.user_id = ?
    WHERE ${where}
    GROUP BY p.id
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, ...params, limit, offset);
  
  const total = db.prepare(`SELECT COUNT(*) as count FROM favorites f WHERE ${where}`).get(...params);
  
  const folders = db.prepare(`
    SELECT ff.id, ff.name, ff.description, ff.color, ff.sort_order, ff.is_default,
           ff.created_at, ff.updated_at,
           COUNT(f.id) as count
    FROM favorite_folders ff
    LEFT JOIN favorites f ON ff.id = f.folder_id AND f.user_id = ?
    WHERE ff.user_id = ?
    GROUP BY ff.id
    ORDER BY ff.sort_order ASC, ff.created_at ASC
  `).all(userId, userId);
  
  ctx.body = {
    list: favorites,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit),
    folders
  };
};

exports.getUserFavorites = async (ctx) => {
  const userId = parseInt(ctx.params.id);
  const currentUserId = ctx.state.user?.id;
  const { page = 1, limit = 12 } = ctx.query;
  const offset = (page - 1) * limit;

  const targetUser = db.prepare(`
    SELECT id, privacy_favorites 
    FROM users 
    WHERE id = ?
  `).get(userId);

  if (!targetUser) {
    ctx.status = 404;
    ctx.body = { error: '用户不存在' };
    return;
  }

  const isOwner = currentUserId && currentUserId === userId;
  const privacySetting = targetUser.privacy_favorites || 'public';
  
  let canView = isOwner;
  if (!canView) {
    if (privacySetting === 'public') {
      canView = true;
    } else if (privacySetting === 'followers' && currentUserId) {
      const isFollowing = db.prepare(`
        SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?
      `).get(currentUserId, userId);
      canView = !!isFollowing;
    }
  }

  if (!canView) {
    ctx.body = {
      list: [],
      total: 0,
      page: parseInt(page),
      limit: parseInt(limit),
      can_view: false
    };
    return;
  }

  const favorites = db.prepare(`
    SELECT f.id as favorite_id, f.folder, f.folder_id, f.created_at as favorited_at,
           p.*, u.username, u.avatar,
           COUNT(l.id) as real_likes,
           CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as is_liked
    FROM favorites f
    JOIN patches p ON f.patch_id = p.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN likes l ON p.id = l.patch_id AND l.user_id = ?
    WHERE f.user_id = ? AND p.is_public = 1
    GROUP BY p.id
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `).all(currentUserId || 0, userId, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count 
    FROM favorites f
    JOIN patches p ON f.patch_id = p.id
    WHERE f.user_id = ? AND p.is_public = 1
  `).get(userId);

  ctx.body = {
    list: favorites,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit),
    can_view: true
  };
};

const generateShareToken = () => {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
};

const addToCompareHistory = (userId, patchIds, patchTitles) => {
  try {
    const existing = db.prepare(`
      SELECT id FROM compare_history 
      WHERE user_id = ? AND patch_ids = ?
    `).get(userId, JSON.stringify(patchIds));
    
    if (existing) {
      db.prepare(`
        UPDATE compare_history SET created_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(existing.id);
    } else {
      db.prepare(`
        INSERT INTO compare_history (user_id, patch_ids, patch_titles)
        VALUES (?, ?, ?)
      `).run(userId, JSON.stringify(patchIds), JSON.stringify(patchTitles || []));
      
      const count = db.prepare('SELECT COUNT(*) as count FROM compare_history WHERE user_id = ?').get(userId);
      if (count.count > 50) {
        db.prepare(`
          DELETE FROM compare_history 
          WHERE user_id = ? 
          ORDER BY created_at ASC 
          LIMIT ?
        `).run(userId, count.count - 50);
      }
    }
  } catch (e) {
    console.error('添加对比历史失败:', e);
  }
};

exports.saveCompareScheme = async (ctx) => {
  const userId = ctx.state.user.id;
  const { name, description, patch_ids } = ctx.request.body || {};

  if (!name || !name.trim()) {
    ctx.status = 400;
    ctx.body = { error: '请输入方案名称' };
    return;
  }

  if (!patch_ids || !Array.isArray(patch_ids) || patch_ids.length < 2) {
    ctx.status = 400;
    ctx.body = { error: '至少需要 2 个 Patch' };
    return;
  }

  const trimmedName = name.trim();
  if (trimmedName.length > 100) {
    ctx.status = 400;
    ctx.body = { error: '方案名称不能超过 100 个字符' };
    return;
  }

  const shareToken = generateShareToken();
  const result = db.prepare(`
    INSERT INTO compare_schemes (user_id, name, description, patch_ids, share_token)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    userId,
    trimmedName,
    description || '',
    JSON.stringify(patch_ids),
    shareToken
  );

  ctx.body = {
    success: true,
    id: result.lastInsertRowid,
    share_token: shareToken
  };
};

exports.getCompareSchemes = async (ctx) => {
  const userId = ctx.state.user.id;
  const { page = 1, limit = 20 } = ctx.query;
  const offset = (page - 1) * limit;

  const schemes = db.prepare(`
    SELECT cs.*, 
           (SELECT COUNT(*) FROM compare_schemes WHERE user_id = ?) as total_count
    FROM compare_schemes cs
    WHERE cs.user_id = ?
    ORDER BY cs.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, userId, limit, offset);

  const total = schemes.length > 0 ? schemes[0].total_count : 0;

  const result = schemes.map(s => ({
    ...s,
    patch_ids: JSON.parse(s.patch_ids || '[]')
  }));

  ctx.body = {
    list: result,
    total,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getCompareSchemeDetail = async (ctx) => {
  const schemeId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  const scheme = db.prepare(`
    SELECT cs.*
    FROM compare_schemes cs
    WHERE cs.id = ? AND cs.user_id = ?
  `).get(schemeId, userId);

  if (!scheme) {
    ctx.status = 404;
    ctx.body = { error: '方案不存在' };
    return;
  }

  scheme.patch_ids = JSON.parse(scheme.patch_ids || '[]');

  ctx.body = scheme;
};

exports.updateCompareScheme = async (ctx) => {
  const schemeId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;
  const { name, description, patch_ids, is_public } = ctx.request.body || {};

  const scheme = db.prepare('SELECT * FROM compare_schemes WHERE id = ? AND user_id = ?').get(schemeId, userId);
  if (!scheme) {
    ctx.status = 404;
    ctx.body = { error: '方案不存在' };
    return;
  }

  let updates = [];
  let params = [];

  if (name !== undefined) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      ctx.status = 400;
      ctx.body = { error: '方案名称不能为空' };
      return;
    }
    if (trimmedName.length > 100) {
      ctx.status = 400;
      ctx.body = { error: '方案名称不能超过 100 个字符' };
      return;
    }
    updates.push('name = ?');
    params.push(trimmedName);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description || '');
  }

  if (patch_ids !== undefined) {
    if (!Array.isArray(patch_ids) || patch_ids.length < 2) {
      ctx.status = 400;
      ctx.body = { error: '至少需要 2 个 Patch' };
      return;
    }
    updates.push('patch_ids = ?');
    params.push(JSON.stringify(patch_ids));
  }

  if (is_public !== undefined) {
    updates.push('is_public = ?');
    params.push(is_public ? 1 : 0);
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(schemeId);

    db.prepare(`
      UPDATE compare_schemes SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);
  }

  ctx.body = { success: true };
};

exports.deleteCompareScheme = async (ctx) => {
  const schemeId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  const result = db.prepare(`
    DELETE FROM compare_schemes WHERE id = ? AND user_id = ?
  `).run(schemeId, userId);

  if (result.changes === 0) {
    ctx.status = 404;
    ctx.body = { error: '方案不存在' };
    return;
  }

  ctx.body = { success: true };
};

exports.getSharedScheme = async (ctx) => {
  const { token } = ctx.params;

  const scheme = db.prepare(`
    SELECT cs.*, u.username as creator_name, u.avatar as creator_avatar
    FROM compare_schemes cs
    JOIN users u ON cs.user_id = u.id
    WHERE cs.share_token = ?
  `).get(token);

  if (!scheme) {
    ctx.status = 404;
    ctx.body = { error: '分享链接无效或已过期' };
    return;
  }

  scheme.patch_ids = JSON.parse(scheme.patch_ids || '[]');

  ctx.body = scheme;
};

exports.generateShareLink = async (ctx) => {
  const schemeId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  const scheme = db.prepare('SELECT * FROM compare_schemes WHERE id = ? AND user_id = ?').get(schemeId, userId);
  if (!scheme) {
    ctx.status = 404;
    ctx.body = { error: '方案不存在' };
    return;
  }

  let shareToken = scheme.share_token;
  if (!shareToken) {
    shareToken = generateShareToken();
    db.prepare('UPDATE compare_schemes SET share_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(shareToken, schemeId);
  }

  db.prepare('UPDATE compare_schemes SET is_public = 1 WHERE id = ?').run(schemeId);

  ctx.body = {
    success: true,
    share_token: shareToken,
    share_url: `/compare?share=${shareToken}`
  };
};

exports.revokeShareLink = async (ctx) => {
  const schemeId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  const result = db.prepare(`
    UPDATE compare_schemes SET share_token = NULL, is_public = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(schemeId, userId);

  if (result.changes === 0) {
    ctx.status = 404;
    ctx.body = { error: '方案不存在' };
    return;
  }

  ctx.body = { success: true };
};

exports.getCompareHistory = async (ctx) => {
  const userId = ctx.state.user.id;
  const { page = 1, limit = 20 } = ctx.query;
  const offset = (page - 1) * limit;

  const history = db.prepare(`
    SELECT * FROM compare_history
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM compare_history WHERE user_id = ?').get(userId);

  const result = history.map(h => ({
    ...h,
    patch_ids: JSON.parse(h.patch_ids || '[]'),
    patch_titles: JSON.parse(h.patch_titles || '[]')
  }));

  ctx.body = {
    list: result,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.deleteCompareHistory = async (ctx) => {
  const historyId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  const result = db.prepare(`
    DELETE FROM compare_history WHERE id = ? AND user_id = ?
  `).run(historyId, userId);

  if (result.changes === 0) {
    ctx.status = 404;
    ctx.body = { error: '记录不存在' };
    return;
  }

  ctx.body = { success: true };
};

exports.clearCompareHistory = async (ctx) => {
  const userId = ctx.state.user.id;

  db.prepare('DELETE FROM compare_history WHERE user_id = ?').run(userId);

  ctx.body = { success: true };
};

const deepEqual = (a, b) => {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => deepEqual(a[k], b[k]));
};

const computeDiffInfo = (patches, comparison) => {
  const diffInfo = {};

  Object.keys(comparison).forEach(paramKey => {
    const cells = comparison[paramKey];
    const values = cells.map(c => JSON.stringify(c.value));
    const uniqueValues = [...new Set(values)];
    const hasDiff = uniqueValues.length > 1;

    diffInfo[paramKey] = {
      has_diff: hasDiff,
      cells: cells.map(cell => {
        const cellValueStr = JSON.stringify(cell.value);
        const isUnique = values.filter(v => v === cellValueStr).length === 1;
        const isMostCommon = values.filter(v => v === cellValueStr).length > 1;

        return {
          ...cell,
          is_unique: isUnique && hasDiff,
          is_most_common: isMostCommon
        };
      })
    };
  });

  const moduleUsageDiff = patches.map(p => {
    const modules = JSON.parse(p.modules_used || '[]');
    return {
      patch_id: p.id,
      modules
    };
  });

  const allModuleIds = [...new Set(moduleUsageDiff.flatMap(m => m.modules))];
  const moduleDiffInfo = {};
  allModuleIds.forEach(modId => {
    const presentIn = moduleUsageDiff.filter(m => m.modules.includes(modId)).length;
    moduleDiffInfo[modId] = {
      is_unique: presentIn === 1 && patches.length > 1,
      count: presentIn
    };
  });

  return { diffInfo, moduleDiffInfo };
};

exports.comparePatchesEnhanced = async (ctx) => {
  const { ids, save_history } = ctx.query;
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

  if (patches.length !== patchIds.length) {
    ctx.status = 404;
    ctx.body = { error: '部分 Patch 不存在' };
    return;
  }

  const allModuleIds = [...new Set(
    patches.flatMap(p => JSON.parse(p.modules_used || '[]'))
  )];

  let modulesInfo = {};
  let moduleParamsInfo = {};
  if (allModuleIds.length > 0) {
    const modPlaceholders = allModuleIds.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT m.id, m.name, m.type, m.hp,
             mp.id as param_id, mp.name as param_name, mp.label as param_label,
             mp.type as param_type, mp.unit as param_unit, mp.sort_order
      FROM modules m
      LEFT JOIN module_parameters mp ON m.id = mp.module_id
      WHERE m.id IN (${modPlaceholders})
      ORDER BY m.id, mp.sort_order ASC, mp.id ASC
    `).all(...allModuleIds);

    rows.forEach(r => {
      if (!modulesInfo[r.id]) {
        modulesInfo[r.id] = {
          id: r.id,
          name: r.name,
          type: r.type,
          hp: r.hp
        };
        moduleParamsInfo[r.id] = [];
      }
      if (r.param_id) {
        moduleParamsInfo[r.id].push({
          id: r.param_id,
          name: r.param_name,
          label: r.param_label || r.param_name,
          type: r.param_type,
          unit: r.param_unit,
          sort_order: r.sort_order
        });
      }
    });
  }

  const moduleComparison = {};

  allModuleIds.forEach(modId => {
    const paramsDef = moduleParamsInfo[modId] || [];
    const paramMap = {};

    paramsDef.forEach(pdef => {
      paramMap[pdef.name] = patches.map(patch => {
        const params = JSON.parse(patch.parameters || '{}');
        const modParams = params[String(modId)] || {};
        return {
          patch_id: patch.id,
          title: patch.title,
          value: modParams[pdef.name] !== undefined ? modParams[pdef.name] : null,
          has_module: JSON.parse(patch.modules_used || '[]').includes(modId)
        };
      });

      const values = paramMap[pdef.name].map(c => c.has_module ? JSON.stringify(c.value) : '__NO_MODULE__');
      const uniqueValues = [...new Set(values.filter(v => v !== '__NO_MODULE__'))];
      const hasDiff = uniqueValues.length > 1;
      const valueCounts = {};
      values.forEach(v => {
        if (v !== '__NO_MODULE__') {
          valueCounts[v] = (valueCounts[v] || 0) + 1;
        }
      });

      paramMap[pdef.name] = paramMap[pdef.name].map(cell => {
        const cellValueStr = cell.has_module ? JSON.stringify(cell.value) : '__NO_MODULE__';
        const isUnique = cell.has_module && hasDiff && valueCounts[cellValueStr] === 1;
        const isMostCommon = cell.has_module && hasDiff && valueCounts[cellValueStr] > 1;
        return {
          ...cell,
          is_unique: isUnique,
          is_most_common: isMostCommon
        };
      });

      paramMap[pdef.name + '__meta'] = {
        param_def: pdef,
        has_diff: hasDiff
      };
    });

    const patchModuleUsage = patches.map(patch => ({
      patch_id: patch.id,
      title: patch.title,
      has_module: JSON.parse(patch.modules_used || '[]').includes(modId)
    }));

    const usedCount = patchModuleUsage.filter(u => u.has_module).length;
    moduleComparison[modId] = {
      module_info: modulesInfo[modId] || { id: modId, name: `模块 ${modId}`, type: 'unknown', hp: 0 },
      param_count: paramsDef.length,
      used_count: usedCount,
      all_patches_have: usedCount === patches.length,
      has_diff: Object.keys(paramMap).some(k => !k.endsWith('__meta') && paramMap[k + '__meta']?.has_diff),
      patch_module_usage: patchModuleUsage,
      parameters: paramMap
    };
  });

  const moduleUsage = patches.map(p => ({
    patch_id: p.id,
    title: p.title,
    modules: JSON.parse(p.modules_used || '[]')
  }));

  if (save_history !== '0' && ctx.state.user) {
    const titles = patches.map(p => p.title);
    addToCompareHistory(ctx.state.user.id, patchIds, titles);
  }

  ctx.body = {
    patches,
    module_usage: moduleUsage,
    module_comparison: moduleComparison,
    all_module_ids: allModuleIds,
    modules_info: modulesInfo
  };
};
