const db = require('../db');

const RATE_LIMITS = {
  like: {
    perMinute: 30,
    perHour: 100,
    perDay: 500
  },
  favorite: {
    perMinute: 30,
    perHour: 100,
    perDay: 500
  }
};

const initRateLimitTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS social_action_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      status TEXT NOT NULL,
      error_code TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_social_logs_user ON social_action_logs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_social_logs_action ON social_action_logs(action_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_social_logs_target ON social_action_logs(target_type, target_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_social_logs_status ON social_action_logs(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_social_logs_created ON social_action_logs(created_at DESC);

    CREATE TABLE IF NOT EXISTS rate_limit_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      time_window TEXT NOT NULL,
      window_start DATETIME NOT NULL,
      count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, action_type, time_window, window_start),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_rate_limit_user ON rate_limit_records(user_id, action_type);
    CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_records(action_type, time_window, window_start);
  `);
  console.log('social_action_logs / rate_limit_records 表检查/创建完成');
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

const getTimeWindowStart = (windowType) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  switch (windowType) {
    case 'minute':
      return `${year}-${month}-${day} ${hour}:${minute}:00`;
    case 'hour':
      return `${year}-${month}-${day} ${hour}:00:00`;
    case 'day':
      return `${year}-${month}-${day} 00:00:00`;
    default:
      return now.toISOString();
  }
};

const checkRateLimit = (userId, actionType) => {
  const limits = RATE_LIMITS[actionType] || RATE_LIMITS.like;
  const windows = [
    { type: 'minute', limit: limits.perMinute },
    { type: 'hour', limit: limits.perHour },
    { type: 'day', limit: limits.perDay }
  ];

  for (const window of windows) {
    const windowStart = getTimeWindowStart(window.type);
    
    const record = db.prepare(`
      SELECT * FROM rate_limit_records 
      WHERE user_id = ? AND action_type = ? AND time_window = ? AND window_start = ?
    `).get(userId, actionType, window.type, windowStart);

    const currentCount = record ? record.count : 0;

    if (currentCount >= window.limit) {
      return {
        blocked: true,
        window: window.type,
        limit: window.limit,
        current: currentCount,
        retryAfter: getRetryAfter(window.type)
      };
    }
  }

  return { blocked: false };
};

const getRetryAfter = (windowType) => {
  const now = new Date();
  switch (windowType) {
    case 'minute':
      return 60 - now.getSeconds();
    case 'hour':
      return 3600 - (now.getMinutes() * 60 + now.getSeconds());
    case 'day':
      return 86400 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds());
    default:
      return 60;
  }
};

const incrementRateLimit = (userId, actionType) => {
  const windows = ['minute', 'hour', 'day'];
  
  const tx = db.transaction(() => {
    for (const windowType of windows) {
      const windowStart = getTimeWindowStart(windowType);
      
      db.prepare(`
        INSERT INTO rate_limit_records (user_id, action_type, time_window, window_start, count, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, action_type, time_window, window_start) DO UPDATE SET
          count = count + 1,
          updated_at = CURRENT_TIMESTAMP
      `).run(userId, actionType, windowType, windowStart);
    }
  });

  tx();
};

const logSocialAction = ({
  userId,
  actionType,
  targetType,
  targetId,
  ipAddress,
  userAgent,
  status,
  errorCode,
  errorMessage
}) => {
  try {
    db.prepare(`
      INSERT INTO social_action_logs (
        user_id, action_type, target_type, target_id, ip_address, user_agent,
        status, error_code, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      userId,
      actionType,
      targetType,
      targetId,
      ipAddress || null,
      userAgent || null,
      status,
      errorCode || null,
      errorMessage || null
    );
  } catch (e) {
    console.error('[RATE_LIMIT] 记录操作日志失败:', e.message);
  }
};

