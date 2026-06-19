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
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    is_creator_verified INTEGER DEFAULT 0,
    creator_verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const userAllColumns = getColumns('users');
const userSelectFields = ['id', 'username', 'email', passwordSelect, 'avatar', 'bio', 'role', 'created_at', 'updated_at']
  .filter(f => f !== passwordSelect || userAllColumns.includes(f.replace(' as password', '')) || userAllColumns.includes('password') || userAllColumns.includes('password_hash'));
userSelectFields.splice(3, 1, passwordSelect);

const existingUsers = db.prepare(`SELECT ${userSelectFields.join(', ')} FROM users`).all();
const insertUser = db.prepare(`INSERT OR IGNORE INTO users_new (id, username, email, password, avatar, bio, role, followers_count, following_count, is_creator_verified, creator_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
existingUsers.forEach(u => {
  let pwd = u.password;
  if (!pwd && u.password_hash) pwd = u.password_hash;
  if (!pwd) pwd = bcrypt.hashSync('123456', 10);
  insertUser.run(u.id, u.username, u.email, pwd, u.avatar, u.bio, u.role || 'user', u.followers_count || 0, u.following_count || 0, u.is_creator_verified || 0, u.creator_verified_at || null, u.created_at, u.updated_at);
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

db.exec(`
  CREATE TABLE IF NOT EXISTS follows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
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
  CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
  CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
  CREATE INDEX IF NOT EXISTS idx_follows_created ON follows(created_at DESC);

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

db.exec(`
  CREATE TABLE IF NOT EXISTS module_wiki (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    overview TEXT,
    history TEXT,
    design_philosophy TEXT,
    notable_features TEXT,
    use_cases TEXT,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_id),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS module_parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    label TEXT,
    type TEXT DEFAULT 'knob',
    min_value REAL,
    max_value REAL,
    default_value TEXT,
    unit TEXT,
    description TEXT,
    tips TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS module_tips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    difficulty TEXT DEFAULT 'beginner',
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS module_recommended_patches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    patch_id INTEGER NOT NULL,
    reason TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE,
    UNIQUE(module_id, patch_id)
  );

  CREATE INDEX IF NOT EXISTS idx_module_params_module ON module_parameters(module_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_module_tips_module ON module_tips(module_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_module_rec_patches_module ON module_recommended_patches(module_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_module_wiki_module ON module_wiki(module_id);

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

db.exec('PRAGMA foreign_keys = ON');

console.log('数据库迁移完成！');
console.log('管理员账户: admin / admin123');
