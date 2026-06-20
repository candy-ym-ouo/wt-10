require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移收藏分组功能...');

db.exec(`
  CREATE TABLE IF NOT EXISTS favorite_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#ffd700',
    sort_order INTEGER DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_favorite_folders_user ON favorite_folders(user_id, sort_order);
`);

console.log('✅ favorite_folders 表创建完成');

const existingFolders = db.prepare(`
  SELECT DISTINCT f.user_id, f.folder as name, COUNT(*) as count
  FROM favorites f
  WHERE f.folder IS NOT NULL AND f.folder != ''
  GROUP BY f.user_id, f.folder
`).all();

console.log(`发现 ${existingFolders.length} 个现有分组需要迁移`);

const insertFolder = db.prepare(`
  INSERT OR IGNORE INTO favorite_folders (user_id, name, sort_order, is_default)
  VALUES (?, ?, ?, ?)
`);

const getMaxOrder = db.prepare(`
  SELECT COALESCE(MAX(sort_order), -1) as max_order
  FROM favorite_folders
  WHERE user_id = ?
`);

existingFolders.forEach(folder => {
  const maxOrder = getMaxOrder.get(folder.user_id).max_order;
  const isDefault = folder.name === 'default' ? 1 : 0;
  insertFolder.run(folder.user_id, folder.name, maxOrder + 1, isDefault);
});

console.log('✅ 现有分组迁移完成');

const usersWithoutDefault = db.prepare(`
  SELECT DISTINCT user_id FROM favorites
  WHERE user_id NOT IN (
    SELECT user_id FROM favorite_folders WHERE name = 'default'
  )
`).all();

console.log(`为 ${usersWithoutDefault.length} 个用户创建默认分组`);

usersWithoutDefault.forEach(row => {
  const maxOrder = getMaxOrder.get(row.user_id).max_order;
  insertFolder.run(row.user_id, 'default', maxOrder + 1, 1);
});

console.log('✅ 默认分组创建完成');

const folderIds = db.prepare(`
  SELECT id, user_id, name FROM favorite_folders
`).all();

const folderIdMap = {};
folderIds.forEach(f => {
  const key = `${f.user_id}_${f.name}`;
  folderIdMap[key] = f.id;
});

const columnInfo = db.prepare(`PRAGMA table_info(favorites)`).all();
const hasFolderId = columnInfo.some(col => col.name === 'folder_id');

if (!hasFolderId) {
  db.exec(`ALTER TABLE favorites ADD COLUMN folder_id INTEGER REFERENCES favorite_folders(id) ON DELETE SET NULL`);
  console.log('✅ favorites 表新增 folder_id 字段');
} else {
  console.log('ℹ️ favorites 表 folder_id 字段已存在');
}

const updateStmt = db.prepare(`
  UPDATE favorites SET folder_id = ? WHERE user_id = ? AND folder = ?
`);

folderIds.forEach(folder => {
  updateStmt.run(folder.id, folder.user_id, folder.name);
});

console.log('✅ favorites 表 folder_id 关联完成');

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_favorites_folder ON favorites(folder_id);
  CREATE INDEX IF NOT EXISTS idx_favorites_user_folder ON favorites(user_id, folder_id);
`);

console.log('✅ 索引创建完成');
console.log('🎉 收藏分组迁移完成！');