const createRateLimitMiddleware = (actionType) => {
  return async (ctx, next) => {
    const userId = ctx.state.user?.id;
    
    if (!userId) {
      ctx.i18nError(401, 'auth.login_required');
      return;
    }

    const targetId = parseInt(ctx.params.id) || 0;
    const targetType = actionType.includes('article') ? 'article' : 'patch';
    const action = actionType.includes('like') ? 'like' : 'favorite';
    const ipAddress = getClientIp(ctx);
    const userAgent = ctx.headers['user-agent'] || null;

    const rateCheck = checkRateLimit(userId, action);

    if (rateCheck.blocked) {
      const errorCodes = {
        minute: 'RATE_LIMIT_MINUTE',
        hour: 'RATE_LIMIT_HOUR',
        day: 'RATE_LIMIT_DAY'
      };
      
      const translationKeys = {
        minute: 'social.rate_limit_minute',
        hour: 'social.rate_limit_hour',
        day: 'social.rate_limit_day'
      };

      const params = {
        seconds: rateCheck.retryAfter,
        limit: rateCheck.limit
      };

      const errorMessage = ctx.t(translationKeys[rateCheck.window], params);

      logSocialAction({
        userId,
        actionType: action,
        targetType,
        targetId,
        ipAddress,
        userAgent,
        status: 'blocked',
        errorCode: errorCodes[rateCheck.window],
        errorMessage
      });

      ctx.status = 429;
      ctx.body = {
        error: errorMessage,
        error_code: errorCodes[rateCheck.window],
        retry_after: rateCheck.retryAfter,
        limit: rateCheck.limit,
        current: rateCheck.current
      };
      return;
    }

    try {
      await next();

      if (ctx.status >= 200 && ctx.status < 300) {
        incrementRateLimit(userId, action);
        logSocialAction({
          userId,
          actionType: action,
          targetType,
          targetId,
          ipAddress,
          userAgent,
          status: 'success',
          errorCode: null,
          errorMessage: null
        });
      } else if (ctx.body && ctx.body.error) {
        logSocialAction({
          userId,
          actionType: action,
          targetType,
          targetId,
          ipAddress,
          userAgent,
          status: 'failed',
          errorCode: 'OPERATION_FAILED',
          errorMessage: ctx.body.error
        });
      }
    } catch (err) {
      logSocialAction({
        userId,
        actionType: action,
        targetType,
        targetId,
        ipAddress,
        userAgent,
        status: 'error',
        errorCode: 'SYSTEM_ERROR',
        errorMessage: err.message || '系统错误'
      });
      throw err;
    }
  };
};

