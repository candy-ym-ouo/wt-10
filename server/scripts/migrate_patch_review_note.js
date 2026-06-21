const db = require('../src/db');

const migration = () => {
  console.log('开始迁移：为 patches 表添加 review_note 字段...');
  
  const tableInfo = db.prepare("PRAGMA table_info(patches)").all();
  const hasReviewNote = tableInfo.some(col => col.name === 'review_note');
  
  if (!hasReviewNote) {
    db.prepare(`
      ALTER TABLE patches ADD COLUMN review_note TEXT
    `).run();
    console.log('✅ 已添加 review_note 字段');
  } else {
    console.log('ℹ️  review_note 字段已存在，跳过');
  }
  
  console.log('迁移完成！');
};

if (require.main === module) {
  migration();
}

module.exports = migration;
