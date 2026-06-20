const db = require('../db');

const DEFAULT_LOCALE = 'zh_cn';
const SUPPORTED_LOCALES = ['zh_cn', 'en_us'];

const getLocaleFromRequest = (ctx) => {
  const xLocale = ctx.headers['x-locale']?.toLowerCase().replace('-', '_');
  const headerLocale = ctx.headers['accept-language']?.toLowerCase().replace('-', '_');
  const queryLocale = ctx.query.locale?.toLowerCase().replace('-', '_');
  const locale = queryLocale || xLocale || headerLocale || DEFAULT_LOCALE;
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
};

const translate = (key, locale = DEFAULT_LOCALE, params = {}) => {
  if (!key) return key;
  const localeColumn = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  const row = db.prepare(`
    SELECT ${localeColumn} as value FROM i18n_translations
    WHERE translation_key = ? AND is_active = 1
  `).get(key);

  let result = row?.value || key;
  Object.entries(params).forEach(([k, v]) => {
    result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  });
  return result;
};

const getAllTranslations = async (ctx) => {
  const { locale, category } = ctx.query;
  const targetLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;

  let sql = `SELECT translation_key, ${targetLocale} as value FROM i18n_translations WHERE is_active = 1`;
  const params = [];

  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }

  const rows = db.prepare(sql).all(...params);
  const result = {};
  rows.forEach(row => {
    result[row.translation_key] = row.value;
  });

  ctx.body = {
    locale: targetLocale,
    translations: result
  };
};

const getTranslationList = async (ctx) => {
  const { page = 1, pageSize = 20, keyword, category, is_active } = ctx.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let whereClauses = [];
  let params = [];

  if (keyword) {
    whereClauses.push(`(translation_key LIKE ? OR zh_cn LIKE ? OR en_us LIKE ? OR description LIKE ?)`);
    const likeKeyword = `%${keyword}%`;
    params.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword);
  }

  if (category) {
    whereClauses.push(`category = ?`);
    params.push(category);
  }

  if (is_active !== undefined && is_active !== '') {
    whereClauses.push(`is_active = ?`);
    params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) as total FROM i18n_translations ${whereSql}`;
  const { total } = db.prepare(countSql).get(...params);

  const listSql = `
    SELECT * FROM i18n_translations ${whereSql}
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
  `;
  const list = db.prepare(listSql).all(...params, parseInt(pageSize), offset);

  ctx.body = {
    list,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  };
};

const getTranslationById = async (ctx) => {
  const { id } = ctx.params;
  const row = db.prepare('SELECT * FROM i18n_translations WHERE id = ?').get(parseInt(id));

  if (!row) {
    ctx.status = 404;
    ctx.body = { error: '翻译条目不存在' };
    return;
  }

  ctx.body = row;
};

const createTranslation = async (ctx) => {
  const { translation_key, zh_cn, en_us, category = 'general', description = '' } = ctx.request.body;

  if (!translation_key) {
    ctx.status = 400;
    ctx.body = { error: '翻译 Key 不能为空' };
    return;
  }

  const exists = db.prepare('SELECT id FROM i18n_translations WHERE translation_key = ?').get(translation_key);
  if (exists) {
    ctx.status = 400;
    ctx.body = { error: '翻译 Key 已存在' };
    return;
  }

  const result = db.prepare(`
    INSERT INTO i18n_translations (translation_key, zh_cn, en_us, category, description, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(translation_key, zh_cn || '', en_us || '', category, description);

  const row = db.prepare('SELECT * FROM i18n_translations WHERE id = ?').get(result.lastInsertRowid);
  ctx.body = row;
};

