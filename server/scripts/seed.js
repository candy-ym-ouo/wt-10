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

const wikiModules = [
  {
    name: 'Maths',
    overview: 'Maths 是 Make Noise 推出的经典多功能函数发生器模块，被誉为 Eurorack 系统中的"瑞士军刀"。它由两个独立的通道组成，每个通道都可以作为包络发生器、LFO、压控摆率限制器或压控放大器使用。',
    history: 'Maths 由 Tony Rolando 设计，于 2011 年首次发布。其设计灵感来源于 Buchla 208 和 Serge 模块系统中的函数发生器概念，是 Make Noise 最具代表性的模块之一。',
    design_philosophy: 'Maths 的设计理念是"一个模块，多种功能"。通过巧妙的电路设计，使得同一个模块可以在不同模式下工作，极大地扩展了模块化合成器的可能性。',
    notable_features: '双通道独立设计\n多种工作模式\n内置压控摆率\n超宽频率范围\n零延迟响应',
    use_cases: '作为包络发生器使用\n作为 LFO 产生调制信号\n创建复杂的包络形状\n作为压控摆率限制器\n生成斜波和脉冲波',
    parameters: [
      { name: 'Rise', label: '上升时间', type: 'knob', min_value: 0.001, max_value: 10, unit: 's', default_value: '0.1', description: '控制信号上升沿的时间长度', tips: '短上升时间适合创建锐利的包络，长上升时间适合制作渐变效果' },
      { name: 'Fall', label: '下降时间', type: 'knob', min_value: 0.001, max_value: 10, unit: 's', default_value: '0.5', description: '控制信号下降沿的时间长度', tips: '配合 Rise 旋钮可以创建各种形状的包络' },
      { name: 'Both', label: '同时调节', type: 'knob', min_value: 0, max_value: 10, description: '同时调节上升和下降时间', tips: '当你需要保持包络形状但改变速度时非常有用' }
    ],
    tips: [
      { title: '经典 ADSR 制作', content: '将通道 1 的 Rise 设置为 Attack，通道 2 的 Fall 设置为 Release，然后将两个通道串联起来，就可以得到一个简易的 ADSR 包络。', category: 'patch_tip', difficulty: 'beginner' },
      { title: 'LFO 调制技巧', content: '将 Maths 用作 LFO 时，可以通过 Both 旋钮快速调节频率。配合外部 CV 输入，可以实现压控 LFO 效果。', category: 'sound_design', difficulty: 'intermediate' },
      { title: '复杂包络生成', content: '通过将两个通道相互调制，可以创建非常复杂的包络形状。尝试将通道 1 的输出送到通道 2 的 CV 输入端。', category: 'advanced', difficulty: 'advanced' }
    ]
  },
  {
    name: 'Clouds',
    overview: 'Clouds 是 Mutable Instruments 推出的颗粒合成器模块，能够将输入音频分解成微小的声音颗粒，然后以不同的方式重新组合和播放，创造出丰富的空间效果和独特的音色。',
    history: 'Clouds 由 Émilie Gillet 设计，于 2015 年发布。它是 Mutable Instruments 最受欢迎的模块之一，因其独特的声音处理能力和直观的界面而广受好评。',
    design_philosophy: 'Clouds 的设计理念是让颗粒合成变得直观易用。通过四个主要控制旋钮，用户可以快速调整颗粒的大小、密度、音高和位置，创造出从微妙的混响效果到完全抽象的声音景观。',
    notable_features: '四种颗粒处理模式\n内置颗粒冻结功能\n立体声输入输出\n可控制颗粒大小、密度、音高\n支持外部 CV 调制',
    use_cases: '创建氛围和环境音效\n声音粒子化处理\n制作空间混响效果\n实时声音变形\n实验性声音设计',
    parameters: [
      { name: 'Position', label: '位置', type: 'knob', min_value: 0, max_value: 1, default_value: '0.5', description: '控制读取缓冲区中的位置', tips: '调节位置可以改变颗粒的音高和音色特性' },
      { name: 'Density', label: '密度', type: 'knob', min_value: 0, max_value: 1, default_value: '0.5', description: '控制每秒生成的颗粒数量', tips: '低密度适合散粒效果，高密度可以产生连续的声音纹理' },
      { name: 'Size', label: '颗粒大小', type: 'knob', min_value: 0.01, max_value: 1, unit: 's', default_value: '0.1', description: '控制每个声音颗粒的长度', tips: '小颗粒更锐利有冲击力，大颗粒更柔和有空间感' },
      { name: 'Pitch', label: '音高', type: 'knob', min_value: -24, max_value: 24, unit: 'st', default_value: '0', description: '控制颗粒的音高偏移量', tips: '可以产生和声效果或完全改变音色的音高特性' }
    ],
    tips: [
      { title: '冻结效果', content: '按下 Freeze 按钮可以冻结当前的颗粒缓冲区，创造出无限延续的声音纹理。这是制作氛围音乐的绝佳技巧。', category: 'performance', difficulty: 'beginner' },
      { title: '实时颗粒变形', content: '在播放声音的同时缓慢调节 Position 旋钮，可以创造出声音逐渐变形的效果。这在现场演出中非常有效。', category: 'performance', difficulty: 'intermediate' },
      { title: '鼓声颗粒化', content: '将鼓声送入 Clouds，设置较短的颗粒大小和较高的密度，可以创造出独特的颗粒化鼓点效果。', category: 'sound_design', difficulty: 'intermediate' }
    ]
  },
  {
    name: 'Plaits',
    overview: 'Plaits 是 Mutable Instruments 推出的宏观合成振荡器模块，内置 16 种完全不同的合成模型，从经典的减法合成到创新的物理建模，应有尽有。',
    history: 'Plaits 于 2018 年发布，是 Mutable Instruments Braids 的继任者。它在保持 12HP 紧凑尺寸的同时，大幅扩展了合成模型的种类和音质。',
    design_philosophy: 'Plaits 的设计理念是"一个旋钮，一个音色"。通过 Timbre 和 Morph 两个核心旋钮，用户可以直观地探索每种合成模型的声音特性，而不需要复杂的菜单系统。',
    notable_features: '16 种合成模型\n两个主控制旋钮 (Timber & Morph)\n内置低通门\n集成包络跟随器\n支持所有标准 1V/octave 输入',
    use_cases: '作为主振荡器使用\n创造各种音色\nFM 合成\n物理建模音色\n实验性声音设计',
    parameters: [
      { name: 'Timbre', label: '音色', type: 'knob', min_value: 0, max_value: 1, default_value: '0.5', description: '主音色控制参数，每种模型的作用不同', tips: '这是 Plaits 最重要的控制旋钮，每种模型下的效果都不同' },
      { name: 'Morph', label: '变形', type: 'knob', min_value: 0, max_value: 1, default_value: '0.5', description: '次要音色控制参数，与 Timbre 配合创造丰富变化', tips: '尝试将 Morph 连接到 LFO 来创建动态变化的音色' },
      { name: 'Harmonics', label: '泛音', type: 'knob', min_value: 0, max_value: 1, default_value: '0.3', description: '控制泛音结构或波形形状', tips: '不同模型下这个旋钮的作用有很大差异' }
    ],
    tips: [
      { title: '模型快速切换', content: 'Plaits 有 16 种合成模型，每种都有独特的声音特性。从经典的虚模拟到物理建模，花时间探索每种模型是值得的。', category: 'general', difficulty: 'beginner' },
      { title: '低通门效果', content: 'Plaits 内置的低通门非常适合制作有呼吸感的音色。尝试使用慢包络来调制它，创造出自然的起伏效果。', category: 'sound_design', difficulty: 'intermediate' },
      { title: 'FM 打击乐', content: '使用 FM 合成模型，配合短促的包络，可以创造出非常棒的打击乐音色。尝试不同的 Timbre 设置来获得从金属到木头的各种音色。', category: 'sound_design', difficulty: 'intermediate' }
    ]
  }
];

