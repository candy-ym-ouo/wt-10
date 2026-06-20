const db = require('../db');

exports.getMyExperiments = async (ctx) => {
  const userId = ctx.state.user.id;
  const { page = 1, limit = 12, status, keyword } = ctx.query;
  const offset = (page - 1) * limit;

  let where = ['e.user_id = ?'];
  let params = [userId];

  if (status) {
    where.push('e.status = ?');
    params.push(status);
  }

  if (keyword) {
    where.push('(e.name LIKE ? OR e.description LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  const total = db.prepare(`SELECT COUNT(*) as count FROM patch_lab_experiments e ${whereSql}`).get(...params).count;

  const experiments = db.prepare(`
    SELECT e.*, p.title as patch_title,
      (SELECT COUNT(*) FROM patch_lab_snapshots s WHERE s.experiment_id = e.id) as snapshot_count
    FROM patch_lab_experiments e
    LEFT JOIN patches p ON e.patch_id = p.id
    ${whereSql}
    ORDER BY e.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  ctx.body = {
    list: experiments,
    total,
    page: parseInt(page),
    pageSize: parseInt(limit)
  };
};

exports.getExperimentDetail = async (ctx) => {
  const userId = ctx.state.user.id;
  const { id } = ctx.params;

  const experiment = db.prepare(`
    SELECT e.*, p.title as patch_title
    FROM patch_lab_experiments e
    LEFT JOIN patches p ON e.patch_id = p.id
    WHERE e.id = ? AND e.user_id = ?
  `).get(id, userId);

  if (!experiment) {
    ctx.status = 404;
    ctx.body = { error: '实验不存在' };
    return;
  }

  const snapshots = db.prepare(`
    SELECT * FROM patch_lab_snapshots
    WHERE experiment_id = ?
    ORDER BY created_at ASC
  `).all(id);

  const result = db.prepare(`
    SELECT r.*, s.label as preferred_label
    FROM patch_lab_results r
    LEFT JOIN patch_lab_snapshots s ON r.preferred_snapshot_id = s.id
    WHERE r.experiment_id = ?
  `).get(id);

  experiment.snapshots = snapshots.map(s => ({
    ...s,
    parameters: typeof s.parameters === 'string' ? JSON.parse(s.parameters) : s.parameters
  }));
  experiment.result = result || null;

  ctx.body = experiment;
};

exports.createExperiment = async (ctx) => {
  const userId = ctx.state.user.id;
  const { name, description, patch_id, status } = ctx.request.body;

  if (!name || !name.trim()) {
    ctx.status = 400;
    ctx.body = { error: '请输入实验名称' };
    return;
  }

  const result = db.prepare(`
    INSERT INTO patch_lab_experiments (user_id, name, description, patch_id, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, name.trim(), description || '', patch_id || null, status || 'draft');

  ctx.body = { id: result.lastInsertRowid, message: '创建成功' };
};

exports.updateExperiment = async (ctx) => {
  const userId = ctx.state.user.id;
  const { id } = ctx.params;
  const { name, description, status, patch_id } = ctx.request.body;

  const existing = db.prepare('SELECT * FROM patch_lab_experiments WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '实验不存在' };
    return;
  }

  db.prepare(`
    UPDATE patch_lab_experiments
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        patch_id = COALESCE(?, patch_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(name, description, status, patch_id, id, userId);

  ctx.body = { message: '更新成功' };
};

exports.deleteExperiment = async (ctx) => {
  const userId = ctx.state.user.id;
  const { id } = ctx.params;

  const existing = db.prepare('SELECT * FROM patch_lab_experiments WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '实验不存在' };
    return;
  }

  db.prepare('DELETE FROM patch_lab_experiments WHERE id = ?').run(id);

  ctx.body = { message: '删除成功' };
};

exports.createSnapshot = async (ctx) => {
  const userId = ctx.state.user.id;
  const { id } = ctx.params;
  const { label, parameters, notes } = ctx.request.body;

  const experiment = db.prepare('SELECT * FROM patch_lab_experiments WHERE id = ? AND user_id = ?').get(id, userId);
  if (!experiment) {
    ctx.status = 404;
    ctx.body = { error: '实验不存在' };
    return;
  }

  if (!label || !label.trim()) {
    ctx.status = 400;
    ctx.body = { error: '请输入快照标签' };
    return;
  }

  const paramsJson = typeof parameters === 'string' ? parameters : JSON.stringify(parameters || {});

  const result = db.prepare(`
    INSERT INTO patch_lab_snapshots (experiment_id, label, parameters, notes)
    VALUES (?, ?, ?, ?)
  `).run(id, label.trim(), paramsJson, notes || '');

  db.prepare('UPDATE patch_lab_experiments SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

  ctx.body = { id: result.lastInsertRowid, message: '快照保存成功' };
};

exports.updateSnapshot = async (ctx) => {
  const userId = ctx.state.user.id;
  const { id, snapshotId } = ctx.params;
  const { label, parameters, notes } = ctx.request.body;

  const experiment = db.prepare('SELECT * FROM patch_lab_experiments WHERE id = ? AND user_id = ?').get(id, userId);
  if (!experiment) {
    ctx.status = 404;
    ctx.body = { error: '实验不存在' };
    return;
  }

  const snapshot = db.prepare('SELECT * FROM patch_lab_snapshots WHERE id = ? AND experiment_id = ?').get(snapshotId, id);
  if (!snapshot) {
    ctx.status = 404;
    ctx.body = { error: '快照不存在' };
    return;
  }

  const paramsJson = parameters ? (typeof parameters === 'string' ? parameters : JSON.stringify(parameters)) : null;

  db.prepare(`
    UPDATE patch_lab_snapshots
    SET label = COALESCE(?, label),
        parameters = COALESCE(?, parameters),
        notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(label, paramsJson, notes, snapshotId);

  ctx.body = { message: '快照更新成功' };
};

exports.deleteSnapshot = async (ctx) => {
  const userId = ctx.state.user.id;
  const { id, snapshotId } = ctx.params;

  const experiment = db.prepare('SELECT * FROM patch_lab_experiments WHERE id = ? AND user_id = ?').get(id, userId);
  if (!experiment) {
    ctx.status = 404;
    ctx.body = { error: '实验不存在' };
    return;
  }

  db.prepare('DELETE FROM patch_lab_snapshots WHERE id = ? AND experiment_id = ?').run(snapshotId, id);

  ctx.body = { message: '快照删除成功' };
};

exports.saveResult = async (ctx) => {
  const userId = ctx.state.user.id;
  const { id } = ctx.params;
  const { preferred_snapshot_id, result_notes, rating } = ctx.request.body;

  const experiment = db.prepare('SELECT * FROM patch_lab_experiments WHERE id = ? AND user_id = ?').get(id, userId);
  if (!experiment) {
    ctx.status = 404;
    ctx.body = { error: '实验不存在' };
    return;
  }

  const existing = db.prepare('SELECT * FROM patch_lab_results WHERE experiment_id = ?').get(id);

  if (existing) {
    db.prepare(`
      UPDATE patch_lab_results
      SET preferred_snapshot_id = ?,
          result_notes = ?,
          rating = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE experiment_id = ?
    `).run(preferred_snapshot_id || null, result_notes || '', rating || 0, id);
    ctx.body = { message: '结果更新成功' };
  } else {
    db.prepare(`
      INSERT INTO patch_lab_results (experiment_id, preferred_snapshot_id, result_notes, rating)
      VALUES (?, ?, ?, ?)
    `).run(id, preferred_snapshot_id || null, result_notes || '', rating || 0);
    ctx.body = { message: '结果保存成功' };
  }

  db.prepare(`
    UPDATE patch_lab_experiments SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(id);
};

exports.getExperimentStats = async (ctx) => {
  const userId = ctx.state.user.id;

  const total = db.prepare('SELECT COUNT(*) as count FROM patch_lab_experiments WHERE user_id = ?').get(userId).count;
  const draft = db.prepare("SELECT COUNT(*) as count FROM patch_lab_experiments WHERE user_id = ? AND status = 'draft'").get(userId).count;
  const completed = db.prepare("SELECT COUNT(*) as count FROM patch_lab_experiments WHERE user_id = ? AND status = 'completed'").get(userId).count;

  ctx.body = { total, draft, completed };
};