const updateTranslation = async (ctx) => {
  const { id } = ctx.params;
  const { translation_key, zh_cn, en_us, category, description, is_active } = ctx.request.body;

  const existing = db.prepare('SELECT * FROM i18n_translations WHERE id = ?').get(parseInt(id));
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '翻译条目不存在' };
    return;
  }

  if (translation_key && translation_key !== existing.translation_key) {
    const duplicate = db.prepare('SELECT id FROM i18n_translations WHERE translation_key = ? AND id != ?')
      .get(translation_key, parseInt(id));
    if (duplicate) {
      ctx.status = 400;
      ctx.body = { error: '翻译 Key 已存在' };
      return;
    }
  }

  const updates = [];
  const params = [];

  if (translation_key !== undefined) { updates.push('translation_key = ?'); params.push(translation_key); }
  if (zh_cn !== undefined) { updates.push('zh_cn = ?'); params.push(zh_cn); }
  if (en_us !== undefined) { updates.push('en_us = ?'); params.push(en_us); }
  if (category !== undefined) { updates.push('category = ?'); params.push(category); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(parseInt(id));
    db.prepare(`UPDATE i18n_translations SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const row = db.prepare('SELECT * FROM i18n_translations WHERE id = ?').get(parseInt(id));
  ctx.body = row;
};

const deleteTranslation = async (ctx) => {
  const { id } = ctx.params;
  const existing = db.prepare('SELECT id FROM i18n_translations WHERE id = ?').get(parseInt(id));

  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '翻译条目不存在' };
    return;
  }

  db.prepare('DELETE FROM i18n_translations WHERE id = ?').run(parseInt(id));
  ctx.body = { success: true };
};

const toggleActive = async (ctx) => {
  const { id } = ctx.params;
  const { is_active } = ctx.request.body;

  const existing = db.prepare('SELECT id FROM i18n_translations WHERE id = ?').get(parseInt(id));
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '翻译条目不存在' };
    return;
  }

  db.prepare('UPDATE i18n_translations SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(is_active ? 1 : 0, parseInt(id));

  const row = db.prepare('SELECT * FROM i18n_translations WHERE id = ?').get(parseInt(id));
  ctx.body = row;
};

const getCategories = async (ctx) => {
  const rows = db.prepare('SELECT DISTINCT category FROM i18n_translations ORDER BY category').all();
  ctx.body = {
    categories: rows.map(r => r.category)
  };
};

const batchImport = async (ctx) => {
  const { translations, category = 'general', overwrite = false } = ctx.request.body;

  if (!Array.isArray(translations)) {
    ctx.status = 400;
    ctx.body = { error: 'translations 必须是数组' };
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  let updateCount = 0;
  const errors = [];

  const insertStmt = db.prepare(`
    INSERT INTO i18n_translations (translation_key, zh_cn, en_us, category, description, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  const updateStmt = db.prepare(`
    UPDATE i18n_translations SET zh_cn = ?, en_us = ?, category = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE translation_key = ?
  `);

  const checkStmt = db.prepare('SELECT id FROM i18n_translations WHERE translation_key = ?');

  const transaction = db.transaction((items) => {
    items.forEach((item, index) => {
      try {
        const { key, zh_cn, en_us, desc } = item;
        if (!key) {
          errors.push({ index, error: 'Key 不能为空' });
          return;
        }

        const exists = checkStmt.get(key);
        if (exists) {
          if (overwrite) {
            updateStmt.run(zh_cn || '', en_us || '', category, desc || '', key);
            updateCount++;
          } else {
            skipCount++;
          }
        } else {
          insertStmt.run(key, zh_cn || '', en_us || '', category, desc || '');
          successCount++;
        }
      } catch (e) {
        errors.push({ index, error: e.message });
      }
    });
  });

  transaction(translations);

  ctx.body = {
    success: true,
    successCount,
    updateCount,
    skipCount,
    errorCount: errors.length,
    errors
  };
};

const exportTranslations = async (ctx) => {
  const { category, locale, format = 'json' } = ctx.query;

  let sql = 'SELECT translation_key, zh_cn, en_us, category, description FROM i18n_translations WHERE is_active = 1';
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  const rows = db.prepare(sql).all(...params);

  if (format === 'json') {
    const result = {};
    rows.forEach(row => {
      if (locale === 'en_us') {
        result[row.translation_key] = row.en_us;
      } else if (locale === 'zh_cn') {
        result[row.translation_key] = row.zh_cn;
      } else {
        result[row.translation_key] = {
          zh_cn: row.zh_cn,
          en_us: row.en_us,
          category: row.category,
          description: row.description
        };
      }
    });
    ctx.body = result;
  } else {
    ctx.body = { list: rows };
  }
};

const syncWithDatabase = async (ctx) => {
  const { locale = 'zh_cn' } = ctx.request.body;
  const localeColumn = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;

  const rows = db.prepare(`
    SELECT translation_key, ${localeColumn} as value FROM i18n_translations WHERE is_active = 1
  `).all();

  const result = {};
  rows.forEach(row => {
    result[row.translation_key] = row.value;
  });

  ctx.body = {
    locale: localeColumn,
    count: rows.length,
    translations: result
  };
};

module.exports = {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getLocaleFromRequest,
  translate,
  getAllTranslations,
  getTranslationList,
  getTranslationById,
  createTranslation,
  updateTranslation,
  deleteTranslation,
  toggleActive,
  getCategories,
  batchImport,
  exportTranslations,
  syncWithDatabase
};