const patchIds = db.prepare('SELECT id, title FROM patches ORDER BY id').all();

wikiModules.forEach(wikiModule => {
  const mod = db.prepare('SELECT id FROM modules WHERE name = ?').get(wikiModule.name);
  if (!mod) return;

  const moduleId = mod.id;

  const wikiExists = db.prepare('SELECT id FROM module_wiki WHERE module_id = ?').get(moduleId);
  if (!wikiExists) {
    db.prepare(`
      INSERT INTO module_wiki (module_id, overview, history, design_philosophy, notable_features, use_cases, status)
      VALUES (?, ?, ?, ?, ?, ?, 'published')
    `).run(
      moduleId,
      wikiModule.overview,
      wikiModule.history,
      wikiModule.design_philosophy,
      wikiModule.notable_features,
      wikiModule.use_cases
    );
  }

  wikiModule.parameters.forEach((param, idx) => {
    const paramExists = db.prepare('SELECT id FROM module_parameters WHERE module_id = ? AND name = ?').get(moduleId, param.name);
    if (!paramExists) {
      db.prepare(`
        INSERT INTO module_parameters (module_id, name, label, type, min_value, max_value, default_value, unit, description, tips, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        moduleId,
        param.name,
        param.label,
        param.type,
        param.min_value,
        param.max_value,
        param.default_value,
        param.unit || '',
        param.description,
        param.tips,
        idx
      );
    }
  });

  wikiModule.tips.forEach((tip, idx) => {
    const tipExists = db.prepare('SELECT id FROM module_tips WHERE module_id = ? AND title = ?').get(moduleId, tip.title);
    if (!tipExists) {
      db.prepare(`
        INSERT INTO module_tips (module_id, title, content, category, difficulty, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(moduleId, tip.title, tip.content, tip.category, tip.difficulty, idx);
    }
  });

  patchIds.slice(0, 2).forEach((patch, idx) => {
    const recExists = db.prepare('SELECT id FROM module_recommended_patches WHERE module_id = ? AND patch_id = ?').get(moduleId, patch.id);
    if (!recExists) {
      const reasons = [
        `展示了 ${wikiModule.name} 在实际音色设计中的经典应用`,
        `演示了如何巧妙利用 ${wikiModule.name} 的特性创造独特声音`
      ];
      db.prepare(`
        INSERT INTO module_recommended_patches (module_id, patch_id, reason, sort_order)
        VALUES (?, ?, ?, ?)
      `).run(moduleId, patch.id, reasons[idx % reasons.length], idx);
    }
  });
});

console.log(`- 百科模块: ${wikiModules.length} 个 (含示例数据)`);

