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
`);

console.log('数据库表创建完成！');

const bcrypt = require('bcryptjs');
const adminPassword = bcrypt.hashSync('admin123', 10);

const adminStmt = db.prepare(`
  INSERT OR IGNORE INTO users (username, email, password, role, bio)
  VALUES (?, ?, ?, ?, ?)
`);
const adminResult = adminStmt.run('admin', 'admin@patchvault.com', adminPassword, 'admin', '系统管理员');

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
console.log(`已为 ${allUsers.length} 个用户初始化订阅设置`);
console.log('数据库初始化完成！');
