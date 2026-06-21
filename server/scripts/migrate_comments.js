require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移评论系统...');

db.exec('PRAGMA foreign_keys = OFF');

const getColumns = (table) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  return columns.map(c => c.name);
};

const tableExists = (table) => {
  const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
  return !!result;
};

const commentColumns = getColumns('comments');

if (!commentColumns.includes('parent_id')) {
  console.log('添加 parent_id 字段到 comments 表...');
  db.exec(`
    ALTER TABLE comments ADD COLUMN parent_id INTEGER DEFAULT NULL;
  `);
}

if (!commentColumns.includes('reply_to_user_id')) {
  console.log('添加 reply_to_user_id 字段到 comments 表...');
  db.exec(`
    ALTER TABLE comments ADD COLUMN reply_to_user_id INTEGER DEFAULT NULL;
  `);
}

if (!commentColumns.includes('likes_count')) {
  console.log('添加 likes_count 字段到 comments 表...');
  db.exec(`
    ALTER TABLE comments ADD COLUMN likes_count INTEGER DEFAULT 0;
  `);
}

if (!commentColumns.includes('status')) {
  console.log('添加 status 字段到 comments 表...');
  db.exec(`
    ALTER TABLE comments ADD COLUMN status TEXT DEFAULT 'approved';
  `);
}

if (!tableExists('comment_likes')) {
  console.log('创建 comment_likes 表...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS comment_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      comment_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, comment_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
    );
  `);
}

if (!tableExists('article_comments')) {
  console.log('跳过 article_comments 迁移（表不存在）');
} else {
  const articleCommentColumns = getColumns('article_comments');
  
  if (!articleCommentColumns.includes('parent_id')) {
    console.log('添加 parent_id 字段到 article_comments 表...');
    db.exec(`
      ALTER TABLE article_comments ADD COLUMN parent_id INTEGER DEFAULT NULL;
    `);
  }
  
  if (!articleCommentColumns.includes('reply_to_user_id')) {
    console.log('添加 reply_to_user_id 字段到 article_comments 表...');
    db.exec(`
      ALTER TABLE article_comments ADD COLUMN reply_to_user_id INTEGER DEFAULT NULL;
    `);
  }
  
  if (!articleCommentColumns.includes('likes_count')) {
    console.log('添加 likes_count 字段到 article_comments 表...');
    db.exec(`
      ALTER TABLE article_comments ADD COLUMN likes_count INTEGER DEFAULT 0;
    `);
  }
  
  if (!articleCommentColumns.includes('status')) {
    console.log('添加 status 字段到 article_comments 表...');
    db.exec(`
      ALTER TABLE article_comments ADD COLUMN status TEXT DEFAULT 'approved';
    `);
  }
  
  if (!tableExists('article_comment_likes')) {
    console.log('创建 article_comment_likes 表...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS article_comment_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        comment_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, comment_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (comment_id) REFERENCES article_comments(id) ON DELETE CASCADE
      );
    `);
  }
}

console.log('创建索引...');
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
  CREATE INDEX IF NOT EXISTS idx_comments_patch_status ON comments(patch_id, status);
  CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
  CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes(user_id);
`);

if (tableExists('article_comments')) {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_article_comments_parent ON article_comments(parent_id);
    CREATE INDEX IF NOT EXISTS idx_article_comments_article_status ON article_comments(article_id, status);
    CREATE INDEX IF NOT EXISTS idx_article_comment_likes_comment ON article_comment_likes(comment_id);
    CREATE INDEX IF NOT EXISTS idx_article_comment_likes_user ON article_comment_likes(user_id);
  `);
}

db.exec('PRAGMA foreign_keys = ON');

console.log('评论系统迁移完成！');
