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

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS i18n_translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      translation_key TEXT NOT NULL UNIQUE,
      zh_cn TEXT,
      en_us TEXT,
      category TEXT DEFAULT 'general',
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_i18n_key ON i18n_translations(translation_key);
    CREATE INDEX IF NOT EXISTS idx_i18n_category ON i18n_translations(category);
    CREATE INDEX IF NOT EXISTS idx_i18n_active ON i18n_translations(is_active);
  `);
  console.log('i18n_translations 表检查/创建完成');

  const defaultTranslations = [
    ['common.submit', '提交', 'Submit', 'common', '通用提交按钮'],
    ['common.cancel', '取消', 'Cancel', 'common', '通用取消按钮'],
    ['common.confirm', '确认', 'Confirm', 'common', '通用确认按钮'],
    ['common.delete', '删除', 'Delete', 'common', '通用删除按钮'],
    ['common.edit', '编辑', 'Edit', 'common', '通用编辑按钮'],
    ['common.save', '保存', 'Save', 'common', '通用保存按钮'],
    ['common.search', '搜索', 'Search', 'common', '通用搜索'],
    ['common.reset', '重置', 'Reset', 'common', '通用重置'],
    ['common.add', '新增', 'Add', 'common', '通用新增'],
    ['common.export', '导出', 'Export', 'common', '通用导出'],
    ['common.import', '导入', 'Import', 'common', '通用导入'],
    ['common.refresh', '刷新', 'Refresh', 'common', '通用刷新'],
    ['common.back', '返回', 'Back', 'common', '通用返回'],
    ['common.close', '关闭', 'Close', 'common', '通用关闭'],
    ['common.loading', '加载中...', 'Loading...', 'common', '通用加载提示'],
    ['common.success', '操作成功', 'Success', 'common', '通用成功提示'],
    ['common.error', '操作失败', 'Error', 'common', '通用错误提示'],
    ['common.warning', '警告', 'Warning', 'common', '通用警告'],
    ['common.info', '提示', 'Info', 'common', '通用信息提示'],
    ['common.confirm_delete', '确定要删除吗？', 'Are you sure you want to delete?', 'common', '删除确认提示'],
    ['common.no_data', '暂无数据', 'No Data', 'common', '空数据提示'],
    ['common.total', '共', 'Total', 'common', '总数前缀'],
    ['common.items', '条', 'items', 'common', '数量单位'],
    ['common.actions', '操作', 'Actions', 'common', '表格操作列'],
    ['common.status', '状态', 'Status', 'common', '通用状态'],
    ['common.created_at', '创建时间', 'Created At', 'common', '创建时间'],
    ['common.updated_at', '更新时间', 'Updated At', 'common', '更新时间'],
    ['common.active', '启用', 'Active', 'common', '启用状态'],
    ['common.inactive', '禁用', 'Inactive', 'common', '禁用状态'],
    ['common.yes', '是', 'Yes', 'common', '是'],
    ['common.no', '否', 'No', 'common', '否'],
    ['common.all', '全部', 'All', 'common', '全部'],
    ['common.unknown', '未知', 'Unknown', 'common', '未知'],
    ['common.optional', '可选', 'Optional', 'common', '可选'],
    ['common.required', '必填', 'Required', 'common', '必填'],
    ['common.select', '请选择', 'Please Select', 'common', '选择提示'],
    ['common.input', '请输入', 'Please Input', 'common', '输入提示'],
    ['common.operation_success', '操作成功', 'Operation Successful', 'common', '操作成功'],
    ['common.operation_failed', '操作失败', 'Operation Failed', 'common', '操作失败'],
    ['common.network_error', '网络错误，请稍后重试', 'Network error, please try again later', 'common', '网络错误'],
    ['common.server_error', '服务器错误', 'Server Error', 'common', '服务器错误'],
    ['common.permission_denied', '权限不足', 'Permission Denied', 'common', '权限不足'],
    ['common.not_found', '资源不存在', 'Not Found', 'common', '资源不存在'],
    ['common.unauthorized', '未授权，请先登录', 'Unauthorized, please login first', 'common', '未授权'],
    ['admin.dashboard', '仪表盘', 'Dashboard', 'admin', '仪表盘'],
    ['admin.user_management', '用户管理', 'User Management', 'admin', '用户管理'],
    ['admin.patch_management', 'Patch 管理', 'Patch Management', 'admin', 'Patch 管理'],
    ['admin.module_management', '模块管理', 'Module Management', 'admin', '模块管理'],
    ['admin.article_management', '专栏管理', 'Article Management', 'admin', '专栏管理'],
    ['admin.manufacturer_management', '厂商管理', 'Manufacturer Management', 'admin', '厂商管理'],
    ['admin.collection_management', '专题策展', 'Collection Management', 'admin', '专题策展'],
    ['admin.activity_management', '活动管理', 'Activity Management', 'admin', '活动管理'],
    ['admin.challenge_management', '挑战赛管理', 'Challenge Management', 'admin', '挑战赛管理'],
    ['admin.i18n_management', '国际化管理', 'I18n Management', 'admin', '国际化管理'],
    ['i18n.translation_key', '翻译 Key', 'Translation Key', 'i18n', '翻译键名'],
    ['i18n.chinese', '中文', 'Chinese', 'i18n', '中文翻译'],
    ['i18n.english', '英文', 'English', 'i18n', '英文翻译'],
    ['i18n.category', '分类', 'Category', 'i18n', '翻译分类'],
    ['i18n.description', '描述', 'Description', 'i18n', '翻译描述'],
    ['i18n.add_translation', '新增翻译', 'Add Translation', 'i18n', '新增翻译'],
    ['i18n.edit_translation', '编辑翻译', 'Edit Translation', 'i18n', '编辑翻译'],
    ['i18n.batch_import', '批量导入', 'Batch Import', 'i18n', '批量导入'],
    ['i18n.export_all', '导出全部', 'Export All', 'i18n', '导出全部'],
    ['i18n.search_key', '搜索 Key 或内容', 'Search Key or Content', 'i18n', '搜索翻译'],
    ['i18n.filter_category', '分类筛选', 'Filter by Category', 'i18n', '分类筛选'],
    ['i18n.category_general', '通用', 'General', 'i18n', '通用分类'],
    ['i18n.category_admin', '后台', 'Admin', 'i18n', '后台分类'],
    ['i18n.category_front', '前台', 'Frontend', 'i18n', '前台分类'],
    ['i18n.category_validation', '校验', 'Validation', 'i18n', '校验分类'],
    ['i18n.category_i18n', '国际化', 'I18n', 'i18n', '国际化分类'],
    ['i18n.missing_translation', '翻译缺失', 'Missing Translation', 'i18n', '翻译缺失'],
    ['i18n.auto_generate', '自动生成', 'Auto Generate', 'i18n', '自动生成'],
    ['user.login', '登录', 'Login', 'auth', '登录'],
    ['user.register', '注册', 'Register', 'auth', '注册'],
    ['user.logout', '退出登录', 'Logout', 'auth', '退出登录'],
    ['user.username', '用户名', 'Username', 'auth', '用户名'],
    ['user.email', '邮箱', 'Email', 'auth', '邮箱'],
    ['user.password', '密码', 'Password', 'auth', '密码'],
    ['user.confirm_password', '确认密码', 'Confirm Password', 'auth', '确认密码'],
    ['user.remember_me', '记住我', 'Remember Me', 'auth', '记住我'],
    ['user.forgot_password', '忘记密码', 'Forgot Password', 'auth', '忘记密码'],
    ['user.login_success', '登录成功', 'Login Successful', 'auth', '登录成功'],
    ['user.register_success', '注册成功', 'Registration Successful', 'auth', '注册成功'],
    ['user.logout_success', '已退出登录', 'Logged Out Successfully', 'auth', '已退出登录'],
    ['user.welcome_back', '欢迎回来', 'Welcome Back', 'auth', '欢迎回来'],
    ['validation.required', '该项为必填项', 'This field is required', 'validation', '必填校验'],
    ['validation.email', '请输入有效的邮箱地址', 'Please enter a valid email', 'validation', '邮箱校验'],
    ['validation.min_length', '最少需要 {min} 个字符', 'Minimum {min} characters required', 'validation', '最小长度校验'],
    ['validation.max_length', '最多允许 {max} 个字符', 'Maximum {max} characters allowed', 'validation', '最大长度校验'],
    ['validation.password_match', '两次密码输入不一致', 'Passwords do not match', 'validation', '密码匹配校验'],
    ['validation.username_exists', '用户名已存在', 'Username already exists', 'validation', '用户名已存在'],
    ['validation.email_exists', '邮箱已注册', 'Email already registered', 'validation', '邮箱已注册'],
    ['validation.invalid_credentials', '用户名或密码错误', 'Invalid username or password', 'validation', '凭据错误']
  ];

  const insertTranslation = db.prepare(`
    INSERT OR IGNORE INTO i18n_translations (translation_key, zh_cn, en_us, category, description, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  defaultTranslations.forEach(t => insertTranslation.run(...t));
  console.log(`已初始化 ${defaultTranslations.length} 条默认翻译条目`);
} catch (e) {
  console.error('创建 i18n 翻译表失败:', e);
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_hot_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      search_count INTEGER DEFAULT 1,
      is_pinned INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(keyword)
    );

    CREATE TABLE IF NOT EXISTS search_ad_placements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      link_url TEXT NOT NULL,
      link_type TEXT DEFAULT 'internal',
      position TEXT DEFAULT 'search_top',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      start_time DATETIME,
      end_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS search_histories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      keyword TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_hot_queries_active ON search_hot_queries(is_active, is_pinned, search_count DESC);
    CREATE INDEX IF NOT EXISTS idx_ad_placements_active ON search_ad_placements(is_active, position, sort_order);
    CREATE INDEX IF NOT EXISTS idx_search_histories_user ON search_histories(user_id, created_at DESC);
  `);
  console.log('搜索中心表检查/创建完成');

  const searchHotCount = db.prepare('SELECT COUNT(*) as cnt FROM search_hot_queries').get().cnt;
  if (searchHotCount === 0) {
    const hotKeywords = [
      ['Moog', 128, 1],
      ['氛围 Pad', 96, 0],
      ['贝斯 Bass', 87, 0],
      ['Mother-32', 74, 0],
      ['Mutable Instruments', 65, 0],
      ['鼓点 Rhythm', 58, 0],
      ['主奏 Lead', 52, 0],
      ['Make Noise', 45, 0],
      ['Clouds', 38, 0],
      ['夏日合成器', 31, 0]
    ];
    const insertHot = db.prepare(`
      INSERT INTO search_hot_queries (keyword, search_count, is_pinned, is_active) VALUES (?, ?, ?, 1)
    `);
    hotKeywords.forEach(([kw, cnt, pinned]) => insertHot.run(kw, cnt, pinned));
    console.log(`已初始化 ${hotKeywords.length} 条默认热搜词`);
  }

  const searchAdsCount = db.prepare('SELECT COUNT(*) as cnt FROM search_ad_placements').get().cnt;
  if (searchAdsCount === 0) {
    const insertAd = db.prepare(`
      INSERT INTO search_ad_placements (title, description, image_url, link_url, link_type, position, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertAd.run(
      '🎹 探索精选合成器 Patch',
      '浏览社区最受欢迎的音色预设，激发你的创作灵感',
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
      '/patches',
      'internal',
      'search_top',
      0
    );
    insertAd.run(
      '🔥 夏日氛围合成器专题',
      '精选适合夏日聆听的氛围合成器 Patch 合集',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
      '/collections/1',
      'internal',
      'search_top',
      1
    );
    console.log('已初始化 2 条默认搜索运营位');
  }
} catch (e) {
  console.error('创建搜索中心表失败:', e);
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS achievement_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '🏆',
      category TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      threshold INTEGER NOT NULL,
      level INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_achievement_rules_category ON achievement_rules(category);
    CREATE INDEX IF NOT EXISTS idx_achievement_rules_metric ON achievement_rules(metric_type);
    CREATE INDEX IF NOT EXISTS idx_achievement_rules_active ON achievement_rules(is_active, sort_order);

    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      achievement_rule_id INTEGER NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      progress INTEGER DEFAULT 0,
      is_unlocked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, achievement_rule_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_rule_id) REFERENCES achievement_rules(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(user_id, is_unlocked);
    CREATE INDEX IF NOT EXISTS idx_user_achievements_rule ON user_achievements(achievement_rule_id);
  `);
  console.log('成就体系表检查/创建完成');

  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  const hasTotalPatches = userColumns.some(col => col.name === 'total_patches');
  const hasTotalLikes = userColumns.some(col => col.name === 'total_likes');
  const hasTotalFavorites = userColumns.some(col => col.name === 'total_favorites');

  if (!hasTotalPatches) {
    db.exec(`ALTER TABLE users ADD COLUMN total_patches INTEGER DEFAULT 0`);
    console.log('用户表已添加 total_patches 字段');
  }
  if (!hasTotalLikes) {
    db.exec(`ALTER TABLE users ADD COLUMN total_likes INTEGER DEFAULT 0`);
    console.log('用户表已添加 total_likes 字段');
  }
  if (!hasTotalFavorites) {
    db.exec(`ALTER TABLE users ADD COLUMN total_favorites INTEGER DEFAULT 0`);
    console.log('用户表已添加 total_favorites 字段');
  }

  const ruleCount = db.prepare('SELECT COUNT(*) as cnt FROM achievement_rules').get().cnt;
  if (ruleCount === 0) {
    const defaultRules = [
      ['初出茅庐', '发布第 1 个 Patch', '🌱', 'patch', 'patches_count', 1, 1, 1],
      ['小有名气', '发布 5 个 Patch', '⭐', 'patch', 'patches_count', 5, 2, 2],
      ['创作达人', '发布 20 个 Patch', '🎨', 'patch', 'patches_count', 20, 3, 3],
      ['资深创作者', '发布 50 个 Patch', '🏆', 'patch', 'patches_count', 50, 4, 4],
      ['传奇大师', '发布 100 个 Patch', '👑', 'patch', 'patches_count', 100, 5, 5],

      ['小获芳心', '获得 10 个点赞', '💖', 'like', 'likes_count', 10, 1, 1],
      ['人气新星', '获得 100 个点赞', '💝', 'like', 'likes_count', 100, 2, 2],
      ['广受欢迎', '获得 500 个点赞', '💗', 'like', 'likes_count', 500, 3, 3],
      ['万众瞩目', '获得 1000 个点赞', '💓', 'like', 'likes_count', 1000, 4, 4],
      ['国民偶像', '获得 5000 个点赞', '💞', 'like', 'likes_count', 5000, 5, 5],

      ['初次收藏', '被收藏 5 次', '📌', 'favorite', 'favorites_count', 5, 1, 1],
      ['珍藏之选', '被收藏 50 次', '📎', 'favorite', 'favorites_count', 50, 2, 2],
      ['人气收藏', '被收藏 200 次', '🗂️', 'favorite', 'favorites_count', 200, 3, 3],
      ['典藏精品', '被收藏 500 次', '📚', 'favorite', 'favorites_count', 500, 4, 4],
      ['传世经典', '被收藏 1000 次', '🏛️', 'favorite', 'favorites_count', 1000, 5, 5]
    ];

    const insertStmt = db.prepare(`
      INSERT INTO achievement_rules (name, description, icon, category, metric_type, threshold, level, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    defaultRules.forEach(rule => {
      insertStmt.run(...rule);
    });

    console.log(`已初始化 ${defaultRules.length} 条默认成就规则`);
  }
} catch (e) {
  console.error('创建成就体系表失败:', e);
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

try {
  const patchColumns = db.prepare("PRAGMA table_info(patches)").all();
  const hasScheduledAtColumn = patchColumns.some(col => col.name === 'scheduled_at');
  if (!hasScheduledAtColumn) {
    db.exec(`ALTER TABLE patches ADD COLUMN scheduled_at DATETIME`);
    console.log('patches 表已添加 scheduled_at 字段');
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_patches_status ON patches(status);
    CREATE INDEX IF NOT EXISTS idx_patches_scheduled ON patches(scheduled_at) WHERE scheduled_at IS NOT NULL;
  `);
} catch (e) {
  console.error('创建草稿/定时发布字段失败:', e);
}

const processScheduledPatches = () => {
  try {
    const now = new Date().toISOString();
    const duePatches = db.prepare(`
      SELECT p.*, u.username 
      FROM patches p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.status = 'scheduled' AND p.scheduled_at <= ?
    `).all(now);

    if (duePatches.length > 0) {
      console.log(`[定时发布] 检查到 ${duePatches.length} 个待发布的 Patch`);
      
      const typeToCategory = {
        'new_patch': 'follow',
        'system': 'system'
      };

      const createNotification = (userId, type, fromUserId, patchId, content, options = {}) => {
        try {
          const category = options.category || typeToCategory[type] || 'system';
          const subscription = db.prepare(`
            SELECT enabled FROM notification_subscriptions 
            WHERE user_id = ? AND category = ?
          `).get(userId, category);
          if (subscription && subscription.enabled === 0) return;
          const linkUrl = options.linkUrl || null;
          const extraData = options.extraData ? JSON.stringify(options.extraData) : null;
          db.prepare(`
            INSERT INTO notifications (user_id, type, category, from_user_id, patch_id, content, link_url, extra_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(userId, type, category, fromUserId, patchId, content, linkUrl, extraData);
        } catch (e) {
          console.error('创建通知失败:', e);
        }
      };

      const updateStmt = db.prepare(`
        UPDATE patches SET status = 'approved', is_public = 1, scheduled_at = NULL, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);

      duePatches.forEach(patch => {
        updateStmt.run(patch.id);
        console.log(`[定时发布] Patch "${patch.title}" (ID: ${patch.id}) 已自动发布`);

        const followers = db.prepare(`
          SELECT follower_id FROM follows WHERE following_id = ?
        `).all(patch.user_id);
        
        followers.forEach(follower => {
          createNotification(
            follower.follower_id,
            'new_patch',
            patch.user_id,
            patch.id,
            `${patch.username} 发布了新 Patch：${patch.title}`,
            { linkUrl: `/patches/${patch.id}` }
          );
        });
      });
    }
  } catch (e) {
    console.error('[定时发布] 处理失败:', e);
  }
};

setInterval(processScheduledPatches, 60 * 1000);
console.log('定时发布调度器已启动（每分钟检查一次）');
setTimeout(processScheduledPatches, 5000);

const { updateUserAchievements, calculateUserStats } = require('./controllers/achievementController');

const recalcAchievementStats = () => {
  try {
    const patchRows = db.prepare('SELECT id, favorites_count FROM patches').all();
    const fixStmt = db.prepare(`
      UPDATE patches SET favorites_count = (
        SELECT COUNT(*) FROM favorites WHERE patch_id = ?
      ) WHERE id = ?
    `);
    let fixedCount = 0;
    patchRows.forEach(row => {
      const realCount = db.prepare('SELECT COUNT(*) as cnt FROM favorites WHERE patch_id = ?').get(row.id).cnt;
      if (row.favorites_count !== realCount) {
        fixStmt.run(row.id, row.id);
        fixedCount++;
      }
    });
    if (fixedCount > 0) {
      console.log(`[成就统计] 修正了 ${fixedCount} 个 Patch 的收藏计数`);
    }

    const users = db.prepare('SELECT id FROM users').all();
    users.forEach(user => {
      updateUserAchievements(user.id);
    });
    console.log(`[成就统计] 已更新 ${users.length} 个用户的成就数据`);
  } catch (e) {
    console.error('[成就统计] 计算失败:', e);
  }
};

setInterval(recalcAchievementStats, 30 * 60 * 1000);
console.log('成就统计调度器已启动（每30分钟计算一次）');
setTimeout(recalcAchievementStats, 10000);

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