const getSocialActionStats = (params = {}) => {
  const { 
    page = 1, 
    page_size = 20, 
    user_id, 
    action_type, 
    target_type, 
    status,
    ip_address,
    start_time, 
    end_time 
  } = params;

  let whereConditions = [];
  let sqlParams = [];

  if (user_id) {
    whereConditions.push('sal.user_id = ?');
    sqlParams.push(parseInt(user_id));
  }
  if (action_type) {
    whereConditions.push('sal.action_type = ?');
    sqlParams.push(action_type);
  }
  if (target_type) {
    whereConditions.push('sal.target_type = ?');
    sqlParams.push(target_type);
  }
  if (status) {
    whereConditions.push('sal.status = ?');
    sqlParams.push(status);
  }
  if (ip_address) {
    whereConditions.push('sal.ip_address LIKE ?');
    sqlParams.push(`%${ip_address}%`);
  }
  if (start_time) {
    whereConditions.push('sal.created_at >= ?');
    sqlParams.push(start_time);
  }
  if (end_time) {
    whereConditions.push('sal.created_at <= ?');
    sqlParams.push(end_time);
  }

  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM social_action_logs sal ${whereClause}`);
  const { total } = countStmt.get(...sqlParams);

  const offset = (page - 1) * page_size;
  const logsStmt = db.prepare(`
    SELECT sal.*, u.username, u.avatar
    FROM social_action_logs sal
    LEFT JOIN users u ON sal.user_id = u.id
    ${whereClause}
    ORDER BY sal.created_at DESC
    LIMIT ? OFFSET ?
  `);
  const list = logsStmt.all(...sqlParams, page_size, offset);

  const items = list.map(item => ({
    ...item,
    block_reason: item.error_message
  }));

  return {
    items,
    total,
    page: parseInt(page),
    page_size: parseInt(page_size),
    total_pages: Math.ceil(total / page_size)
  };
};

const getSocialActionOverview = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const totalLikes = db.prepare('SELECT COUNT(*) as count FROM social_action_logs WHERE action_type = ? AND status = ?').get('like', 'success').count;
  const totalFavorites = db.prepare('SELECT COUNT(*) as count FROM social_action_logs WHERE action_type = ? AND status = ?').get('favorite', 'success').count;
  const totalBlocked = db.prepare('SELECT COUNT(*) as count FROM social_action_logs WHERE status = ?').get('blocked').count;

  const todayLikes = db.prepare('SELECT COUNT(*) as count FROM social_action_logs WHERE action_type = ? AND status = ? AND DATE(created_at) = ?').get('like', 'success', today).count;
  const todayFavorites = db.prepare('SELECT COUNT(*) as count FROM social_action_logs WHERE action_type = ? AND status = ? AND DATE(created_at) = ?').get('favorite', 'success', today).count;
  const todayBlocked = db.prepare('SELECT COUNT(*) as count FROM social_action_logs WHERE status = ? AND DATE(created_at) = ?').get('blocked', today).count;

  const highFrequencyUsers = db.prepare(`
    SELECT COUNT(DISTINCT user_id) as count
    FROM (
      SELECT user_id, COUNT(*) as action_count
      FROM social_action_logs
      WHERE status = 'success' AND DATE(created_at) = ?
      GROUP BY user_id
      HAVING action_count > 50
    ) as high_freq
  `).get(today).count;

  const topUsers = db.prepare(`
    SELECT user_id, u.username, u.avatar, action_type, COUNT(*) as count
    FROM social_action_logs sal
    LEFT JOIN users u ON sal.user_id = u.id
    WHERE sal.status = 'success' AND sal.created_at >= ?
    GROUP BY user_id, action_type
    ORDER BY count DESC
    LIMIT 10
  `).all(weekAgo);

  const topTargets = db.prepare(`
    SELECT target_type, target_id, action_type, COUNT(*) as count
    FROM social_action_logs
    WHERE status = 'success' AND created_at >= ?
    GROUP BY target_type, target_id, action_type
    ORDER BY count DESC
    LIMIT 10
  `).all(weekAgo);

  const hourlyTrend = db.prepare(`
    SELECT 
      strftime('%Y-%m-%d %H:00:00', created_at) as hour,
      action_type,
      COUNT(*) as count
    FROM social_action_logs
    WHERE status = 'success' AND created_at >= ?
    GROUP BY hour, action_type
    ORDER BY hour DESC
    LIMIT 48
  `).all(weekAgo);

  const blockedByReason = db.prepare(`
    SELECT error_code, COUNT(*) as count
    FROM social_action_logs
    WHERE status = 'blocked' AND created_at >= ?
    GROUP BY error_code
    ORDER BY count DESC
  `).all(weekAgo);

  return {
    todayLikes,
    todayFavorites,
    todayBlocked,
    highFrequencyUsers,
    totals: {
      likes: totalLikes,
      favorites: totalFavorites,
      blocked: totalBlocked
    },
    today: {
      likes: todayLikes,
      favorites: todayFavorites,
      blocked: todayBlocked
    },
    topUsers,
    topTargets,
    hourlyTrend,
    blockedByReason
  };
};

module.exports = {
  RATE_LIMITS,
  initRateLimitTables,
  createRateLimitMiddleware,
  logSocialAction,
  checkRateLimit,
  incrementRateLimit,
  getSocialActionStats,
  getSocialActionOverview,
  getClientIp
};
