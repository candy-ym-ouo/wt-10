require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移模块百科数据库...');

db.exec('PRAGMA foreign_keys = OFF');

db.exec(`
  CREATE TABLE IF NOT EXISTS module_wiki (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    overview TEXT,
    history TEXT,
    design_philosophy TEXT,
    notable_features TEXT,
    use_cases TEXT,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_id),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS module_parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    label TEXT,
    type TEXT DEFAULT 'knob',
    min_value REAL,
    max_value REAL,
    default_value TEXT,
    unit TEXT,
    description TEXT,
    tips TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS module_tips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    difficulty TEXT DEFAULT 'beginner',
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS module_recommended_patches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    patch_id INTEGER NOT NULL,
    reason TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE,
    UNIQUE(module_id, patch_id)
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_module_params_module ON module_parameters(module_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_module_tips_module ON module_tips(module_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_module_rec_patches_module ON module_recommended_patches(module_id, sort_order);
  CREATE INDEX IF NOT EXISTS idx_module_wiki_module ON module_wiki(module_id);
`);

db.exec('PRAGMA foreign_keys = ON');

console.log('模块百科数据库迁移完成！');
