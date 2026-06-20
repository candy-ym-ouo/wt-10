require('dotenv').config();
const db = require('../src/db');

console.log('初始化搜索中心默认数据...');

const hotKeywords = [
  { keyword: 'Moog', search_count: 128, is_pinned: 1 },
  { keyword: '氛围 Pad', search_count: 96, is_pinned: 0 },
  { keyword: '贝斯 Bass', search_count: 87, is_pinned: 0 },
  { keyword: 'Mother-32', search_count: 74, is_pinned: 0 },
  { keyword: 'Mutable Instruments', search_count: 65, is_pinned: 0 },
  { keyword: '鼓点 Rhythm', search_count: 58, is_pinned: 0 },
  { keyword: '主奏 Lead', search_count: 52, is_pinned: 0 },
  { keyword: 'Make Noise', search_count: 45, is_pinned: 0 },
  { keyword: 'Clouds', search_count: 38, is_pinned: 0 },
  { keyword: '夏日合成器', search_count: 31, is_pinned: 0 }
];

const insertHot = db.prepare(`
  INSERT OR IGNORE INTO search_hot_queries (keyword, search_count, is_pinned, is_active)
  VALUES (?, ?, ?, 1)
`);

const insertHotTx = db.transaction((items) => {
  for (const item of items) {
    insertHot.run(item.keyword, item.search_count, item.is_pinned);
  }
});

insertHotTx(hotKeywords);

const existingAds = db.prepare('SELECT COUNT(*) as cnt FROM search_ad_placements').get().cnt;
if (existingAds === 0) {
  db.prepare(`
    INSERT INTO search_ad_placements (title, description, image_url, link_url, link_type, position, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    '🎹 探索精选合成器 Patch',
    '浏览社区最受欢迎的音色预设，激发你的创作灵感',
    'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
    '/patches',
    'internal',
    'search_top',
    0,
    1
  );

  db.prepare(`
    INSERT INTO search_ad_placements (title, description, image_url, link_url, link_type, position, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    '🔥 夏日氛围合成器专题',
    '精选适合夏日聆听的氛围合成器 Patch 合集',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    '/collections/1',
    'internal',
    'search_top',
    1,
    1
  );
}

console.log('搜索中心数据初始化完成！');
console.log(`- 热搜词: ${db.prepare('SELECT COUNT(*) as cnt FROM search_hot_queries').get().cnt} 条`);
console.log(`- 运营位: ${db.prepare('SELECT COUNT(*) as cnt FROM search_ad_placements').get().cnt} 条`);
