const db = require('../db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const generateApiKey = () => {
  return 'pk_' + crypto.randomBytes(24).toString('hex');
};

const generateApiSecret = () => {
  return 'sk_' + crypto.randomBytes(32).toString('hex');
};

const formatApiKey = (row) => {
  if (!row) return null;
  return {
    ...row,
    scopes: row.scopes ? JSON.parse(row.scopes) : [],
    masked_secret: 'sk_' + '*'.repeat(28) + row.api_secret?.slice(-4)
  };
};

const formatApiKeyWithSecret = (row) => {
  if (!row) return null;
  return {
    ...row,
    scopes: row.scopes ? JSON.parse(row.scopes) : []
  };
};

exports.getScopes = async (ctx) => {
  const scopes = db.prepare('SELECT * FROM api_scopes ORDER BY category, id').all();
  const categories = {};
  scopes.forEach(s => {
    if (!categories[s.category]) {
      categories[s.category] = [];
    }
    categories[s.category].push(s);
  });
  ctx.body = { scopes, categories };
};

exports.getMyKeys = async (ctx) => {
  const userId = ctx.state.user.id;
  const { status } = ctx.query;
  
  let sql = 'SELECT * FROM api_keys WHERE user_id = ?';
  const params = [userId];
  
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY created_at DESC';
  const keys = db.prepare(sql).all(...params);
  
  ctx.body = keys.map(formatApiKey);
};

