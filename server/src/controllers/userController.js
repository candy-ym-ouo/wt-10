const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const defaultCategories = ['comment', 'review', 'follow', 'activity', 'like', 'favorite', 'system'];

const initUserSubscriptions = (userId) => {
  try {
    const insertSubscription = db.prepare(`
      INSERT OR IGNORE INTO notification_subscriptions (user_id, category, enabled)
      VALUES (?, ?, 1)
    `);
    defaultCategories.forEach(category => {
      insertSubscription.run(userId, category);
    });
  } catch (e) {
    console.error('初始化用户订阅失败:', e);
  }
};

exports.register = async (ctx) => {
  const { username, email, password } = ctx.request.body;

  if (!username || !email || !password) {
    ctx.status = 400;
    ctx.body = { error: '请填写完整信息' };
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    ctx.status = 400;
    ctx.body = { error: '用户名或邮箱已存在' };
    return;
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
  const result = stmt.run(username, email, hashedPassword);

  initUserSubscriptions(result.lastInsertRowid);

  const user = db.prepare('SELECT id, username, email, avatar, role, bio, is_creator_verified, creator_verified_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  ctx.body = { user, token };
};

exports.login = async (ctx) => {
  const { username, password } = ctx.request.body;

  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    ctx.status = 401;
    ctx.body = { error: '用户名或密码错误' };
    return;
  }

  if (user.role === 'banned') {
    ctx.status = 403;
    ctx.body = { error: '您的账号已被永久封禁，无法登录', banned: true, role: 'banned' };
    return;
  }

  if (user.role === 'suspended') {
    const activePunishment = db.prepare(`
      SELECT ends_at FROM report_punishments
      WHERE target_user_id = ? AND punishment_type = 'suspend_user'
      ORDER BY created_at DESC LIMIT 1
    `).get(user.id);

    let suspendedUntil = null;
    let isPermanent = false;
    if (activePunishment) {
      if (activePunishment.ends_at && new Date(activePunishment.ends_at) > new Date()) {
        suspendedUntil = activePunishment.ends_at;
      } else if (!activePunishment.ends_at) {
        isPermanent = true;
      }
    }

    if (suspendedUntil || isPermanent) {
      const endsAtText = isPermanent ? '永久' : `至 ${new Date(suspendedUntil).toLocaleString('zh-CN')}`;
      ctx.status = 403;
      ctx.body = {
        error: `您的账号已被临时封禁（${endsAtText}），无法登录`,
        banned: true,
        role: 'suspended',
        suspended_until: suspendedUntil,
        is_permanent: isPermanent
      };
      return;
    } else {
      db.prepare(`UPDATE users SET role = 'user', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(user.id);
      user.role = 'user';
    }
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = user;
  delete safeUser.password;

  ctx.body = { user: safeUser, token };
};

exports.profile = async (ctx) => {
  const userId = parseInt(ctx.params.id);
  const currentUserId = ctx.state.user?.id;
  
  const user = db.prepare(`
    SELECT id, username, email, avatar, bio, created_at, followers_count, following_count,
           is_creator_verified, creator_verified_at, total_patches, total_likes, total_favorites,
           privacy_email, privacy_favorites, privacy_patches
    FROM users WHERE id = ?
  `).get(userId);

  if (!user) {
    ctx.status = 404;
    ctx.body = { error: '用户不存在' };
    return;
  }

  const isOwner = currentUserId && currentUserId === userId;
  const canViewEmail = isOwner || canViewContent(user.privacy_email, userId, currentUserId);
  const canViewPatches = isOwner || canViewContent(user.privacy_patches, userId, currentUserId);
  const canViewFavorites = isOwner || canViewContent(user.privacy_favorites, userId, currentUserId);

  if (!canViewEmail) {
    delete user.email;
  }

  let patches = [];
  if (canViewPatches) {
    patches = db.prepare(`
      SELECT p.*, COUNT(l.id) as likes_count,
             EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND patch_id = p.id) as is_liked,
             EXISTS(SELECT 1 FROM favorites WHERE user_id = ? AND patch_id = p.id) as is_favorited
      FROM patches p
      LEFT JOIN likes l ON p.id = l.patch_id
      WHERE p.user_id = ? AND p.is_public = 1 AND p.deleted_at IS NULL
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all(currentUserId || 0, currentUserId || 0, userId);
  }

  const isFollowing = currentUserId ? db.prepare(`
    SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?
  `).get(currentUserId, userId) : null;

  const visibleTotalPatches = canViewPatches ? user.total_patches : 0;
  const visibleTotalFavorites = canViewFavorites ? user.total_favorites : 0;

  ctx.body = { 
    ...user, 
    total_patches: visibleTotalPatches,
    total_favorites: visibleTotalFavorites,
    patches, 
    is_following: !!isFollowing,
    privacy_settings: {
      email_visible: canViewEmail,
      patches_visible: canViewPatches,
      favorites_visible: canViewFavorites
    }
  };
};

exports.updateProfile = async (ctx) => {
  const { username, email, bio, avatar } = ctx.request.body;
  const userId = ctx.state.user.id;

  const stmt = db.prepare(`
    UPDATE users 
    SET username = COALESCE(?, username),
        email = COALESCE(?, email),
        bio = COALESCE(?, bio),
        avatar = COALESCE(?, avatar),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(username, email, bio, avatar, userId);

  const user = db.prepare('SELECT id, username, email, avatar, bio, role, is_creator_verified, creator_verified_at FROM users WHERE id = ?').get(userId);
  ctx.body = user;
};

exports.currentUser = async (ctx) => {
  ctx.body = ctx.state.user;
};

const PRIVACY_LEVELS = {
  PUBLIC: 'public',
  FOLLOWERS: 'followers',
  PRIVATE: 'private'
};

const isValidPrivacyLevel = (level) => {
  return Object.values(PRIVACY_LEVELS).includes(level);
};

const canViewContent = (privacySetting, ownerId, currentUserId) => {
  if (!privacySetting || privacySetting === PRIVACY_LEVELS.PUBLIC) {
    return true;
  }
  if (!currentUserId) {
    return false;
  }
  if (currentUserId === ownerId) {
    return true;
  }
  if (privacySetting === PRIVACY_LEVELS.FOLLOWERS) {
    const isFollowing = db.prepare(`
      SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?
    `).get(currentUserId, ownerId);
    return !!isFollowing;
  }
  if (privacySetting === PRIVACY_LEVELS.PRIVATE) {
    return false;
  }
  return true;
};

exports.getPrivacySettings = async (ctx) => {
  const userId = ctx.state.user.id;

  const user = db.prepare(`
    SELECT privacy_email, privacy_favorites, privacy_patches
    FROM users WHERE id = ?
  `).get(userId);

  ctx.body = {
    privacy_email: user?.privacy_email || PRIVACY_LEVELS.PUBLIC,
    privacy_favorites: user?.privacy_favorites || PRIVACY_LEVELS.PUBLIC,
    privacy_patches: user?.privacy_patches || PRIVACY_LEVELS.PUBLIC
  };
};

exports.updatePrivacySettings = async (ctx) => {
  const { privacy_email, privacy_favorites, privacy_patches } = ctx.request.body;
  const userId = ctx.state.user.id;

  const updates = {};
  if (privacy_email !== undefined) {
    if (!isValidPrivacyLevel(privacy_email)) {
      ctx.status = 400;
      ctx.body = { error: '邮箱隐私设置值无效' };
      return;
    }
    updates.privacy_email = privacy_email;
  }
  if (privacy_favorites !== undefined) {
    if (!isValidPrivacyLevel(privacy_favorites)) {
      ctx.status = 400;
      ctx.body = { error: '收藏夹隐私设置值无效' };
      return;
    }
    updates.privacy_favorites = privacy_favorites;
  }
  if (privacy_patches !== undefined) {
    if (!isValidPrivacyLevel(privacy_patches)) {
      ctx.status = 400;
      ctx.body = { error: 'Patch 隐私设置值无效' };
      return;
    }
    updates.privacy_patches = privacy_patches;
  }

  if (Object.keys(updates).length === 0) {
    ctx.status = 400;
    ctx.body = { error: '没有提供要更新的设置' };
    return;
  }

  const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(userId);

  const stmt = db.prepare(`
    UPDATE users 
    SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(...values);

  const user = db.prepare(`
    SELECT privacy_email, privacy_favorites, privacy_patches
    FROM users WHERE id = ?
  `).get(userId);

  ctx.body = user;
};

exports.PRIVACY_LEVELS = PRIVACY_LEVELS;
exports.canViewContent = canViewContent;
