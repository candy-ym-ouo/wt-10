const db = require('../src/db');

console.log('修复 article_comments 表的外键约束...');

db.exec(`
  PRAGMA foreign_keys = OFF;
  
  CREATE TABLE IF NOT EXISTS article_comments_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    parent_id INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  
  INSERT INTO article_comments_new SELECT * FROM article_comments;
  
  DROP TABLE IF EXISTS article_comments;
  
  ALTER TABLE article_comments_new RENAME TO article_comments;
  
  CREATE INDEX IF NOT EXISTS idx_article_comments_article ON article_comments(article_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_article_comments_user ON article_comments(user_id);
  
  PRAGMA foreign_keys = ON;
`);

console.log('修复完成！');