exports.createApiKey = async (ctx) => {
  const userId = ctx.state.user.id;
  const { name, scopes = [], rate_limit_per_min = 60, rate_limit_per_hour = 1000, rate_limit_per_day = 10000, expires_days } = ctx.request.body;
  
  if (!name || !name.trim()) {
    ctx.status = 400;
    ctx.body = { error: '请输入密钥名称' };
    return;
  }
  
  if (!Array.isArray(scopes)) {
    ctx.status = 400;
    ctx.body = { error: '权限范围格式错误' };
    return;
  }
  
  const validScopes = db.prepare('SELECT scope FROM api_scopes').all().map(s => s.scope);
  const invalidScopes = scopes.filter(s => !validScopes.includes(s));
  if (invalidScopes.length > 0) {
    ctx.status = 400;
    ctx.body = { error: `无效的权限范围: ${invalidScopes.join(', ')}` };
    return;
  }
  
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?').get(userId).count;
  if (existingCount >= 10) {
    ctx.status = 400;
    ctx.body = { error: '最多只能创建 10 个 API 密钥' };
    return;
  }
  
  const apiKey = generateApiKey();
  const apiSecret = generateApiSecret();
  const hashedSecret = crypto.createHash('sha256').update(apiSecret).digest('hex');
  
  let expiresAt = null;
  if (expires_days && expires_days > 0) {
    expiresAt = new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString();
  }
  
  const stmt = db.prepare(`
    INSERT INTO api_keys (user_id, name, api_key, api_secret, scopes, rate_limit_per_min, rate_limit_per_hour, rate_limit_per_day, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(userId, name.trim(), apiKey, hashedSecret, JSON.stringify(scopes), rate_limit_per_min, rate_limit_per_hour, rate_limit_per_day, expiresAt);
  
  const newKey = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(result.lastInsertRowid);
  newKey.api_secret_plain = apiSecret;
  
  ctx.body = formatApiKeyWithSecret(newKey);
};

exports.updateApiKey = async (ctx) => {
  const userId = ctx.state.user.id;
  const keyId = parseInt(ctx.params.id);
  const { name, scopes, rate_limit_per_min, rate_limit_per_hour, rate_limit_per_day, status } = ctx.request.body;
  
  const key = db.prepare('SELECT * FROM api_keys WHERE id = ? AND user_id = ?').get(keyId, userId);
  if (!key) {
    ctx.status = 404;
    ctx.body = { error: 'API 密钥不存在' };
    return;
  }
  
  if (key.status === 'banned') {
    ctx.status = 400;
    ctx.body = { error: '该密钥已被封禁，无法修改' };
    return;
  }
  
  const updates = [];
  const params = [];
  
  if (name !== undefined && name.trim()) {
    updates.push('name = ?');
    params.push(name.trim());
  }
  
  if (scopes !== undefined) {
    if (!Array.isArray(scopes)) {
      ctx.status = 400;
      ctx.body = { error: '权限范围格式错误' };
      return;
    }
    const validScopes = db.prepare('SELECT scope FROM api_scopes').all().map(s => s.scope);
    const invalidScopes = scopes.filter(s => !validScopes.includes(s));
    if (invalidScopes.length > 0) {
      ctx.status = 400;
      ctx.body = { error: `无效的权限范围: ${invalidScopes.join(', ')}` };
      return;
    }
    updates.push('scopes = ?');
    params.push(JSON.stringify(scopes));
  }
  
  if (rate_limit_per_min !== undefined) {
    updates.push('rate_limit_per_min = ?');
    params.push(Math.max(1, rate_limit_per_min));
  }
  if (rate_limit_per_hour !== undefined) {
    updates.push('rate_limit_per_hour = ?');
    params.push(Math.max(1, rate_limit_per_hour));
  }
  if (rate_limit_per_day !== undefined) {
    updates.push('rate_limit_per_day = ?');
    params.push(Math.max(1, rate_limit_per_day));
  }
  
  if (status !== undefined && ['active', 'inactive'].includes(status)) {
    updates.push('status = ?');
    params.push(status);
  }
  
  if (updates.length === 0) {
    ctx.status = 400;
    ctx.body = { error: '没有需要更新的内容' };
    return;
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(keyId);
  
  db.prepare(`UPDATE api_keys SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  
  const updatedKey = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(keyId);
  ctx.body = formatApiKey(updatedKey);
};

exports.deleteApiKey = async (ctx) => {
  const userId = ctx.state.user.id;
  const keyId = parseInt(ctx.params.id);
  
  const key = db.prepare('SELECT * FROM api_keys WHERE id = ? AND user_id = ?').get(keyId, userId);
  if (!key) {
    ctx.status = 404;
    ctx.body = { error: 'API 密钥不存在' };
    return;
  }
  
  db.prepare('DELETE FROM api_keys WHERE id = ?').run(keyId);
  db.prepare('DELETE FROM api_tokens WHERE api_key_id = ?').run(keyId);
  
  ctx.body = { success: true };
};

exports.generateToken = async (ctx) => {
  const userId = ctx.state.user.id;
  const { api_key, api_secret, scopes: requestedScopes, expires_in = 3600 } = ctx.request.body;
  
  if (!api_key || !api_secret) {
    ctx.status = 400;
    ctx.body = { error: '请提供 API Key 和 API Secret' };
    return;
  }
  
  const key = db.prepare('SELECT * FROM api_keys WHERE api_key = ? AND user_id = ?').get(api_key, userId);
  if (!key) {
    ctx.status = 401;
    ctx.body = { error: 'API Key 无效' };
    return;
  }
  
  const hashedSecret = crypto.createHash('sha256').update(api_secret).digest('hex');
  if (key.api_secret !== hashedSecret) {
    ctx.status = 401;
    ctx.body = { error: 'API Secret 无效' };
    return;
  }
  
  if (key.status === 'banned') {
    ctx.status = 403;
    ctx.body = { error: '该 API 密钥已被封禁', banned: true, banned_reason: key.banned_reason };
    return;
  }
  
  if (key.status === 'inactive') {
    ctx.status = 403;
    ctx.body = { error: '该 API 密钥已被停用' };
    return;
  }
  
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    ctx.status = 403;
    ctx.body = { error: '该 API 密钥已过期' };
    return;
  }
  
  const keyScopes = JSON.parse(key.scopes || '[]');
  let grantedScopes = keyScopes;
  if (requestedScopes && Array.isArray(requestedScopes)) {
    grantedScopes = requestedScopes.filter(s => keyScopes.includes(s));
  }
  
  const token = jwt.sign(
    { 
      type: 'api_token', 
      api_key_id: key.id, 
      user_id: userId, 
      scopes: grantedScopes 
    },
    process.env.JWT_SECRET,
    { expiresIn: Math.min(expires_in, 86400 * 7) }
  );
  
  const decoded = jwt.decode(token);
  db.prepare(`
    INSERT INTO api_tokens (api_key_id, user_id, token, scopes, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(key.id, userId, token, JSON.stringify(grantedScopes), new Date(decoded.exp * 1000).toISOString());
  
  db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(key.id);
  
  ctx.body = {
    access_token: token,
    token_type: 'Bearer',
    expires_in: decoded.exp - Math.floor(Date.now() / 1000),
    scopes: grantedScopes
  };
};

exports.getMyCallLogs = async (ctx) => {
  const userId = ctx.state.user.id;
  const { api_key_id, page = 1, page_size = 20, start_date, end_date, status_code, endpoint } = ctx.query;
  
  const p = parseInt(page);
  const ps = parseInt(page_size);
  const offset = (p - 1) * ps;
  
  let sql = `
    SELECT l.*, k.name as api_key_name
    FROM api_call_logs l
    LEFT JOIN api_keys k ON l.api_key_id = k.id
    WHERE l.user_id = ?
  `;
  const params = [userId];
  
  if (api_key_id) {
    sql += ' AND l.api_key_id = ?';
    params.push(parseInt(api_key_id));
  }
  if (start_date) {
    sql += ' AND l.created_at >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND l.created_at <= ?';
    params.push(end_date);
  }
  if (status_code) {
    sql += ' AND l.status_code = ?';
    params.push(parseInt(status_code));
  }
  if (endpoint) {
    sql += ' AND l.endpoint LIKE ?';
    params.push(`%${endpoint}%`);
  }
  
  const countSql = sql.replace('SELECT l.*, k.name as api_key_name', 'SELECT COUNT(*) as count');
  const total = db.prepare(countSql).get(...params).count;
  
  sql += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
  params.push(ps, offset);
  
  const logs = db.prepare(sql).all(...params);
  
  ctx.body = {
    logs,
    pagination: {
      page: p,
      page_size: ps,
      total,
      total_pages: Math.ceil(total / ps)
    }
  };
};

exports.getCallStats = async (ctx) => {
  const userId = ctx.state.user.id;
  const { api_key_id, days = 7 } = ctx.query;
  
  const d = parseInt(days);
  const params = [userId];
  const sqlParams = [userId];
  
  if (api_key_id) {
    params.push(parseInt(api_key_id));
    sqlParams.push(parseInt(api_key_id));
  }
  
  const totalCalls = db.prepare(`
    SELECT COUNT(*) as count, 
           SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success_count,
           SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
           AVG(response_time_ms) as avg_response_time
    FROM api_call_logs 
    WHERE user_id = ?
    ${api_key_id ? ' AND api_key_id = ?' : ''}
    AND created_at >= datetime('now', ?)
  `).get(...params, `-${d} days`);
  
  const dailyStats = db.prepare(`
    SELECT 
      date(created_at) as date,
      COUNT(*) as calls,
      SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success_calls,
      SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_calls
    FROM api_call_logs 
    WHERE user_id = ?
    ${api_key_id ? ' AND api_key_id = ?' : ''}
    AND created_at >= datetime('now', ?)
    GROUP BY date(created_at)
    ORDER BY date DESC
  `).all(...params, `-${d} days`);
  
  const endpointStats = db.prepare(`
    SELECT 
      endpoint,
      method,
      COUNT(*) as calls,
      SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success_calls
    FROM api_call_logs 
    WHERE user_id = ?
    ${api_key_id ? ' AND api_key_id = ?' : ''}
    AND created_at >= datetime('now', ?)
    GROUP BY endpoint, method
    ORDER BY calls DESC
    LIMIT 10
  `).all(...params, `-${d} days`);
  
  ctx.body = {
    summary: totalCalls,
    daily: dailyStats,
    endpoints: endpointStats
  };
};

exports.adminGetAllKeys = async (ctx) => {
  const { status, user_id, keyword, page = 1, page_size = 20 } = ctx.query;
  
  const p = parseInt(page);
  const ps = parseInt(page_size);
  const offset = (p - 1) * ps;
  
  let sql = `
    SELECT k.*, u.username, u.email, u.avatar
    FROM api_keys k
    LEFT JOIN users u ON k.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (status) {
    sql += ' AND k.status = ?';
    params.push(status);
  }
  if (user_id) {
    sql += ' AND k.user_id = ?';
    params.push(parseInt(user_id));
  }
  if (keyword) {
    sql += ' AND (k.name LIKE ? OR k.api_key LIKE ? OR u.username LIKE ? OR u.email LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }
  
  const countSql = sql.replace('SELECT k.*, u.username, u.email, u.avatar', 'SELECT COUNT(*) as count');
  const total = db.prepare(countSql).get(...params).count;
  
  sql += ' ORDER BY k.created_at DESC LIMIT ? OFFSET ?';
  params.push(ps, offset);
  
  const keys = db.prepare(sql).all(...params);
  
  ctx.body = {
    keys: keys.map(formatApiKey),
    pagination: {
      page: p,
      page_size: ps,
      total,
      total_pages: Math.ceil(total / ps)
    }
  };
};

exports.adminGetKeyDetail = async (ctx) => {
  const keyId = parseInt(ctx.params.id);
  
  const key = db.prepare(`
    SELECT k.*, u.username, u.email, u.avatar
    FROM api_keys k
    LEFT JOIN users u ON k.user_id = u.id
    WHERE k.id = ?
  `).get(keyId);
  
  if (!key) {
    ctx.status = 404;
    ctx.body = { error: 'API 密钥不存在' };
    return;
  }
  
  ctx.body = formatApiKey(key);
};

exports.adminBanKey = async (ctx) => {
  const keyId = parseInt(ctx.params.id);
  const adminId = ctx.state.user.id;
  const { reason } = ctx.request.body;
  
  const key = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(keyId);
  if (!key) {
    ctx.status = 404;
    ctx.body = { error: 'API 密钥不存在' };
    return;
  }
  
  if (key.status === 'banned') {
    ctx.status = 400;
    ctx.body = { error: '该密钥已被封禁' };
    return;
  }
  
  db.prepare(`
    UPDATE api_keys 
    SET status = 'banned', banned_reason = ?, banned_at = CURRENT_TIMESTAMP, banned_by = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(reason || '违规使用', adminId, keyId);
  
  db.prepare('DELETE FROM api_tokens WHERE api_key_id = ?').run(keyId);
  
  const updatedKey = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(keyId);
  ctx.body = formatApiKey(updatedKey);
};

exports.adminUnbanKey = async (ctx) => {
  const keyId = parseInt(ctx.params.id);
  
  const key = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(keyId);
  if (!key) {
    ctx.status = 404;
    ctx.body = { error: 'API 密钥不存在' };
    return;
  }
  
  if (key.status !== 'banned') {
    ctx.status = 400;
    ctx.body = { error: '该密钥未被封禁' };
    return;
  }
  
  db.prepare(`
    UPDATE api_keys 
    SET status = 'active', banned_reason = NULL, banned_at = NULL, banned_by = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(keyId);
  
  const updatedKey = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(keyId);
  ctx.body = formatApiKey(updatedKey);
};

exports.adminUpdateRateLimit = async (ctx) => {
  const keyId = parseInt(ctx.params.id);
  const { rate_limit_per_min, rate_limit_per_hour, rate_limit_per_day } = ctx.request.body;
  
  const key = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(keyId);
  if (!key) {
    ctx.status = 404;
    ctx.body = { error: 'API 密钥不存在' };
    return;
  }
  
  const updates = [];
  const params = [];
  
  if (rate_limit_per_min !== undefined) {
    updates.push('rate_limit_per_min = ?');
    params.push(Math.max(1, rate_limit_per_min));
  }
  if (rate_limit_per_hour !== undefined) {
    updates.push('rate_limit_per_hour = ?');
    params.push(Math.max(1, rate_limit_per_hour));
  }
  if (rate_limit_per_day !== undefined) {
    updates.push('rate_limit_per_day = ?');
    params.push(Math.max(1, rate_limit_per_day));
  }
  
  if (updates.length === 0) {
    ctx.status = 400;
    ctx.body = { error: '没有需要更新的限流配置' };
    return;
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(keyId);
  
  db.prepare(`UPDATE api_keys SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  
  const updatedKey = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(keyId);
  ctx.body = formatApiKey(updatedKey);
};

exports.adminGetCallLogs = async (ctx) => {
  const { api_key_id, user_id, page = 1, page_size = 20, start_date, end_date, status_code, endpoint, keyword } = ctx.query;
  
  const p = parseInt(page);
  const ps = parseInt(page_size);
  const offset = (p - 1) * ps;
  
  let sql = `
    SELECT l.*, k.name as api_key_name, u.username
    FROM api_call_logs l
    LEFT JOIN api_keys k ON l.api_key_id = k.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (api_key_id) {
    sql += ' AND l.api_key_id = ?';
    params.push(parseInt(api_key_id));
  }
  if (user_id) {
    sql += ' AND l.user_id = ?';
    params.push(parseInt(user_id));
  }
  if (start_date) {
    sql += ' AND l.created_at >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND l.created_at <= ?';
    params.push(end_date);
  }
  if (status_code) {
    sql += ' AND l.status_code = ?';
    params.push(parseInt(status_code));
  }
  if (endpoint) {
    sql += ' AND l.endpoint LIKE ?';
    params.push(`%${endpoint}%`);
  }
  if (keyword) {
    sql += ' AND (u.username LIKE ? OR k.name LIKE ? OR l.endpoint LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  
  const countSql = sql.replace('SELECT l.*, k.name as api_key_name, u.username', 'SELECT COUNT(*) as count');
  const total = db.prepare(countSql).get(...params).count;
  
  sql += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
  params.push(ps, offset);
  
  const logs = db.prepare(sql).all(...params);
  
  ctx.body = {
    logs,
    pagination: {
      page: p,
      page_size: ps,
      total,
      total_pages: Math.ceil(total / ps)
    }
  };
};

exports.adminGetPlatformStats = async (ctx) => {
  const { days = 30 } = ctx.query;
  const d = parseInt(days);
  
  const totalKeys = db.prepare('SELECT COUNT(*) as count FROM api_keys').get().count;
  const activeKeys = db.prepare("SELECT COUNT(*) as count FROM api_keys WHERE status = 'active'").get().count;
  const bannedKeys = db.prepare("SELECT COUNT(*) as count FROM api_keys WHERE status = 'banned'").get().count;
  
  const totalCalls = db.prepare(`
    SELECT COUNT(*) as count,
           SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success_count,
           SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
    FROM api_call_logs
    WHERE created_at >= datetime('now', ?)
  `).get(`-${d} days`);
  
  const dailyStats = db.prepare(`
    SELECT 
      date(created_at) as date,
      COUNT(DISTINCT user_id) as active_users,
      COUNT(DISTINCT api_key_id) as active_keys,
      COUNT(*) as calls,
      SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success_calls
    FROM api_call_logs
    WHERE created_at >= datetime('now', ?)
    GROUP BY date(created_at)
    ORDER BY date DESC
  `).all(`-${d} days`);
  
  const topKeys = db.prepare(`
    SELECT 
      k.id, k.name, u.username,
      COUNT(l.id) as calls
    FROM api_keys k
    LEFT JOIN users u ON k.user_id = u.id
    LEFT JOIN api_call_logs l ON k.id = l.api_key_id AND l.created_at >= datetime('now', ?)
    GROUP BY k.id
    ORDER BY calls DESC
    LIMIT 10
  `).all(`-${d} days`);
  
  const topEndpoints = db.prepare(`
    SELECT 
      endpoint, method,
      COUNT(*) as calls,
      AVG(response_time_ms) as avg_response_time
    FROM api_call_logs
    WHERE created_at >= datetime('now', ?)
    GROUP BY endpoint, method
    ORDER BY calls DESC
    LIMIT 10
  `).all(`-${d} days`);
  
  ctx.body = {
    overview: {
      total_keys: totalKeys,
      active_keys: activeKeys,
      banned_keys: bannedKeys,
      ...totalCalls
    },
    daily: dailyStats,
    top_keys: topKeys,
    top_endpoints: topEndpoints
  };
};
