require('dotenv').config();
const db = require('../src/db');

console.log('开始初始化数据库...');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS manufacturers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    logo TEXT,
    country TEXT,
    website TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    manufacturer_id INTEGER,
    type TEXT NOT NULL,
    hp INTEGER DEFAULT 0,
    power TEXT,
    description TEXT,
    image TEXT,
    specs TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS patches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    user_id INTEGER NOT NULL,
    modules_used TEXT,
    parameters TEXT,
    cables TEXT,
    audio_url TEXT,
    image_url TEXT,
    patch_file TEXT,
    tags TEXT,
    status TEXT DEFAULT 'approved',
    likes_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    is_public INTEGER DEFAULT 1,
    is_paid INTEGER DEFAULT 0,
    price REAL DEFAULT 0,
    preview_content TEXT,
    scheduled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    patch_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, patch_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    patch_id INTEGER NOT NULL,
    folder TEXT DEFAULT 'default',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, patch_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    patch_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS compare_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT DEFAULT '对比列表',
    patch_ids TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

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

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    category TEXT DEFAULT 'system',
    from_user_id INTEGER,
    patch_id INTEGER,
    content TEXT,
    link_url TEXT,
    extra_data TEXT,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_patches_user ON patches(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_category ON notifications(user_id, category, read);
  CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON notification_subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_patches_title ON patches(title);
  CREATE INDEX IF NOT EXISTS idx_likes_patch ON likes(patch_id);
  CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
  CREATE INDEX IF NOT EXISTS idx_modules_manufacturer ON modules(manufacturer_id);
  CREATE INDEX IF NOT EXISTS idx_collections_published ON collections(is_published, sort_order);
  CREATE INDEX IF NOT EXISTS idx_collection_patches_collection ON collection_patches(collection_id, sort_order);

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'contest',
    description TEXT,
    cover_url TEXT,
    content TEXT,
    rules TEXT,
    prizes TEXT,
    start_date DATETIME,
    end_date DATETIME,
    registration_start DATETIME,
    registration_end DATETIME,
    submission_start DATETIME,
    submission_end DATETIME,
    status TEXT DEFAULT 'draft',
    max_registrations INTEGER DEFAULT 0,
    allow_submission INTEGER DEFAULT 1,
    show_ranking INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'approved',
    extra_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(activity_id, user_id),
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activity_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    patch_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    attachment_url TEXT,
    status TEXT DEFAULT 'pending',
    votes_count INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    rank INTEGER,
    review_note TEXT,
    reviewed_at DATETIME,
    reviewed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS activity_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    score INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(submission_id, user_id),
    FOREIGN KEY (submission_id) REFERENCES activity_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status, sort_order);
  CREATE INDEX IF NOT EXISTS idx_activities_dates ON activities(start_date, end_date);
  CREATE INDEX IF NOT EXISTS idx_registrations_activity ON activity_registrations(activity_id);
  CREATE INDEX IF NOT EXISTS idx_registrations_user ON activity_registrations(user_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_activity ON activity_submissions(activity_id, status);
  CREATE INDEX IF NOT EXISTS idx_submissions_user ON activity_submissions(user_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_rank ON activity_submissions(activity_id, rank);
  CREATE INDEX IF NOT EXISTS idx_votes_submission ON activity_votes(submission_id);
  CREATE INDEX IF NOT EXISTS idx_votes_user ON activity_votes(user_id);

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

console.log('数据库表创建完成！');

const bcrypt = require('bcryptjs');
const adminPassword = bcrypt.hashSync('admin123', 10);
const operatorPassword = bcrypt.hashSync('operator123', 10);
const auditorPassword = bcrypt.hashSync('auditor123', 10);

const userStmt = db.prepare(`
  INSERT OR IGNORE INTO users (username, email, password, role, bio)
  VALUES (?, ?, ?, ?, ?)
`);
userStmt.run('admin', 'admin@patchvault.com', adminPassword, 'admin', '系统管理员');
userStmt.run('operator', 'operator@patchvault.com', operatorPassword, 'operator', '运营人员');
userStmt.run('auditor', 'auditor@patchvault.com', auditorPassword, 'auditor', '审核员');

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

console.log('管理员账户创建完成！用户名: admin, 密码: admin123');
console.log('运营账户创建完成！用户名: operator, 密码: operator123');
console.log('审核员账户创建完成！用户名: auditor, 密码: auditor123');
console.log(`已为 ${allUsers.length} 个用户初始化订阅设置`);

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

console.log('数据库初始化完成！');
