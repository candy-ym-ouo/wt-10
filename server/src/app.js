require('dotenv').config();
const Koa = require('koa');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const db = require('./db');

const { authMiddleware } = require('./middleware/auth');
const { apiKeyAuth } = require('./middleware/apiKeyAuth');
const { initAuditTables, globalAuditMiddleware } = require('./middleware/audit');
const router = require('./routes');

const app = new Koa();
const PORT = process.env.PORT || 3000;

try {
  initAuditTables();
  console.log('audit_logs 表检查/创建完成');
} catch (e) {
  console.error('创建 audit_logs 表失败:', e);
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      from_user_id INTEGER,
      patch_id INTEGER,
      content TEXT,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
  `);
  console.log('notifications 表检查/创建完成');
} catch (e) {
  console.error('创建 notifications 表失败:', e);
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      cover_url TEXT,
      sort_order INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS collection_patches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER NOT NULL,
      patch_id INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(collection_id, patch_id),
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_collections_published ON collections(is_published, sort_order);
    CREATE INDEX IF NOT EXISTS idx_collection_patches_collection ON collection_patches(collection_id, sort_order);
  `);
  console.log('collections 表检查/创建完成');
} catch (e) {
  console.error('创建 collections 表失败:', e);
}

try {
  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  const hasVerifiedColumn = userColumns.some(col => col.name === 'is_creator_verified');
  if (!hasVerifiedColumn) {
    db.exec(`ALTER TABLE users ADD COLUMN is_creator_verified INTEGER DEFAULT 0`);
    db.exec(`ALTER TABLE users ADD COLUMN creator_verified_at DATETIME`);
    console.log('用户表已添加创作者认证字段');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS creator_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      real_name TEXT NOT NULL,
      id_card TEXT,
      phone TEXT,
      email TEXT,
      experience_years INTEGER DEFAULT 0,
      professional_field TEXT,
      bio TEXT,
      portfolio_url TEXT,
      social_links TEXT,
      id_card_front TEXT,
      id_card_back TEXT,
      certificate TEXT,
      status TEXT DEFAULT 'pending',
      review_note TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_verifications_user ON creator_verifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_verifications_status ON creator_verifications(status);
    CREATE INDEX IF NOT EXISTS idx_verifications_created ON creator_verifications(created_at DESC);
  `);
  console.log('creator_verifications 表检查/创建完成');
} catch (e) {
  console.error('创建 creator_verifications 表失败:', e);
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS download_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      file_type TEXT,
      resource_type TEXT DEFAULT 'other',
      patch_id INTEGER,
      version TEXT DEFAULT '1.0.0',
      user_id INTEGER NOT NULL,
      access_level TEXT DEFAULT 'public',
      risk_level TEXT DEFAULT 'low',
      risk_description TEXT,
      status TEXT DEFAULT 'pending',
      review_note TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      download_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_resources_status ON download_resources(status);
    CREATE INDEX IF NOT EXISTS idx_resources_user ON download_resources(user_id);
    CREATE INDEX IF NOT EXISTS idx_resources_type ON download_resources(resource_type);
    CREATE INDEX IF NOT EXISTS idx_resources_patch ON download_resources(patch_id);
    CREATE INDEX IF NOT EXISTS idx_resources_created ON download_resources(created_at DESC);

    CREATE TABLE IF NOT EXISTS download_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL,
      user_id INTEGER,
      ip_address TEXT,
      user_agent TEXT,
      downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (resource_id) REFERENCES download_resources(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_records_resource ON download_records(resource_id);
    CREATE INDEX IF NOT EXISTS idx_records_user ON download_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_records_downloaded ON download_records(downloaded_at DESC);
  `);
  console.log('download_resources / download_records 表检查/创建完成');
} catch (e) {
  console.error('创建下载资源中心表失败:', e);
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      target_user_id INTEGER,
      category TEXT NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      evidence_urls TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',
      handler_id INTEGER,
      handle_result TEXT,
      handle_note TEXT,
      handled_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (handler_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS report_punishments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      target_user_id INTEGER,
      punishment_type TEXT NOT NULL,
      punishment_duration INTEGER,
      punishment_reason TEXT,
      starts_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ends_at DATETIME,
      is_permanent INTEGER DEFAULT 0,
      handler_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES content_reports(id) ON DELETE CASCADE,
      FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (handler_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reports_status ON content_reports(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_target ON content_reports(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_reports_reporter ON content_reports(reporter_id);
    CREATE INDEX IF NOT EXISTS idx_reports_target_user ON content_reports(target_user_id);
    CREATE INDEX IF NOT EXISTS idx_punishments_user ON report_punishments(target_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_punishments_target ON report_punishments(target_type, target_id);
  `);
  console.log('content_reports / report_punishments 表检查/创建完成');
} catch (e) {
  console.error('创建举报中心表失败:', e);
}

try {
  const patchColumns = db.prepare("PRAGMA table_info(patches)").all();
  const hasIsPaidColumn = patchColumns.some(col => col.name === 'is_paid');
  if (!hasIsPaidColumn) {
    db.exec(`ALTER TABLE patches ADD COLUMN is_paid INTEGER DEFAULT 0`);
    db.exec(`ALTER TABLE patches ADD COLUMN price REAL DEFAULT 0`);
    db.exec(`ALTER TABLE patches ADD COLUMN preview_content TEXT`);
    console.log('patches 表已添加付费字段');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS patch_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patch_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL DEFAULT 0,
      original_price REAL,
      currency TEXT DEFAULT 'CNY',
      is_active INTEGER DEFAULT 1,
      is_discount INTEGER DEFAULT 0,
      discount_start_date DATETIME,
      discount_end_date DATETIME,
      sales_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      product_id INTEGER,
      patch_id INTEGER NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'CNY',
      platform_fee REAL DEFAULT 0,
      creator_earning REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      transaction_id TEXT,
      paid_at DATETIME,
      refunded_at DATETIME,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES patch_products(id) ON DELETE SET NULL,
      FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS patch_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      patch_id INTEGER NOT NULL,
      order_id INTEGER,
      permission_type TEXT DEFAULT 'purchase',
      status TEXT DEFAULT 'active',
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, patch_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS creator_earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      patch_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      order_amount REAL NOT NULL DEFAULT 0,
      platform_fee REAL NOT NULL DEFAULT 0,
      platform_fee_rate REAL NOT NULL DEFAULT 0.3,
      net_earning REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      settled_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS creator_withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER NOT NULL,
      withdrawal_no TEXT,
      amount REAL NOT NULL DEFAULT 0,
      actual_amount REAL,
      fee_amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'bank_transfer',
      payment_account TEXT,
      bank_name TEXT,
      bank_account TEXT,
      bank_account_name TEXT,
      alipay_account TEXT,
      wechat_account TEXT,
      status TEXT DEFAULT 'pending',
      review_note TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      transferred_at DATETIME,
      transfer_proof TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  const addMissingColumns = (table, columns) => {
    const existing = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    columns.forEach(col => {
      if (!existing.includes(col.name)) {
        try {
          db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.definition}`).run();
        } catch (e) {
          console.log(`跳过列 ${table}.${col.name}: ${e.message}`);
        }
      }
    });
  };

  addMissingColumns('patch_products', [
    { name: 'description', definition: 'TEXT' },
    { name: 'original_price', definition: 'REAL' },
    { name: 'currency', definition: "TEXT DEFAULT 'CNY'" },
    { name: 'is_discount', definition: 'INTEGER DEFAULT 0' },
    { name: 'discount_start_date', definition: 'DATETIME' },
    { name: 'discount_end_date', definition: 'DATETIME' },
    { name: 'sales_count', definition: 'INTEGER DEFAULT 0' },
    { name: 'created_at', definition: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
    { name: 'updated_at', definition: "DATETIME DEFAULT CURRENT_TIMESTAMP" }
  ]);

  addMissingColumns('orders', [
    { name: 'product_id', definition: 'INTEGER' },
    { name: 'currency', definition: "TEXT DEFAULT 'CNY'" },
    { name: 'platform_fee', definition: 'REAL DEFAULT 0' },
    { name: 'creator_earning', definition: 'REAL DEFAULT 0' },
    { name: 'transaction_id', definition: 'TEXT' },
    { name: 'paid_at', definition: 'DATETIME' },
    { name: 'refunded_at', definition: 'DATETIME' },
    { name: 'remark', definition: 'TEXT' },
    { name: 'created_at', definition: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
    { name: 'updated_at', definition: "DATETIME DEFAULT CURRENT_TIMESTAMP" }
  ]);

  addMissingColumns('patch_permissions', [
    { name: 'order_id', definition: 'INTEGER' },
    { name: 'permission_type', definition: "TEXT DEFAULT 'purchase'" },
    { name: 'status', definition: "TEXT DEFAULT 'active'" },
    { name: 'expires_at', definition: 'DATETIME' },
    { name: 'created_at', definition: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
    { name: 'updated_at', definition: "DATETIME DEFAULT CURRENT_TIMESTAMP" }
  ]);

  addMissingColumns('creator_earnings', [
    { name: 'user_id', definition: 'INTEGER NOT NULL DEFAULT 0' },
    { name: 'order_amount', definition: 'REAL NOT NULL DEFAULT 0' },
    { name: 'platform_fee_rate', definition: 'REAL NOT NULL DEFAULT 0.3' },
    { name: 'net_earning', definition: 'REAL NOT NULL DEFAULT 0' },
    { name: 'settled_at', definition: 'DATETIME' },
    { name: 'created_at', definition: "DATETIME DEFAULT CURRENT_TIMESTAMP" }
  ]);

  addMissingColumns('creator_withdrawals', [
    { name: 'withdrawal_no', definition: 'TEXT' },
    { name: 'actual_amount', definition: 'REAL' },
    { name: 'fee_amount', definition: 'REAL DEFAULT 0' },
    { name: 'payment_account', definition: 'TEXT' },
    { name: 'bank_name', definition: 'TEXT' },
    { name: 'bank_account', definition: 'TEXT' },
    { name: 'bank_account_name', definition: 'TEXT' },
    { name: 'alipay_account', definition: 'TEXT' },
    { name: 'wechat_account', definition: 'TEXT' },
    { name: 'reviewed_at', definition: 'DATETIME' },
    { name: 'transferred_at', definition: 'DATETIME' },
    { name: 'transfer_proof', definition: 'TEXT' },
    { name: 'created_at', definition: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
    { name: 'updated_at', definition: "DATETIME DEFAULT CURRENT_TIMESTAMP" }
  ]);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_patch ON patch_products(patch_id);
    CREATE INDEX IF NOT EXISTS idx_products_active ON patch_products(is_active);
    CREATE INDEX IF NOT EXISTS idx_products_price ON patch_products(price);

    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_patch ON orders(patch_id);
    CREATE INDEX IF NOT EXISTS idx_orders_no ON orders(order_no);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_permissions_user ON patch_permissions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_permissions_patch ON patch_permissions(patch_id, status);
    CREATE INDEX IF NOT EXISTS idx_permissions_expires ON patch_permissions(expires_at);

    CREATE INDEX IF NOT EXISTS idx_earnings_creator ON creator_earnings(creator_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_earnings_status ON creator_earnings(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_earnings_patch ON creator_earnings(patch_id);
    CREATE INDEX IF NOT EXISTS idx_earnings_order ON creator_earnings(order_id);

    CREATE INDEX IF NOT EXISTS idx_withdrawals_creator ON creator_withdrawals(creator_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON creator_withdrawals(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_created ON creator_withdrawals(created_at DESC);
  `);
  console.log('创作者收益模块表检查/创建完成');
} catch (e) {
  console.error('创建创作者收益模块表失败:', e);
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      content TEXT NOT NULL,
      cover_image TEXT,
      user_id INTEGER NOT NULL,
      tags TEXT,
      status TEXT DEFAULT 'pending',
      likes_count INTEGER DEFAULT 0,
      favorites_count INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 1,
      review_note TEXT,
      reviewed_at DATETIME,
      reviewed_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS article_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      parent_id INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS article_module_refs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      module_id INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(article_id, module_id),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS article_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      article_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, article_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS article_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      article_id INTEGER NOT NULL,
      folder TEXT DEFAULT 'default',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, article_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_user ON articles(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_public ON articles(is_public, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_article_comments_article ON article_comments(article_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_article_comments_user ON article_comments(user_id);
    CREATE INDEX IF NOT EXISTS idx_article_module_refs_article ON article_module_refs(article_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_article_module_refs_module ON article_module_refs(module_id);
    CREATE INDEX IF NOT EXISTS idx_article_likes_article ON article_likes(article_id);
    CREATE INDEX IF NOT EXISTS idx_article_favorites_user ON article_favorites(user_id);
  `);
  console.log('知识专栏模块表检查/创建完成');
} catch (e) {
  console.error('创建知识专栏模块表失败:', e);
}

try {
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
  console.log('API 开放平台表检查/创建完成');
  
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
  console.log('API 权限范围初始化完成');
} catch (e) {
  console.error('创建 API 开放平台表失败:', e);
}

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(bodyParser({
  jsonLimit: '10mb'
}));

app.use(globalAuditMiddleware);

app.use(async (ctx, next) => {
  try {
    await next();
    if (ctx.status === 404 && !ctx.body) {
      ctx.body = { error: '接口不存在' };
    }
  } catch (err) {
    console.error(err);
    ctx.status = err.status || 500;
    ctx.body = { error: err.message || '服务器内部错误' };
  }
});

app.use(authMiddleware);
app.use(apiKeyAuth);

app.use(router.routes());
app.use(router.allowedMethods());

try {
  const bcrypt = require('bcryptjs');
  const userStmt = db.prepare(`
    INSERT OR IGNORE INTO users (username, email, password, role, bio)
    VALUES (?, ?, ?, ?, ?)
  `);
  const adminResult = userStmt.run('admin', 'admin@patchvault.com', bcrypt.hashSync('admin123', 10), 'admin', '系统管理员');
  const operatorResult = userStmt.run('operator', 'operator@patchvault.com', bcrypt.hashSync('operator123', 10), 'operator', '运营人员');
  const auditorResult = userStmt.run('auditor', 'auditor@patchvault.com', bcrypt.hashSync('auditor123', 10), 'auditor', '审核员');

  const defaultCategories = ['comment', 'review', 'follow', 'activity', 'like', 'favorite', 'system'];
  const insertSubscription = db.prepare(`
    INSERT OR IGNORE INTO notification_subscriptions (user_id, category, enabled)
    VALUES (?, ?, 1)
  `);
  const allUsers = db.prepare('SELECT id FROM users').all();
  allUsers.forEach(user => {
    defaultCategories.forEach(category => {
      insertSubscription.run(user.id, category);
    });
  });

  if (adminResult.changes > 0) console.log('管理员账户已创建: admin / admin123');
  if (operatorResult.changes > 0) console.log('运营账户已创建: operator / operator123');
  if (auditorResult.changes > 0) console.log('审核员账户已创建: auditor / auditor123');
} catch (e) {
  console.error('初始化默认账户失败:', e);
}

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════════╗
  ║                                                        ║
  ║   Patch Vault Server 启动成功!                         ║
  ║   服务地址: http://localhost:${PORT}                       ║
  ║   API 前缀: http://localhost:${PORT}/api                   ║
  ║                                                        ║
  ║   管理员账户: admin / admin123                         ║
  ║   运营账户:   operator / operator123                   ║
  ║   审核员账户: auditor / auditor123                     ║
  ║                                                        ║
  ╚════════════════════════════════════════════════════════╝
  `);
});
