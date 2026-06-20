const db = require('../src/db');

console.log('开始迁移知识专栏模块...');

db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    user_id INTEGER NOT NULL,
    tags TEXT,
    status TEXT DEFAULT 'pending',
    likes_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_public INTEGER DEFAULT 1,
    review_note TEXT,
    reviewed_at DATETIME,
    reviewed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS article_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    parent_id INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS article_module_refs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(article_id, module_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS article_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    article_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS article_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    article_id INTEGER NOT NULL,
    folder TEXT DEFAULT 'default',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_articles_user ON articles(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_articles_public ON articles(is_public, status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_article_comments_article ON article_comments(article_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_article_comments_user ON article_comments(user_id);
  CREATE INDEX IF NOT EXISTS idx_article_module_refs_article ON article_module_refs(article_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_article_module_refs_module ON article_module_refs(module_id);
  CREATE INDEX IF NOT EXISTS idx_article_likes_article ON article_likes(article_id);
  CREATE INDEX IF NOT EXISTS idx_article_favorites_user ON article_favorites(user_id);
`);

console.log('知识专栏模块数据库表创建完成！');
