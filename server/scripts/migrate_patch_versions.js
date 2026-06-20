const db = require('../src/db');

console.log('开始迁移：Patch 版本历史表...');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS patch_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patch_id INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      title TEXT,
      description TEXT,
      modules_used TEXT,
      parameters TEXT,
      cables TEXT,
      audio_url TEXT,
      image_url TEXT,
      patch_file TEXT,
      tags TEXT,
      is_public INTEGER DEFAULT 1,
      is_paid INTEGER DEFAULT 0,
      price REAL DEFAULT 0,
      preview_content TEXT,
      status TEXT DEFAULT 'approved',
      scheduled_at DATETIME,
      change_summary TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_patch_versions_patch ON patch_versions(patch_id, version DESC);
    CREATE INDEX IF NOT EXISTS idx_patch_versions_created ON patch_versions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_patch_versions_creator ON patch_versions(created_by, created_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_patch_versions_unique
    ON patch_versions(patch_id, version);
  `);

  console.log('✅ patch_versions 表创建成功');

  const existingPatches = db.prepare(`
    SELECT id, title, description, modules_used, parameters, cables,
           audio_url, image_url, patch_file, tags, is_public, is_paid,
           price, preview_content, status, scheduled_at, user_id, created_at
    FROM patches
  `).all();

  console.log(`找到 ${existingPatches.length} 个现有 Patch，正在创建初始版本...`);

  const insertVersion = db.prepare(`
    INSERT INTO patch_versions (
      patch_id, version, title, description, modules_used, parameters,
      cables, audio_url, image_url, patch_file, tags, is_public, is_paid,
      price, preview_content, status, scheduled_at, change_summary,
      created_by, created_at
    ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '初始版本', ?, ?)
  `);

  let count = 0;
  for (const patch of existingPatches) {
    const existing = db.prepare('SELECT id FROM patch_versions WHERE patch_id = ? AND version = 1').get(patch.id);
    if (!existing) {
      insertVersion.run(
        patch.id,
        patch.title,
        patch.description,
        patch.modules_used,
        patch.parameters,
        patch.cables,
        patch.audio_url,
        patch.image_url,
        patch.patch_file,
        patch.tags,
        patch.is_public,
        patch.is_paid,
        patch.price,
        patch.preview_content,
        patch.status,
        patch.scheduled_at,
        patch.user_id,
        patch.created_at
      );
      count++;
    }
  }

  console.log(`✅ 为 ${count} 个 Patch 创建了初始版本记录`);
  console.log('迁移完成！');

} catch (err) {
  console.error('❌ 迁移失败:', err.message);
  process.exit(1);
}
