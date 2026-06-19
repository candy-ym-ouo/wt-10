const jwt = require('jsonwebtoken');
const db = require('../db');

const authMiddleware = async (ctx, next) => {
  const authHeader = ctx.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.state.user = null;
    return next();
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT id, username, email, avatar, role, bio, is_creator_verified, creator_verified_at FROM users WHERE id = ?').get(decoded.id);
    
    if (user) {
      ctx.state.user = user;
    } else {
      ctx.state.user = null;
    }
  } catch (err) {
    ctx.state.user = null;
  }

  return next();
};

const requireAuth = async (ctx, next) => {
  if (!ctx.state.user) {
    ctx.status = 401;
    ctx.body = { error: '需要登录' };
    return;
  }
  return next();
};

const requireAdmin = async (ctx, next) => {
  if (!ctx.state.user || ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { error: '需要管理员权限' };
    return;
  }
  return next();
};

module.exports = { authMiddleware, requireAuth, requireAdmin };
