require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移：模块参数模板表...');

db.exec(`
  CREATE TABLE IF NOT EXISTS module_parameter_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parameter_values TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_by INTEGER,
    use_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_templates_module ON module_parameter_templates(module_id);
  CREATE INDEX IF NOT EXISTS idx_templates_default ON module_parameter_templates(module_id, is_default);
  CREATE INDEX IF NOT EXISTS idx_templates_creator ON module_parameter_templates(created_by);
`);

console.log('✅ module_parameter_templates 表创建完成');

const modules = db.prepare('SELECT id, name FROM modules LIMIT 10').all();
console.log(`检测到 ${modules.length} 个模块，可用于创建示例模板`);

const existingTemplates = db.prepare('SELECT COUNT(*) as cnt FROM module_parameter_templates').get().cnt;
if (existingTemplates === 0 && modules.length > 0) {
  console.log('📦 为现有模块创建示例默认参数模板...');
  
  const insertTemplate = db.prepare(`
    INSERT INTO module_parameter_templates 
    (module_id, name, description, parameter_values, is_default, created_by)
    VALUES (?, ?, ?, ?, 1, NULL)
  `);

  modules.forEach(mod => {
    const defaultValues = {
      oscillators: [{ type: 'saw', detune: 0, octave: 0 }],
      filter: { cutoff: 5000, resonance: 0.3, envAmount: 0.5 },
      envelope: { attack: 10, decay: 200, sustain: 0.7, release: 500 },
      lfo: { rate: 4, depth: 20, wave: 'sine' }
    };
    insertTemplate.run(
      mod.id,
      '默认参数',
      `${mod.name} 的标准默认参数配置`,
      JSON.stringify(defaultValues)
    );
  });
  console.log(`✅ 已创建 ${modules.length} 个示例默认模板`);
}

console.log('\n🎉 模块参数模板迁移完成！');
