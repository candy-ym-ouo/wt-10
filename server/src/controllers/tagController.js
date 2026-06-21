const db = require('../db');

const getTags = (ctx) => {
  const {
    page = 1,
    pageSize = 20,
    keyword = '',
    sort = 'usage_count',
    order = 'desc',
    is_hot
  } = ctx.query;

  const allowedSorts = ['usage_count', 'name', 'sort_order', 'created_at', 'updated_at'];
  const allowedOrders = ['asc', 'desc'];
  const sortField = allowedSorts.includes(sort) ? sort : 'usage_count';
  const orderDir = allowedOrders.includes(order) ? order.toUpperCase() : 'DESC';

  let where = [];
  let params = [];

  if (keyword) {
    where.push('name LIKE ?');
    params.push(`%${keyword}%`);
  }

  if (is_hot !== undefined && is_hot !== '') {
    where.push('is_hot = ?');
    params.push(is_hot === '1' || is_hot === 'true' ? 1 : 0);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM tags ${whereClause}`).get(...params).cnt;

  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const tags = db.prepare(
    `SELECT * FROM tags ${whereClause} ORDER BY ${sortField} ${orderDir}, id ASC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(pageSize), offset);

  ctx.body = {
    tags,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  };
};

const getHotTags = (ctx) => {
  const { limit = 20 } = ctx.query;
  const tags = db.prepare(
    `SELECT * FROM tags WHERE is_hot = 1 ORDER BY sort_order ASC, usage_count DESC LIMIT ?`
  ).all(parseInt(limit));

  if (tags.length < parseInt(limit)) {
    const remaining = parseInt(limit) - tags.length;
    const excludeIds = tags.map(t => t.id);
    const excludeClause = excludeIds.length > 0
      ? `AND id NOT IN (${excludeIds.join(',')})`
      : '';
    const more = db.prepare(
      `SELECT * FROM tags WHERE 1=1 ${excludeClause} ORDER BY usage_count DESC LIMIT ?`
    ).all(remaining);
    tags.push(...more);
  }

  ctx.body = { tags };
};

const suggestTags = (ctx) => {
  const { q = '', limit = 10 } = ctx.query;

  if (!q.trim()) {
    const tags = db.prepare(
      `SELECT name, usage_count FROM tags ORDER BY usage_count DESC LIMIT ?`
    ).all(parseInt(limit));
    ctx.body = { suggestions: tags.map(t => t.name) };
    return;
  }

  const tags = db.prepare(
    `SELECT name, usage_count FROM tags WHERE name LIKE ? ORDER BY usage_count DESC LIMIT ?`
  ).all(`${q}%`, parseInt(limit));

  ctx.body = { suggestions: tags.map(t => t.name) };
};

const recalculateUsageCounts = () => {
  const patchRows = db.prepare("SELECT tags FROM patches WHERE tags IS NOT NULL AND tags != '[]' AND tags != ''").all();
  const articleRows = db.prepare("SELECT tags FROM articles WHERE tags IS NOT NULL AND tags != '[]' AND tags != ''").all();

  const tagCountMap = {};
  const countTag = (tagsStr) => {
    try {
      const tags = JSON.parse(tagsStr);
      if (Array.isArray(tags)) {
        tags.forEach(t => {
          const name = String(t).trim();
          if (name) {
            tagCountMap[name] = (tagCountMap[name] || 0) + 1;
          }
        });
      }
    } catch {}
  };

  patchRows.forEach(r => countTag(r.tags));
  articleRows.forEach(r => countTag(r.tags));

  return tagCountMap;
};

