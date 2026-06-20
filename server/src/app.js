require('dotenv').config();
const Koa = require('koa');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const db = require('./db');

const { authMiddleware } = require('./middleware/auth');
const router = require('./routes');

const app = new Koa();
const PORT = process.env.PORT || 3000;

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

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization']
}));

app.use(bodyParser({
  jsonLimit: '10mb'
}));

app.use(authMiddleware);

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

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════════╗
  ║                                                        ║
  ║   Patch Vault Server 启动成功!                         ║
  ║   服务地址: http://localhost:${PORT}                       ║
  ║   API 前缀: http://localhost:${PORT}/api                   ║
  ║                                                        ║
  ║   管理员账户: admin / admin123                         ║
  ║                                                        ║
  ╚════════════════════════════════════════════════════════╝
  `);
});
