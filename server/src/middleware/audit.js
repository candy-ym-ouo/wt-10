const db = require('../db');

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
      userId,
      username,
      role,
      action,
      targetType,
      targetId,
      targetName,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ipAddress,
      userAgent,
      statusCode,
      errorMessage
    );
    return result.lastInsertRowid;
  } catch (err) {
    console.error('创建审计日志失败:', err);
    return null;
  }
};

const auditMiddleware = (options = {}) => {
  return async (ctx, next) => {
    const startTime = Date.now();
    let error = null;

    try {
      await next();
    } catch (err) {
      error = err;
      throw err;
    } finally {
      if (options.action && ctx.state.user) {
        const responseTime = Date.now() - startTime;
        createAuditLog({
          userId: ctx.state.user.id,
          username: ctx.state.user.username,
          role: ctx.state.user.role,
          action: options.action,
          targetType: options.targetType,
          targetId: options.targetId || (ctx.params && ctx.params.id) || null,
          targetName: options.targetName,
          oldValue: options.oldValue,
          newValue: options.newValue || ctx.request.body,
          ipAddress: ctx.ip || ctx.headers['x-forwarded-for'] || ctx.request.ip,
          userAgent: ctx.headers['user-agent'],
          statusCode: error ? 500 : ctx.status,
          errorMessage: error ? error.message : null
        });
      }
    }
  };
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
    whereConditions.push('(username LIKE ? OR action LIKE ? OR target_name LIKE ?)');
    sqlParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
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
  auditMiddleware,
  getAuditLogs,
  getAuditLogById
};
