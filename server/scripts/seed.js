require('dotenv').config();
const db = require('../src/db');
const bcrypt = require('bcryptjs');

console.log('开始填充种子数据...');

const manufacturers = [
  { name: 'Moog', country: 'USA', website: 'https://moogmusic.com', description: '经典合成器品牌' },
  { name: 'Roland', country: 'Japan', website: 'https://roland.com', description: '日本电子乐器巨头' },
  { name: 'Korg', country: 'Japan', website: 'https://korg.com', description: '创新合成器品牌' },
  { name: 'Make Noise', country: 'USA', website: 'https://makenoisemusic.com', description: '模块化合成器先锋' },
  { name: 'Mutable Instruments', country: 'France', website: 'https://mutable-instruments.net', description: '开源模块领导者' },
  { name: 'Intellijel', country: 'Canada', website: 'https://intellijel.com', description: '高品质 Eurorack 模块' },
];

const manuStmt = db.prepare('INSERT OR IGNORE INTO manufacturers (name, country, website, description) VALUES (?, ?, ?, ?)');
manufacturers.forEach(m => manuStmt.run(m.name, m.country, m.website, m.description));

const moduleTypes = ['VCO', 'VCF', 'VCA', 'LFO', 'Envelope', 'Sequencer', 'Mixer', 'Effect', 'Utility'];
const moduleData = [
  { name: 'Mother-32', manufacturer_id: 1, type: 'VCO', hp: 60, description: 'Moog 经典半模块合成器', specs: '{"oscillators": 1, "filter": "Moog Ladder"}' },
  { name: 'System-500', manufacturer_id: 2, type: 'VCO', hp: 84, description: 'Roland 模块化系统', specs: '{"oscillators": 3, "filter": "Multi-mode"}' },
  { name: 'MS-20 Filter', manufacturer_id: 3, type: 'VCF', hp: 48, description: 'Korg 传奇半模块合成器', specs: '{"filter_type": "Low-pass", "resonance": true}' },
  { name: 'Maths', manufacturer_id: 4, type: 'Utility', hp: 20, description: 'Make Noise 多功能函数发生器', specs: '{"channels": 2, "functions": ["Envelope", "LFO", "Slew"]}' },
  { name: 'Clouds', manufacturer_id: 5, type: 'Effect', hp: 18, description: 'Mutable Instruments 颗粒合成器', specs: '{"effect_type": "Granular", "buffers": 4}' },
  { name: 'Rings', manufacturer_id: 5, type: 'VCO', hp: 14, description: 'Mutable Instruments 物理建模振荡器', specs: '{"models": 3, "polyphony": 4}' },
  { name: 'Metropolis', manufacturer_id: 6, type: 'Sequencer', hp: 28, description: 'Intellijel 复音音序器', specs: '{"steps": 8, "tracks": 1, "modes": ["Forward", "Backward", "Random"]}' },
  { name: 'Veils', manufacturer_id: 5, type: 'VCA', hp: 12, description: 'Mutable Instruments 四通道 VCA', specs: '{"channels": 4, "response": "Linear"}' },
  { name: 'Plaits', manufacturer_id: 5, type: 'VCO', hp: 14, description: 'Mutable Instruments 宏观合成振荡器', specs: '{"models": 16, "features": ["FM", "Wavetable", "Noise"]}' },
  { name: 'Mimeophon', manufacturer_id: 4, type: 'Effect', hp: 18, description: 'Make Noise 立体声延迟', specs: '{"delay_time": "0-10s", "feedback": "0-100%", "stereo": true}' },
];

const modStmt = db.prepare('INSERT OR IGNORE INTO modules (name, manufacturer_id, type, hp, description, specs, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
moduleData.forEach(m => modStmt.run(m.name, m.manufacturer_id, m.type, m.hp, m.description, m.specs, 'active'));

const userPassword = bcrypt.hashSync('123456', 10);
const userStmt = db.prepare('INSERT OR IGNORE INTO users (username, email, password, bio) VALUES (?, ?, ?, ?)');
userStmt.run('synthfan', 'synth@example.com', userPassword, '模块合成器爱好者');
userStmt.run('patchmaster', 'master@example.com', userPassword, '资深 Patch 设计师');

const users = db.prepare('SELECT id FROM users WHERE role = ?').all('user');
const modules = db.prepare('SELECT id FROM modules').all();

const patchTemplates = [
  { title: '经典贝斯音色', description: '温暖厚重的 Moog 风格贝斯', tags: ['bass', 'moog', 'classic'] },
  { title: '氛围 Pad 音效', description: '梦幻般的空间合成音色', tags: ['pad', 'ambient', 'space'] },
  { title: '主奏 Lead', description: '穿透力强的主奏音色', tags: ['lead', 'solo', 'bright'] },
  { title: '鼓点序列', description: '经典的电子鼓点模式', tags: ['drums', 'rhythm', 'sequence'] },
  { title: '实验性噪音', description: '不寻常的声音探索', tags: ['experimental', 'noise', 'abstract'] },
];

const patchStmt = db.prepare(`
  INSERT INTO patches (title, description, user_id, modules_used, parameters, tags, status, likes_count, favorites_count, views_count)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

patchTemplates.forEach((patch, idx) => {
  const user = users[idx % users.length];
  const usedModules = modules.slice(0, 3 + (idx % 3)).map(m => m.id);
  const params = JSON.stringify({
    oscillators: [{ type: 'saw', detune: 5, octave: 0 }],
    filter: { cutoff: 5000, resonance: 0.3, envAmount: 0.6 },
    envelope: { attack: 10, decay: 200, sustain: 0.7, release: 500 },
    lfo: { rate: 4, depth: 20, wave: 'sine' }
  });

  patchStmt.run(
    patch.title,
    patch.description,
    user.id,
    JSON.stringify(usedModules),
    params,
    JSON.stringify(patch.tags),
    'approved',
    10 + idx * 5,
    5 + idx * 2,
    50 + idx * 20
  );
});

console.log('种子数据填充完成！');
console.log(`- 厂商: ${manufacturers.length} 个`);
console.log(`- 模块: ${moduleData.length} 个`);
console.log(`- 普通用户: 2 个 (密码均为 123456)`);
console.log(`- Patch 示例: ${patchTemplates.length} 个`);
