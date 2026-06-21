require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移标签管理相关表...');

db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_hot INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tag_merge_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_tag TEXT NOT NULL,
    target_tag TEXT NOT NULL,
    affected_count INTEGER DEFAULT 0,
    operator_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
  CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);
  CREATE INDEX IF NOT EXISTS idx_tags_hot ON tags(is_hot, sort_order);
  CREATE INDEX IF NOT EXISTS idx_tag_merge_logs_created ON tag_merge_logs(created_at DESC);
`);

console.log('标签管理表创建完成！');

const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM tags').get().cnt;
if (existingCount === 0) {
  console.log('正在从 patches 和 articles 表回填标签数据...');

  const patchRows = db.prepare("SELECT tags FROM patches WHERE tags IS NOT NULL AND tags != '[]' AND tags != ''").all();
  const articleRows = db.prepare("SELECT tags FROM articles WHERE tags IS NOT NULL AND tags != '[]' AND tags != ''").all();

  const tagCountMap = {};
  const countTag = (tagsStr) => {
    try {
      const tags = JSON.parse(tagsStr);
      if (Array.isArray(tags)) {
        tags.forEach(t => {
          const name = String(t).trim();
          if (name) {
            tagCountMap[name] = (tagCountMap[name] || 0) + 1;
          }
        });
      }
    } catch {}
  };

  patchRows.forEach(r => countTag(r.tags));
  articleRows.forEach(r => countTag(r.tags));

  const insertTag = db.prepare(
    'INSERT OR IGNORE INTO tags (name, usage_count) VALUES (?, ?)'
  );

  let inserted = 0;
  for (const [name, count] of Object.entries(tagCountMap)) {
    insertTag.run(name, count);
    inserted++;
  }
  console.log(`已回填 ${inserted} 个标签`);
} else {
  console.log('标签表已有数据，跳过回填');
}

console.log('标签管理迁移完成！');