const mergeTags = (ctx) => {
  const { source_tags, target_tag } = ctx.request.body;

  if (!source_tags || !Array.isArray(source_tags) || source_tags.length === 0) {
    ctx.status = 400;
    ctx.body = { error: '请选择要合并的源标签' };
    return;
  }

  if (!target_tag || !target_tag.trim()) {
    ctx.status = 400;
    ctx.body = { error: '请输入目标标签' };
    return;
  }

  const targetName = target_tag.trim();
  if (source_tags.map(s => s.trim()).includes(targetName)) {
    ctx.status = 400;
    ctx.body = { error: '目标标签不能与源标签相同' };
    return;
  }

  let totalAffected = 0;

  const updateTagsInRows = (rows) => {
    for (const row of rows) {
      try {
        const tags = JSON.parse(row.tags || '[]');
        if (!Array.isArray(tags)) continue;

        let modified = false;
        const newTags = tags.map(t => {
          const trimmed = String(t).trim();
          if (source_tags.includes(trimmed)) {
            modified = true;
            return targetName;
          }
          return t;
        });

        const deduped = [...new Set(newTags)];
        if (modified) {
          db.prepare('UPDATE patches SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(JSON.stringify(deduped), row.id);
          totalAffected++;
        }
      } catch {}
    }
  };

  const updateArticleTagsInRows = (rows) => {
    for (const row of rows) {
      try {
        const tags = JSON.parse(row.tags || '[]');
        if (!Array.isArray(tags)) continue;

        let modified = false;
        const newTags = tags.map(t => {
          const trimmed = String(t).trim();
          if (source_tags.includes(trimmed)) {
            modified = true;
            return targetName;
          }
          return t;
        });

        const deduped = [...new Set(newTags)];
        if (modified) {
          db.prepare('UPDATE articles SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(JSON.stringify(deduped), row.id);
          totalAffected++;
        }
      } catch {}
    }
  };

  for (const srcTag of source_tags) {
    const trimmedSrc = srcTag.trim();

    const patchRows = db.prepare(
      "SELECT id, tags FROM patches WHERE tags LIKE ?"
    ).all(`%"${trimmedSrc}"%`);
    updateTagsInRows(patchRows);

    const articleRows = db.prepare(
      "SELECT id, tags FROM articles WHERE tags LIKE ?"
    ).all(`%"${trimmedSrc}"%`);
    updateArticleTagsInRows(articleRows);
  }

  const tagCountMap = recalculateUsageCounts();

  const upsertTag = db.prepare(
    `INSERT INTO tags (name, usage_count) VALUES (?, ?)
     ON CONFLICT(name) DO UPDATE SET usage_count = ?, updated_at = CURRENT_TIMESTAMP`
  );

  const allTagNames = new Set([...source_tags.map(s => s.trim()), targetName]);
  for (const name of allTagNames) {
    const count = tagCountMap[name] || 0;
    upsertTag.run(name, count, count);
  }

  for (const srcTag of source_tags) {
    const trimmedSrc = srcTag.trim();
    if (trimmedSrc !== targetName) {
      const srcRow = db.prepare('SELECT id FROM tags WHERE name = ?').get(trimmedSrc);
      if (srcRow) {
        db.prepare('DELETE FROM tags WHERE id = ?').run(srcRow.id);
      }
    }
  }

  for (const srcTag of source_tags) {
    db.prepare(
      'INSERT INTO tag_merge_logs (source_tag, target_tag, affected_count, operator_id) VALUES (?, ?, ?, ?)'
    ).run(srcTag.trim(), targetName, totalAffected, ctx.state.user?.id || null);
  }

  ctx.body = {
    message: '标签合并完成',
    affected_count: totalAffected,
    target_tag: targetName
  };
};

const updateTag = (ctx) => {
  const { id } = ctx.params;
  const { name, is_hot, sort_order } = ctx.request.body;

  const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '标签不存在' };
    return;
  }

  if (name !== undefined && name.trim() !== existing.name) {
    const newName = name.trim();
    const duplicate = db.prepare('SELECT id FROM tags WHERE name = ? AND id != ?').get(newName, id);
    if (duplicate) {
      ctx.status = 400;
      ctx.body = { error: '标签名已存在' };
      return;
    }

    const patchRows = db.prepare("SELECT id, tags FROM patches WHERE tags LIKE ?").all(`%"${existing.name}"%`);
    for (const row of patchRows) {
      try {
        const tags = JSON.parse(row.tags || '[]');
        if (Array.isArray(tags)) {
          const newTags = tags.map(t => t === existing.name ? newName : t);
          db.prepare('UPDATE patches SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(JSON.stringify(newTags), row.id);
        }
      } catch {}
    }

    const articleRows = db.prepare("SELECT id, tags FROM articles WHERE tags LIKE ?").all(`%"${existing.name}"%`);
    for (const row of articleRows) {
      try {
        const tags = JSON.parse(row.tags || '[]');
        if (Array.isArray(tags)) {
          const newTags = tags.map(t => t === existing.name ? newName : t);
          db.prepare('UPDATE articles SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(JSON.stringify(newTags), row.id);
        }
      } catch {}
    }
  }

  const updates = [];
  const values = [];

  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name.trim());
  }
  if (is_hot !== undefined) {
    updates.push('is_hot = ?');
    values.push(is_hot ? 1 : 0);
  }
  if (sort_order !== undefined) {
    updates.push('sort_order = ?');
    values.push(parseInt(sort_order));
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  const updated = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  ctx.body = { tag: updated };
};

const deleteTag = (ctx) => {
  const { id } = ctx.params;

  const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '标签不存在' };
    return;
  }

  db.prepare('DELETE FROM tags WHERE id = ?').run(id);

  ctx.body = { message: '标签已删除' };
};

const toggleHot = (ctx) => {
  const { id } = ctx.params;
  const { is_hot } = ctx.request.body;

  const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '标签不存在' };
    return;
  }

  db.prepare('UPDATE tags SET is_hot = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(is_hot ? 1 : 0, id);

  const updated = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  ctx.body = { tag: updated };
};

const recalculate = (ctx) => {
  const tagCountMap = recalculateUsageCounts();

  const allExisting = db.prepare('SELECT id, name FROM tags').all();

  for (const row of allExisting) {
    const count = tagCountMap[row.name] || 0;
    db.prepare('UPDATE tags SET usage_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(count, row.id);
    if (count === 0) {
      delete tagCountMap[row.name];
    } else {
      delete tagCountMap[row.name];
    }
  }

  const insertTag = db.prepare(
    `INSERT OR IGNORE INTO tags (name, usage_count) VALUES (?, ?)`
  );
  for (const [name, count] of Object.entries(tagCountMap)) {
    if (count > 0) {
      insertTag.run(name, count);
    }
  }

  const totalTags = db.prepare('SELECT COUNT(*) as cnt FROM tags').get().cnt;
  ctx.body = {
    message: '标签使用量已重新计算',
    total_tags: totalTags
  };
};

const getMergeLogs = (ctx) => {
  const { page = 1, pageSize = 20 } = ctx.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  const total = db.prepare('SELECT COUNT(*) as cnt FROM tag_merge_logs').get().cnt;
  const logs = db.prepare(
    `SELECT ml.*, u.username as operator_name
     FROM tag_merge_logs ml
     LEFT JOIN users u ON ml.operator_id = u.id
     ORDER BY ml.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(parseInt(pageSize), offset);

  ctx.body = {
    logs,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  };
};

module.exports = {
  getTags,
  getHotTags,
  suggestTags,
  mergeTags,
  updateTag,
  deleteTag,
  toggleHot,
  recalculate,
  getMergeLogs
};
