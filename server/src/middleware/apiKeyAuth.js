const db = require('../db');
const jwt = require('jsonwebtoken');

const rateLimitCache = new Map();

const getRateLimitKey = (apiKeyId, type) => {
  const now = new Date();
  let bucket;
  if (type === 'min') {
    bucket = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
  } else if (type === 'hour') {
    bucket = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
  } else {
    bucket = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  }
  return `${apiKeyId}:${type}:${bucket}`;
};

const checkRateLimit = (apiKey) => {
  const now = Date.now();
  const limits = {
    min: apiKey.rate_limit_per_min || 60,
    hour: apiKey.rate_limit_per_hour || 1000,
    day: apiKey.rate_limit_per_day || 10000
  };
  
  const counts = { min: 0, hour: 0, day: 0 };
  
  for (const type of ['min', 'hour', 'day']) {
    const key = getRateLimitKey(apiKey.id, type);
    const cached = rateLimitCache.get(key);
    if (cached) {
      counts[type] = cached.count;
    }
    
    const dbCount = db.prepare(`
      SELECT COUNT(*) as count FROM api_call_logs
      WHERE api_key_id = ? AND created_at >= datetime('now', ?)
    `).get(apiKey.id, `-${type === 'min' ? '1 minute' : type === 'hour' ? '1 hour' : '1 day'}`).count;
    
    counts[type] = Math.max(counts[type], dbCount);
    
    if (counts[type] >= limits[type]) {
      return {
        exceeded: true,
        type,
        limit: limits[type],
        retry_after: type === 'min' ? 60 : type === 'hour' ? 3600 : 86400
      };
    }
  }
  
  for (const type of ['min', 'hour', 'day']) {
    const key = getRateLimitKey(apiKey.id, type);
    const cached = rateLimitCache.get(key);
    if (cached) {
      cached.count++;
    } else {
      rateLimitCache.set(key, { count: counts[type] + 1, expires: now + 86400000 });
    }
  }
  
  const cleanupThreshold = now - 86400000;
  for (const [key, value] of rateLimitCache) {
    if (value.expires < cleanupThreshold) {
      rateLimitCache.delete(key);
    }
  }
  
  return { exceeded: false };
};

