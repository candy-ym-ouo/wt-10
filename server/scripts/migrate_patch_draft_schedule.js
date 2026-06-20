require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移：Patch 草稿箱与定时发布功能...');

const columns = db.prepare("PRAGMA table_info(patches)").all();
const hasScheduledAt = columns.some(c => c.name === 'scheduled_at');

if (!hasScheduledAt) {
  db.exec(`
    ALTER TABLE patches ADD COLUMN scheduled_at DATETIME;
  `);
  console.log('✓ 已添加 scheduled_at 字段到 patches 表');
} else {
  console.log('○ scheduled_at 字段已存在，跳过');
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_patches_status ON patches(status);
  CREATE INDEX IF NOT EXISTS idx_patches_scheduled ON patches(scheduled_at) WHERE scheduled_at IS NOT NULL;
`);
console.log('✓ 已创建索引');

const existingDrafts = db.prepare("SELECT COUNT(*) as cnt FROM patches WHERE is_public = 0 AND status = 'approved'").get();
if (existingDrafts.cnt > 0) {
  const result = db.prepare("UPDATE patches SET status = 'draft' WHERE is_public = 0 AND status = 'approved'").run();
  console.log(`✓ 已将 ${result.changes} 条私有 Patch 迁移为草稿状态`);
} else {
  console.log('○ 没有需要迁移的私有 Patch');
}

console.log('迁移完成！');
