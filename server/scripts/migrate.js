require('dotenv').config();
const db = require('../src/db');
const bcrypt = require('bcryptjs');

console.log('开始迁移数据库...');

db.exec('PRAGMA foreign_keys = OFF');

const getColumns = (table) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  return columns.map(c => c.name);
};

const tableExists = (table) => {
  const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
  return !!result;
};

const userColumns = getColumns('users');
const hasPassword = userColumns.includes('password');
const hasPasswordHash = userColumns.includes('password_hash');

let passwordSelect = 'password';
if (!hasPassword && hasPasswordHash) {
  passwordSelect = 'password_hash as password';
} else if (!hasPassword && !hasPasswordHash) {
  passwordSelect = "'' as password";
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users_new (
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
`);

const existingUsers = db.prepare(`SELECT id, username, email, ${passwordSelect}, avatar, bio, role, created_at, updated_at FROM users`).all();
const insertUser = db.prepare(`INSERT OR IGNORE INTO users_new (id, username, email, password, avatar, bio, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
existingUsers.forEach(u => {
  let pwd = u.password;
  if (!pwd && u.password_hash) pwd = u.password_hash;
  if (!pwd) pwd = bcrypt.hashSync('123456', 10);
  insertUser.run(u.id, u.username, u.email, pwd, u.avatar, u.bio, u.role || 'user', u.created_at, u.updated_at);
});

db.exec(`
  DROP TABLE IF EXISTS users;
  ALTER TABLE users_new RENAME TO users;
`);

db.exec(`
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
`);

db.exec(`
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
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS patches_new (
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
`);

const patchColumns = getColumns('patches');
const patchSelectFields = ['id', 'title', 'description', 'user_id', 'parameters', 'tags', 'status', 'likes_count', 'favorites_count', 'created_at', 'updated_at']
  .filter(f => patchColumns.includes(f))
  .join(', ');

const existingPatches = db.prepare(`SELECT ${patchSelectFields} FROM patches`).all();
const insertPatch = db.prepare(`INSERT OR IGNORE INTO patches_new (id, title, description, user_id, parameters, tags, status, likes_count, favorites_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
existingPatches.forEach(p => {
  insertPatch.run(
    p.id,
    p.title,
    p.description || '',
    p.user_id,
    p.parameters || '',
    p.tags || '',
    p.status || 'approved',
    p.likes_count || 0,
    p.favorites_count || 0,
    p.created_at,
    p.updated_at
  );
});

db.exec(`
  DROP TABLE IF EXISTS patches;
  ALTER TABLE patches_new RENAME TO patches;
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    patch_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, patch_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE
  );
`);

db.exec(`
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
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    patch_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS compare_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT DEFAULT '对比列表',
    patch_ids TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

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
`);

const adminPassword = bcrypt.hashSync('admin123', 10);
db.prepare(`INSERT OR IGNORE INTO users (username, email, password, role, bio)
  VALUES (?, ?, ?, ?, ?)`).run('admin', 'admin@patchvault.com', adminPassword, 'admin', '系统管理员');

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_patches_user ON patches(user_id);
  CREATE INDEX IF NOT EXISTS idx_patches_title ON patches(title);
  CREATE INDEX IF NOT EXISTS idx_likes_patch ON likes(patch_id);
  CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
  CREATE INDEX IF NOT EXISTS idx_modules_manufacturer ON modules(manufacturer_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
  CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
`);

db.exec('PRAGMA foreign_keys = ON');

console.log('数据库迁移完成！');
console.log('管理员账户: admin / admin123');
