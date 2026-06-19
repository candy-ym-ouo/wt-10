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

  CREATE INDEX IF NOT EXISTS idx_patches_user ON patches(user_id);
  CREATE INDEX IF NOT EXISTS idx_patches_title ON patches(title);
  CREATE INDEX IF NOT EXISTS idx_likes_patch ON likes(patch_id);
  CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
  CREATE INDEX IF NOT EXISTS idx_modules_manufacturer ON modules(manufacturer_id);
`);

console.log('数据库表创建完成！');

const bcrypt = require('bcryptjs');
const adminPassword = bcrypt.hashSync('admin123', 10);

const adminStmt = db.prepare(`
  INSERT OR IGNORE INTO users (username, email, password, role, bio)
  VALUES (?, ?, ?, ?, ?)
`);
adminStmt.run('admin', 'admin@patchvault.com', adminPassword, 'admin', '系统管理员');

console.log('管理员账户创建完成！用户名: admin, 密码: admin123');
console.log('数据库初始化完成！');
