const db = require('./src/db');

const tables = ['module_wiki', 'module_parameters', 'module_tips', 'module_recommended_patches'];
let allOk = true;

tables.forEach(table => {
  const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
  if (result) {
    console.log('OK: ' + table);
  } else {
    console.log('MISSING: ' + table);
    allOk = false;
  }
});

console.log(allOk ? 'All tables present!' : 'Some tables missing!');

const wikiController = require('./src/controllers/wikiController');
console.log('Wiki controller loaded:', typeof wikiController);
console.log('Methods:', Object.keys(wikiController).join(', '));
