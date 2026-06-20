const db = require('../db');
const { isStaffRole } = require('../constants/permissions');

const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  REVIEW: 'review',
  APPROVE: 'approve',
  REJECT: 'reject',
  BAN: 'ban',
  UNBAN: 'unban',
  LOGIN: 'login',
  LOGOUT: 'logout',
  EXPORT: 'export'
};

const initAuditTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      role TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      target_name TEXT,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      user_agent TEXT,
      status_code INTEGER,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
  `);
};

const createAuditLog = ({
  userId,
  username,
  role,
  action,
  targetType,
  targetId,
  targetName,
  oldValue,
  newValue,
  ipAddress,
  userAgent,
  statusCode,
  errorMessage
}) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        user_id, username, role, action, target_type, target_id,
        target_name, old_value, new_value, ip_address, user_agent,
        status_code, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      userId ?? null,
      username ?? null,
      role ?? null,
      action,
      targetType ?? null,
      targetId ?? null,
      targetName ?? null,
      oldValue ? (typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue)) : null,
      newValue ? (typeof newValue === 'string' ? newValue : JSON.stringify(newValue)) : null,
      ipAddress ?? null,
      userAgent ?? null,
      statusCode ?? null,
      errorMessage ?? null
    );
    return result.lastInsertRowid;
  } catch (err) {
    console.error('[AUDIT] 创建审计日志失败:', err.message);
    return null;
  }
};

const AUDIT_RULES = [
  { method: 'POST', pattern: /^\/api\/auth\/login$/, action: 'login', targetType: null, staffOnly: false },
  { method: 'POST', pattern: /^\/api\/auth\/register$/, action: 'create', targetType: 'user', staffOnly: false },

  { method: 'PUT', pattern: /^\/api\/auth\/profile$/, action: 'update', targetType: 'user', staffOnly: false },

  { method: 'POST', pattern: /^\/api\/patches$/, action: 'create', targetType: 'patch', staffOnly: false },
  { method: 'PUT', pattern: /^\/api\/patches\/(\d+)$/, action: 'update', targetType: 'patch', idGroup: 1, staffOnly: false },
  { method: 'DELETE', pattern: /^\/api\/patches\/(\d+)$/, action: 'delete', targetType: 'patch', idGroup: 1, staffOnly: false },

  { method: 'POST', pattern: /^\/api\/articles$/, action: 'create', targetType: 'article', staffOnly: false },
  { method: 'PUT', pattern: /^\/api\/articles\/(\d+)$/, action: 'update', targetType: 'article', idGroup: 1, staffOnly: false },
  { method: 'DELETE', pattern: /^\/api\/articles\/(\d+)$/, action: 'delete', targetType: 'article', idGroup: 1, staffOnly: false },

  { method: 'PUT', pattern: /^\/api\/admin\/users\/(\d+)$/, action: 'update', targetType: 'user', idGroup: 1, staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/users\/(\d+)$/, action: 'delete', targetType: 'user', idGroup: 1, staffOnly: true },

  { method: 'POST', pattern: /^\/api\/admin\/modules$/, action: 'create', targetType: 'module', staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/modules\/(\d+)$/, action: 'update', targetType: 'module', idGroup: 1, staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/modules\/(\d+)$/, action: 'delete', targetType: 'module', idGroup: 1, staffOnly: true },

  { method: 'POST', pattern: /^\/api\/manufacturers$/, action: 'create', targetType: 'manufacturer', staffOnly: true },
  { method: 'POST', pattern: /^\/api\/admin\/manufacturers$/, action: 'create', targetType: 'manufacturer', staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/manufacturers\/(\d+)$/, action: 'update', targetType: 'manufacturer', idGroup: 1, staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/manufacturers\/(\d+)$/, action: 'delete', targetType: 'manufacturer', idGroup: 1, staffOnly: true },

  { method: 'PUT', pattern: /^\/api\/admin\/patches\/(\d+)\/status$/, action: 'review', targetType: 'patch', idGroup: 1, staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/patches\/(\d+)\/public$/, action: 'update', targetType: 'patch', idGroup: 1, staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/patches\/(\d+)$/, action: 'delete', targetType: 'patch', idGroup: 1, staffOnly: true },

  { method: 'POST', pattern: /^\/api\/modules$/, action: 'create', targetType: 'module', staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/modules\/(\d+)$/, action: 'update', targetType: 'module', idGroup: 1, staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/modules\/(\d+)$/, action: 'delete', targetType: 'module', idGroup: 1, staffOnly: true },

  { method: 'PUT', pattern: /^\/api\/admin\/articles\/(\d+)\/review$/, action: 'review', targetType: 'article', idGroup: 1, staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/articles\/(\d+)\/public$/, action: 'update', targetType: 'article', idGroup: 1, staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/articles\/(\d+)$/, action: 'delete', targetType: 'article', idGroup: 1, staffOnly: true },

  { method: 'POST', pattern: /^\/api\/admin\/collections$/, action: 'create', targetType: 'collection', staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/collections\/(\d+)$/, action: 'update', targetType: 'collection', idGroup: 1, staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/collections\/(\d+)$/, action: 'delete', targetType: 'collection', idGroup: 1, staffOnly: true },

  { method: 'POST', pattern: /^\/api\/admin\/activities$/, action: 'create', targetType: 'activity', staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/activities\/(\d+)$/, action: 'update', targetType: 'activity', idGroup: 1, staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/activities\/(\d+)$/, action: 'delete', targetType: 'activity', idGroup: 1, staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/activities\/registrations\/(\d+)\/status$/, action: 'review', targetType: 'activity_registration', idGroup: 1, staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/activities\/submissions\/(\d+)\/review$/, action: 'review', targetType: 'activity_submission', idGroup: 1, staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/activities\/submissions\/(\d+)$/, action: 'delete', targetType: 'activity_submission', idGroup: 1, staffOnly: true },

  { method: 'POST', pattern: /^\/api\/admin\/challenge\/seasons$/, action: 'create', targetType: 'challenge_season', staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/challenge\/seasons\/(\d+)$/, action: 'update', targetType: 'challenge_season', idGroup: 1, staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/challenge\/seasons\/(\d+)$/, action: 'delete', targetType: 'challenge_season', idGroup: 1, staffOnly: true },
  { method: 'POST', pattern: /^\/api\/admin\/challenge\/activities\/(\d+)\/publish-results$/, action: 'update', targetType: 'challenge', idGroup: 1, staffOnly: true },
  { method: 'POST', pattern: /^\/api\/admin\/challenge\/winners\/assign$/, action: 'update', targetType: 'challenge_winner', staffOnly: true },

  { method: 'PUT', pattern: /^\/api\/admin\/creator-verifications\/(\d+)\/review$/, action: 'review', targetType: 'creator_verification', idGroup: 1, staffOnly: true },

  { method: 'POST', pattern: /^\/api\/downloads$/, action: 'create', targetType: 'download', staffOnly: false },
  { method: 'DELETE', pattern: /^\/api\/me\/downloads\/(\d+)$/, action: 'delete', targetType: 'download', idGroup: 1, staffOnly: false },
  { method: 'PUT', pattern: /^\/api\/admin\/downloads\/(\d+)\/review$/, action: 'review', targetType: 'download', idGroup: 1, staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/downloads\/(\d+)$/, action: 'delete', targetType: 'download', idGroup: 1, staffOnly: true },

  { method: 'PUT', pattern: /^\/api\/admin\/reports\/content\/(\d+)$/, action: 'review', targetType: 'content_report', idGroup: 1, staffOnly: true },
  { method: 'POST', pattern: /^\/api\/admin\/reports\/content\/batch$/, action: 'review', targetType: 'content_report', staffOnly: true },
  { method: 'GET', pattern: /^\/api\/admin\/reports\/export$/, action: 'export', targetType: 'report', staffOnly: true },

  { method: 'POST', pattern: /^\/api\/products$/, action: 'create', targetType: 'product', staffOnly: true },
  { method: 'POST', pattern: /^\/api\/admin\/products$/, action: 'create', targetType: 'product', staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/products\/(\d+)$/, action: 'update', targetType: 'product', idGroup: 1, staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/products\/(\d+)$/, action: 'update', targetType: 'product', idGroup: 1, staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/products\/(\d+)$/, action: 'delete', targetType: 'product', idGroup: 1, staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/products\/(\d+)$/, action: 'delete', targetType: 'product', idGroup: 1, staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/products\/(\d+)\/active$/, action: 'update', targetType: 'product', idGroup: 1, staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/products\/(\d+)\/active$/, action: 'update', targetType: 'product', idGroup: 1, staffOnly: true },

  { method: 'POST', pattern: /^\/api\/orders$/, action: 'create', targetType: 'order', staffOnly: false },

  { method: 'POST', pattern: /^\/api\/me\/withdrawals$/, action: 'create', targetType: 'withdrawal', staffOnly: false },
  { method: 'PUT', pattern: /^\/api\/admin\/withdrawals\/(\d+)\/review$/, action: 'review', targetType: 'withdrawal', idGroup: 1, staffOnly: true },

  { method: 'POST', pattern: /^\/api\/me\/api-keys$/, action: 'create', targetType: 'api_key', staffOnly: false },
  { method: 'PUT', pattern: /^\/api\/me\/api-keys\/(\d+)$/, action: 'update', targetType: 'api_key', idGroup: 1, staffOnly: false },
  { method: 'DELETE', pattern: /^\/api\/me\/api-keys\/(\d+)$/, action: 'delete', targetType: 'api_key', idGroup: 1, staffOnly: false },
  { method: 'POST', pattern: /^\/api\/admin\/api-keys\/(\d+)\/ban$/, action: 'ban', targetType: 'api_key', idGroup: 1, staffOnly: true },
  { method: 'POST', pattern: /^\/api\/admin\/api-keys\/(\d+)\/unban$/, action: 'unban', targetType: 'api_key', idGroup: 1, staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/api-keys\/(\d+)\/rate-limit$/, action: 'update', targetType: 'api_key', idGroup: 1, staffOnly: true },

  { method: 'POST', pattern: /^\/api\/admin\/modules\/(\d+)\/combinations$/, action: 'create', targetType: 'module_combination', staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/modules\/combinations\/(\d+)$/, action: 'update', targetType: 'module_combination', idGroup: 1, staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/modules\/combinations\/(\d+)$/, action: 'delete', targetType: 'module_combination', idGroup: 1, staffOnly: true },
  { method: 'POST', pattern: /^\/api\/admin\/modules\/combinations\/recalculate$/, action: 'update', targetType: 'module_combination', staffOnly: true },

  { method: 'POST', pattern: /^\/api\/admin\/modules\/(\d+)\/wiki$/, action: 'update', targetType: 'module_wiki', idGroup: 1, staffOnly: true },
  { method: 'POST', pattern: /^\/api\/admin\/modules\/(\d+)\/parameters$/, action: 'create', targetType: 'module_parameter', idGroup: 1, staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/modules\/(\d+)\/parameters\/(\d+)$/, action: 'update', targetType: 'module_parameter', staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/modules\/(\d+)\/parameters\/(\d+)$/, action: 'delete', targetType: 'module_parameter', staffOnly: true },
  { method: 'POST', pattern: /^\/api\/admin\/modules\/(\d+)\/tips$/, action: 'create', targetType: 'module_tip', idGroup: 1, staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/modules\/(\d+)\/tips\/(\d+)$/, action: 'update', targetType: 'module_tip', staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/modules\/(\d+)\/tips\/(\d+)$/, action: 'delete', targetType: 'module_tip', staffOnly: true },
  { method: 'POST', pattern: /^\/api\/admin\/modules\/(\d+)\/recommended-patches$/, action: 'create', targetType: 'module_recommended_patch', staffOnly: true },
  { method: 'PUT', pattern: /^\/api\/admin\/modules\/(\d+)\/recommended-patches\/(\d+)$/, action: 'update', targetType: 'module_recommended_patch', staffOnly: true },
  { method: 'DELETE', pattern: /^\/api\/admin\/modules\/(\d+)\/recommended-patches\/(\d+)$/, action: 'delete', targetType: 'module_recommended_patch', staffOnly: true }
];

const matchAuditRule = (method, path) => {
  const upperMethod = method.toUpperCase();
  for (const rule of AUDIT_RULES) {
    if (rule.method.toUpperCase() !== upperMethod) continue;
    const match = path.match(rule.pattern);
    if (match) {
      let targetId = null;
      if (rule.idGroup != null && match[rule.idGroup]) {
        targetId = parseInt(match[rule.idGroup]);
      }
      return {
        action: rule.action,
        targetType: rule.targetType,
        targetId,
        staffOnly: rule.staffOnly
      };
    }
  }
  return null;
};

const getClientIp = (ctx) => {
  const xff = ctx.headers['x-forwarded-for'];
  if (xff) {
    return xff.split(',')[0].trim();
  }
  const realIp = ctx.headers['x-real-ip'];
  if (realIp) return realIp;
  return ctx.ip || null;
};

const globalAuditMiddleware = async (ctx, next) => {
  let error = null;
  let responseBodySnapshot = null;

  try {
    await next();
    try {
      responseBodySnapshot = ctx.body;
    } catch (_) {
      responseBodySnapshot = null;
    }
  } catch (err) {
    error = err;
    throw err;
  } finally {
    const matched = matchAuditRule(ctx.method, ctx.path);

    if (matched) {
      const user = ctx.state.user;

      let auditUserId = null;
      let auditUsername = null;
      let auditRole = null;

      if (matched.action === 'login' && responseBodySnapshot && typeof responseBodySnapshot === 'object' && responseBodySnapshot.user) {
        auditUserId = responseBodySnapshot.user.id;
        auditUsername = responseBodySnapshot.user.username || responseBodySnapshot.user.email;
        auditRole = responseBodySnapshot.user.role;
      } else if (matched.action === 'create' && matched.targetType === 'user' && responseBodySnapshot && typeof responseBodySnapshot === 'object') {
        auditUserId = responseBodySnapshot.id || null;
        auditUsername = responseBodySnapshot.username || null;
        auditRole = responseBodySnapshot.role || 'user';
      } else if (user) {
        auditUserId = user.id;
        auditUsername = user.username || null;
        auditRole = user.role || null;
      }

      const hasAuditUser = auditUserId !== null;
      const passesStaffCheck = !matched.staffOnly || isStaffRole(auditRole);

      if (hasAuditUser && passesStaffCheck) {
        let targetName = null;
        let newValue = ctx.request.body && Object.keys(ctx.request.body).length > 0
          ? ctx.request.body
          : null;

        if (responseBodySnapshot && typeof responseBodySnapshot === 'object') {
          if (responseBodySnapshot.name) targetName = responseBodySnapshot.name;
          else if (responseBodySnapshot.title) targetName = responseBodySnapshot.title;
          else if (responseBodySnapshot.username) targetName = responseBodySnapshot.username;
          else if (matched.action === 'login' && responseBodySnapshot.user) {
            targetName = responseBodySnapshot.user.username || responseBodySnapshot.user.email;
          } else if (matched.action === 'create' && matched.targetType === 'user') {
            targetName = responseBodySnapshot.username || responseBodySnapshot.email || null;
          }
        }

        if (!targetName && newValue && typeof newValue === 'object') {
          targetName = newValue.name || newValue.title || newValue.username || null;
        }

        let errorMessage = null;
        if (error) {
          errorMessage = error.message || String(error);
        } else if (responseBodySnapshot && typeof responseBodySnapshot === 'object' && responseBodySnapshot.error) {
          errorMessage = responseBodySnapshot.error;
        }

        const statusCode = error
          ? (error.status || 500)
          : ctx.status;

        createAuditLog({
          userId: auditUserId,
          username: auditUsername,
          role: auditRole,
          action: matched.action,
          targetType: matched.targetType,
          targetId: matched.targetId,
          targetName,
          oldValue: null,
          newValue,
          ipAddress: getClientIp(ctx),
          userAgent: ctx.headers['user-agent'] || null,
          statusCode,
          errorMessage
        });
      }
    }
  }
};

const getAuditLogs = (params = {}) => {
  const { page = 1, pageSize = 20, userId, action, targetType, startDate, endDate, keyword } = params;

  let whereConditions = [];
  let sqlParams = [];

  if (userId) {
    whereConditions.push('user_id = ?');
    sqlParams.push(userId);
  }
  if (action) {
    whereConditions.push('action = ?');
    sqlParams.push(action);
  }
  if (targetType) {
    whereConditions.push('target_type = ?');
    sqlParams.push(targetType);
  }
  if (startDate) {
    whereConditions.push('created_at >= ?');
    sqlParams.push(startDate);
  }
  if (endDate) {
    whereConditions.push('created_at <= ?');
    sqlParams.push(endDate);
  }
  if (keyword) {
    whereConditions.push('(username LIKE ? OR action LIKE ? OR target_name LIKE ? OR target_type LIKE ?)');
    sqlParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`);
  const { total } = countStmt.get(...sqlParams);

  const offset = (page - 1) * pageSize;
  const logsStmt = db.prepare(`
    SELECT * FROM audit_logs ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  const list = logsStmt.all(...sqlParams, pageSize, offset);

  return {
    list,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
};

const getAuditLogById = (id) => {
  return db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id);
};

module.exports = {
  AUDIT_ACTIONS,
  initAuditTables,
  createAuditLog,
  globalAuditMiddleware,
  getAuditLogs,
  getAuditLogById
};