const extractScopesFromPath = (path, method) => {
  const scopeMap = [
    { pattern: /^\/modules/, methods: ['GET'], scope: 'modules:read' },
    { pattern: /^\/patches$/, methods: ['GET'], scope: 'patches:read' },
    { pattern: /^\/patches\//, methods: ['GET'], scope: 'patches:read' },
    { pattern: /^\/patches$/, methods: ['POST'], scope: 'patches:write' },
    { pattern: /^\/patches\//, methods: ['PUT', 'DELETE', 'POST'], scope: 'patches:write' },
    { pattern: /^\/articles$/, methods: ['GET'], scope: 'articles:read' },
    { pattern: /^\/articles\/[\d]+$/, methods: ['GET'], scope: 'articles:read' },
    { pattern: /^\/articles\/[\d]+\/module-refs$/, methods: ['GET'], scope: 'articles:read' },
    { pattern: /^\/articles$/, methods: ['POST'], scope: 'articles:write' },
    { pattern: /^\/articles\/[\d]+$/, methods: ['PUT', 'DELETE'], scope: 'articles:write' },
    { pattern: /^\/articles\/[\d]+\/(like|favorite|comments)/, methods: ['POST', 'DELETE'], scope: 'articles:write' },
    { pattern: /^\/users\//, methods: ['GET'], scope: 'users:read' },
    { pattern: /^\/collections/, methods: ['GET'], scope: 'collections:read' },
    { pattern: /^\/challenge/, methods: ['GET'], scope: 'challenge:read' },
    { pattern: /^\/downloads/, methods: ['GET'], scope: 'downloads:read' },
    { pattern: /^\/products/, methods: ['GET'], scope: 'products:read' },
    { pattern: /^\/activities/, methods: ['GET'], scope: 'activities:read' },
    { pattern: /^\/compare/, methods: ['GET'], scope: 'social:read' },
    { pattern: /^\/me\/(favorites|patches|drafts|followers|following|feed)/, methods: ['GET'], scope: 'social:read' },
    { pattern: /^\/admin\/reports/, methods: ['GET'], scope: 'stats:read' },
  ];
  
  for (const rule of scopeMap) {
    if (rule.pattern.test(path) && rule.methods.includes(method)) {
      return rule.scope;
    }
  }
  return null;
};

const logApiCall = async (ctx, apiKey, tokenId, startTime, error = null) => {
  const responseTime = Date.now() - startTime;
  const statusCode = ctx.status || (error ? 500 : 200);
  
  try {
    let params = null;
    try {
      if (ctx.request.body && Object.keys(ctx.request.body).length > 0) {
        const safeBody = { ...ctx.request.body };
        if (safeBody.api_secret) safeBody.api_secret = '***';
        if (safeBody.password) safeBody.password = '***';
        params = JSON.stringify(safeBody);
      } else if (ctx.query && Object.keys(ctx.query).length > 0) {
        params = JSON.stringify(ctx.query);
      }
    } catch (e) {}
    
    db.prepare(`
      INSERT INTO api_call_logs 
      (api_key_id, user_id, token_id, endpoint, method, status_code, ip_address, user_agent, response_time_ms, request_params, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      apiKey?.id || null,
      apiKey?.user_id || ctx.state.user?.id || null,
      tokenId || null,
      ctx.path,
      ctx.method,
      statusCode,
      ctx.ip,
      ctx.headers['user-agent'] || null,
      responseTime,
      params,
      error || null
    );
    
    if (apiKey) {
      db.prepare('UPDATE api_keys SET total_calls = total_calls + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(apiKey.id);
    }
  } catch (e) {
    console.error('记录API调用日志失败:', e);
  }
};

const apiKeyAuth = async (ctx, next) => {
  const startTime = Date.now();
  let apiKey = null;
  let tokenId = null;
  
  try {
    const apiKeyHeader = ctx.headers['x-api-key'];
    const authHeader = ctx.headers.authorization;
    
    if (apiKeyHeader) {
      apiKey = db.prepare('SELECT * FROM api_keys WHERE api_key = ?').get(apiKeyHeader);
      
      if (!apiKey) {
        ctx.status = 401;
        ctx.body = { error: '无效的 API Key', code: 'INVALID_API_KEY' };
        await logApiCall(ctx, null, null, startTime, '无效的 API Key');
        return;
      }
      
      if (apiKey.status === 'banned') {
        ctx.status = 403;
        ctx.body = { 
          error: '该 API 密钥已被封禁', 
          code: 'API_KEY_BANNED',
          banned_reason: apiKey.banned_reason 
        };
        await logApiCall(ctx, apiKey, null, startTime, 'API 密钥已被封禁');
        return;
      }
      
      if (apiKey.status === 'inactive') {
        ctx.status = 403;
        ctx.body = { error: '该 API 密钥已被停用', code: 'API_KEY_INACTIVE' };
        await logApiCall(ctx, apiKey, null, startTime, 'API 密钥已被停用');
        return;
      }
      
      if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
        ctx.status = 403;
        ctx.body = { error: '该 API 密钥已过期', code: 'API_KEY_EXPIRED' };
        await logApiCall(ctx, apiKey, null, startTime, 'API 密钥已过期');
        return;
      }
      
      const rateLimitResult = checkRateLimit(apiKey);
      if (rateLimitResult.exceeded) {
        ctx.status = 429;
        ctx.body = { 
          error: `请求过于频繁，已超过 ${rateLimitResult.type} 限流（${rateLimitResult.limit}次）`, 
          code: 'RATE_LIMIT_EXCEEDED',
          limit_type: rateLimitResult.type,
          limit: rateLimitResult.limit,
          retry_after: rateLimitResult.retry_after
        };
        ctx.set('Retry-After', rateLimitResult.retry_after);
        await logApiCall(ctx, apiKey, null, startTime, '超过限流限制');
        return;
      }
      
      const requiredScope = extractScopesFromPath(ctx.path.replace('/api', ''), ctx.method);
      if (requiredScope) {
        const keyScopes = JSON.parse(apiKey.scopes || '[]');
        if (!keyScopes.includes(requiredScope)) {
          ctx.status = 403;
          ctx.body = { 
            error: `缺少权限范围: ${requiredScope}`, 
            code: 'INSUFFICIENT_SCOPE',
            required_scope: requiredScope
          };
          await logApiCall(ctx, apiKey, null, startTime, `缺少权限: ${requiredScope}`);
          return;
        }
      }
      
      const user = db.prepare(`
        SELECT id, username, email, avatar, role, bio, is_creator_verified, creator_verified_at 
        FROM users WHERE id = ?
      `).get(apiKey.user_id);
      
      if (user && user.role !== 'banned') {
        ctx.state.user = user;
        ctx.state.api_key = apiKey;
      }
      
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (!token.startsWith('eyJ')) {
        return next();
      }
      
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.type === 'api_token') {
          const tokenRecord = db.prepare('SELECT * FROM api_tokens WHERE token = ?').get(token);
          
          if (!tokenRecord) {
            ctx.status = 401;
            ctx.body = { error: '无效的访问令牌', code: 'INVALID_TOKEN' };
            return;
          }
          
          if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
            db.prepare('DELETE FROM api_tokens WHERE id = ?').run(tokenRecord.id);
            ctx.status = 401;
            ctx.body = { error: '访问令牌已过期', code: 'TOKEN_EXPIRED' };
            return;
          }
          
          const verified = jwt.verify(token, process.env.JWT_SECRET);
          apiKey = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(verified.api_key_id);
          tokenId = tokenRecord.id;
          
          if (!apiKey) {
            ctx.status = 401;
            ctx.body = { error: '关联的 API Key 不存在', code: 'API_KEY_NOT_FOUND' };
            return;
          }
          
          if (apiKey.status === 'banned') {
            ctx.status = 403;
            ctx.body = { 
              error: '关联的 API 密钥已被封禁', 
              code: 'API_KEY_BANNED',
              banned_reason: apiKey.banned_reason 
            };
            await logApiCall(ctx, apiKey, tokenId, startTime, '关联的 API 密钥已被封禁');
            return;
          }
          
          if (apiKey.status === 'inactive') {
            ctx.status = 403;
            ctx.body = { error: '关联的 API 密钥已被停用', code: 'API_KEY_INACTIVE' };
            await logApiCall(ctx, apiKey, tokenId, startTime, '关联的 API 密钥已被停用');
            return;
          }
          
          const rateLimitResult = checkRateLimit(apiKey);
          if (rateLimitResult.exceeded) {
            ctx.status = 429;
            ctx.body = { 
              error: `请求过于频繁，已超过 ${rateLimitResult.type} 限流（${rateLimitResult.limit}次）`, 
              code: 'RATE_LIMIT_EXCEEDED',
              retry_after: rateLimitResult.retry_after
            };
            ctx.set('Retry-After', rateLimitResult.retry_after);
            await logApiCall(ctx, apiKey, tokenId, startTime, '超过限流限制');
            return;
          }
          
          const requiredScope = extractScopesFromPath(ctx.path.replace('/api', ''), ctx.method);
          if (requiredScope) {
            const tokenScopes = JSON.parse(tokenRecord.scopes || '[]');
            if (!tokenScopes.includes(requiredScope)) {
              ctx.status = 403;
              ctx.body = { 
                error: `访问令牌缺少权限范围: ${requiredScope}`, 
                code: 'INSUFFICIENT_SCOPE',
                required_scope: requiredScope
              };
              await logApiCall(ctx, apiKey, tokenId, startTime, `访问令牌缺少权限范围: ${requiredScope}`);
              return;
            }
          }
          
          const user = db.prepare(`
            SELECT id, username, email, avatar, role, bio, is_creator_verified, creator_verified_at 
            FROM users WHERE id = ?
          `).get(apiKey.user_id);
          
          if (user && user.role !== 'banned') {
            ctx.state.user = user;
            ctx.state.api_key = apiKey;
          }
        }
      } catch (e) {
        if (e.name === 'TokenExpiredError') {
          ctx.status = 401;
          ctx.body = { error: '访问令牌已过期', code: 'TOKEN_EXPIRED' };
          return;
        }
      }
    }
    
    await next();
    
    if (apiKey) {
      await logApiCall(ctx, apiKey, tokenId, startTime);
    }
    
  } catch (error) {
    if (apiKey) {
      await logApiCall(ctx, apiKey, tokenId, startTime, error.message);
    }
    throw error;
  }
};

module.exports = { apiKeyAuth };
