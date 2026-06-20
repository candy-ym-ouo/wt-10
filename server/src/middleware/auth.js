const jwt = require('jsonwebtoken');
const db = require('../db');
const { hasPermission, hasAnyPermission, isStaffRole, getRolePermissions, ROLES } = require('../constants/permissions');

const authMiddleware = async (ctx, next) => {
  let token = null;
  
  const authHeader = ctx.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  if (!token && ctx.query.token) {
    token = ctx.query.token;
  }
  
  if (!token) {
    ctx.state.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT id, username, email, avatar, role, bio, is_creator_verified, creator_verified_at FROM users WHERE id = ?').get(decoded.id);
    
    if (user) {
      if (user.role === 'banned') {
        ctx.state.user = null;
        return next();
      }

      if (user.role === 'suspended') {
        const activePunishment = db.prepare(`
          SELECT ends_at FROM report_punishments
          WHERE target_user_id = ? AND punishment_type = 'suspend_user'
          ORDER BY created_at DESC LIMIT 1
        `).get(user.id);

        let stillSuspended = false;
        if (activePunishment) {
          if (!activePunishment.ends_at || new Date(activePunishment.ends_at) > new Date()) {
            stillSuspended = true;
          }
        }

        if (!stillSuspended) {
          db.prepare(`UPDATE users SET role = 'user', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(user.id);
          user.role = 'user';
        }
      }

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

  if (ctx.state.user.role === 'banned') {
    ctx.status = 403;
    ctx.body = { error: '您的账号已被永久封禁', banned: true, role: 'banned' };
    return;
  }

  if (ctx.state.user.role === 'suspended') {
    const activePunishment = db.prepare(`
      SELECT ends_at FROM report_punishments
      WHERE target_user_id = ? AND punishment_type = 'suspend_user'
      ORDER BY created_at DESC LIMIT 1
    `).get(ctx.state.user.id);

    let suspendedUntil = null;
    let isPermanent = false;
    if (activePunishment) {
      if (!activePunishment.ends_at) {
        isPermanent = true;
      } else if (new Date(activePunishment.ends_at) > new Date()) {
        suspendedUntil = activePunishment.ends_at;
      }
    }

    if (suspendedUntil || isPermanent) {
      const endsAtText = isPermanent ? '永久' : `至 ${new Date(suspendedUntil).toLocaleString('zh-CN')}`;
      ctx.status = 403;
      ctx.body = {
        error: `您的账号已被临时封禁（${endsAtText}）`,
        banned: true,
        role: 'suspended',
        suspended_until: suspendedUntil,
        is_permanent: isPermanent
      };
      return;
    } else {
      db.prepare(`UPDATE users SET role = 'user', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(ctx.state.user.id);
      ctx.state.user.role = 'user';
    }
  }

  return next();
};

const requireAdmin = async (ctx, next) => {
  if (!ctx.state.user || !isStaffRole(ctx.state.user.role)) {
    ctx.status = 403;
    ctx.body = { error: '需要管理员权限' };
    return;
  }
  return next();
};

const requireSuperAdmin = async (ctx, next) => {
  if (!ctx.state.user || ctx.state.user.role !== ROLES.ADMIN) {
    ctx.status = 403;
    ctx.body = { error: '需要超级管理员权限' };
    return;
  }
  return next();
};

const requirePermission = (permission) => {
  return async (ctx, next) => {
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = { error: '需要登录' };
      return;
    }
    if (!hasPermission(ctx.state.user.role, permission)) {
      ctx.status = 403;
      ctx.body = { error: '权限不足', permission };
      return;
    }
    return next();
  };
};

const requireAnyPermission = (permissions) => {
  return async (ctx, next) => {
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = { error: '需要登录' };
      return;
    }
    if (!hasAnyPermission(ctx.state.user.role, permissions)) {
      ctx.status = 403;
      ctx.body = { error: '权限不足', permissions };
      return;
    }
    return next();
  };
};

module.exports = { 
  authMiddleware, 
  requireAuth, 
  requireAdmin, 
  requireSuperAdmin,
  requirePermission,
  requireAnyPermission 
};
