require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移成就体系模块...');

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

console.log('成就表创建完成！');

const userColumns = db.prepare("PRAGMA table_info(users)").all();
const hasTotalPatches = userColumns.some(col => col.name === 'total_patches');
const hasTotalLikes = userColumns.some(col => col.name === 'total_likes');
const hasTotalFavorites = userColumns.some(col => col.name === 'total_favorites');

if (!hasTotalPatches) {
  db.exec(`ALTER TABLE users ADD COLUMN total_patches INTEGER DEFAULT 0`);
  console.log('用户表已添加 total_patches 字段！');
} else {
  console.log('用户表已存在 total_patches 字段，跳过。');
}

if (!hasTotalLikes) {
  db.exec(`ALTER TABLE users ADD COLUMN total_likes INTEGER DEFAULT 0`);
  console.log('用户表已添加 total_likes 字段！');
} else {
  console.log('用户表已存在 total_likes 字段，跳过。');
}

if (!hasTotalFavorites) {
  db.exec(`ALTER TABLE users ADD COLUMN total_favorites INTEGER DEFAULT 0`);
  console.log('用户表已添加 total_favorites 字段！');
} else {
  console.log('用户表已存在 total_favorites 字段，跳过。');
}

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

const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM achievement_rules').get().cnt;
if (existingCount === 0) {
  const insertStmt = db.prepare(`
    INSERT INTO achievement_rules (name, description, icon, category, metric_type, threshold, level, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  
  defaultRules.forEach(rule => {
    insertStmt.run(...rule);
  });
  
  console.log(`已初始化 ${defaultRules.length} 条默认成就规则！`);
} else {
  console.log(`成就规则已存在 ${existingCount} 条，跳过初始化。`);
}

console.log('成就体系模块迁移完成！');
