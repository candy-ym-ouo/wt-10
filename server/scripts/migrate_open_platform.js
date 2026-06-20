require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移 API 开放平台数据库...');

db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    api_secret TEXT NOT NULL,
    scopes TEXT NOT NULL DEFAULT '[]',
    rate_limit_per_min INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,
    status TEXT DEFAULT 'active',
    expires_at DATETIME,
    last_used_at DATETIME,
    total_calls INTEGER DEFAULT 0,
    banned_reason TEXT,
    banned_at DATETIME,
    banned_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS api_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    scopes TEXT NOT NULL DEFAULT '[]',
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS api_call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key_id INTEGER,
    user_id INTEGER,
    token_id INTEGER,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    response_time_ms INTEGER,
    request_params TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (token_id) REFERENCES api_tokens(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS api_scopes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
  CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);
  CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
  CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_api_tokens_expires ON api_tokens(expires_at);
  CREATE INDEX IF NOT EXISTS idx_api_call_logs_key ON api_call_logs(api_key_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_api_call_logs_user ON api_call_logs(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_api_call_logs_endpoint ON api_call_logs(endpoint, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_api_call_logs_created ON api_call_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_api_scopes_category ON api_scopes(category);
`);

console.log('数据库表创建完成！');

const defaultScopes = [
  { scope: 'modules:read', name: '读取模块数据', description: '获取模块列表、详情、百科等信息', category: 'modules' },
  { scope: 'patches:read', name: '读取 Patch 数据', description: '获取 Patch 列表、详情、评论等信息', category: 'patches' },
  { scope: 'patches:write', name: '创建/修改 Patch', description: '创建新 Patch、更新自己的 Patch', category: 'patches' },
  { scope: 'articles:read', name: '读取专栏文章', description: '获取文章列表、详情等信息', category: 'articles' },
  { scope: 'articles:write', name: '创建/修改专栏', description: '创建新文章、更新自己的文章', category: 'articles' },
  { scope: 'users:read', name: '读取用户信息', description: '获取用户公开资料、作品列表等', category: 'users' },
  { scope: 'collections:read', name: '读取专题合集', description: '获取合集列表、详情等信息', category: 'collections' },
  { scope: 'challenge:read', name: '读取挑战赛数据', description: '获取赛季、排名、作品等信息', category: 'challenge' },
  { scope: 'downloads:read', name: '读取下载资源', description: '获取下载中心资源列表、详情', category: 'downloads' },
  { scope: 'products:read', name: '读取商品数据', description: '获取商品列表、详情等信息', category: 'products' },
  { scope: 'activities:read', name: '读取活动数据', description: '获取活动列表、详情、排名等信息', category: 'activities' },
  { scope: 'social:read', name: '读取社交数据', description: '获取关注、粉丝、收藏等公开信息', category: 'social' },
  { scope: 'stats:read', name: '读取统计数据', description: '获取公开的统计数据和趋势', category: 'stats' }
];

const insertScope = db.prepare(`
  INSERT OR IGNORE INTO api_scopes (scope, name, description, category)
  VALUES (?, ?, ?, ?)
`);

defaultScopes.forEach(s => {
  insertScope.run(s.scope, s.name, s.description, s.category);
});

console.log(`已初始化 ${defaultScopes.length} 个权限范围`);
console.log('API 开放平台数据库迁移完成！');
