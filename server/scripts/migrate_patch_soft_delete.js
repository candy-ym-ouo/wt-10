const db = require('../src/db');

const migration = () => {
  console.log('开始迁移：为 patches 表添加 soft delete 字段...');

  const tableInfo = db.prepare("PRAGMA table_info(patches)").all();
  const hasDeletedAt = tableInfo.some(col => col.name === 'deleted_at');

  if (!hasDeletedAt) {
    db.prepare(`
      ALTER TABLE patches ADD COLUMN deleted_at DATETIME DEFAULT NULL
    `).run();
    console.log('✅ 已添加 deleted_at 字段');
  } else {
    console.log('ℹ️  deleted_at 字段已存在，跳过');
  }

  try {
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_patches_deleted ON patches(deleted_at)
    `).run();
    console.log('✅ 已创建 deleted_at 索引');
  } catch (e) {
    console.log('ℹ️  deleted_at 索引已存在或创建失败:', e.message);
  }

  console.log('迁移完成！');
};

if (require.main === module) {
  migration();
}

module.exports = migration;
