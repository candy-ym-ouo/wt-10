const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
           is_creator_verified, creator_verified_at
    FROM users WHERE id = ?
  `).get(userId);

  if (!user) {
    ctx.status = 404;
    ctx.body = { error: '用户不存在' };
    return;
  }

  const patches = db.prepare(`
    SELECT p.*, COUNT(l.id) as likes_count,
           EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND patch_id = p.id) as is_liked,
           EXISTS(SELECT 1 FROM favorites WHERE user_id = ? AND patch_id = p.id) as is_favorited
    FROM patches p
    LEFT JOIN likes l ON p.id = l.patch_id
    WHERE p.user_id = ? AND p.is_public = 1
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all(currentUserId || 0, currentUserId || 0, userId);

  const isFollowing = currentUserId ? db.prepare(`
    SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?
  `).get(currentUserId, userId) : null;

  ctx.body = { 
    ...user, 
    patches, 
    is_following: !!isFollowing 
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
