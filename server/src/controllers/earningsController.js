const db = require('../db');

const getMyEarnings = async (ctx) => {
  const creatorId = ctx.state.user.id;
  const { page = 1, pageSize = 20, status = '' } = ctx.query;
  const offset = (page - 1) * pageSize;

  let whereClause = 'ce.creator_id = ?';
  const params = [creatorId];

  if (status) {
    whereClause += ' AND ce.status = ?';
    params.push(status);
  }

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as total FROM creator_earnings ce
    WHERE ${whereClause}
  `);
  const { total } = totalStmt.get(...params);

  const listStmt = db.prepare(`
    SELECT ce.*, o.order_no, o.amount as order_amount,
           o.paid_at, p.title as patch_title, p.image_url as patch_image,
           u.username as buyer_name, u.avatar as buyer_avatar
    FROM creator_earnings ce
    LEFT JOIN orders o ON ce.order_id = o.id
    LEFT JOIN patches p ON ce.patch_id = p.id
    LEFT JOIN users u ON o.user_id = u.id
    WHERE ${whereClause}
    ORDER BY ce.created_at DESC
    LIMIT ? OFFSET ?
  `);
  const list = listStmt.all(...params, parseInt(pageSize), offset);

  const statsStmt = db.prepare(`
    SELECT 
      SUM(amount) as total_earnings,
      SUM(platform_fee) as total_platform_fee,
      SUM(net_amount) as total_net_earnings,
      SUM(CASE WHEN status = 'pending' THEN net_amount ELSE 0 END) as pending_earnings,
      SUM(CASE WHEN status = 'settled' THEN net_amount ELSE 0 END) as settled_earnings,
      COUNT(*) as total_sales
    FROM creator_earnings ce
    WHERE ce.creator_id = ?
  `);
  const stats = statsStmt.get(creatorId);

  ctx.body = {
    list,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    stats
  };
};

const getEarningsOverview = async (ctx) => {
  const creatorId = ctx.state.user.id;

  const stmt = db.prepare(`
    SELECT 
      SUM(ce.amount) as total_earnings,
      SUM(ce.platform_fee) as total_platform_fee,
      SUM(ce.net_amount) as total_net_earnings,
      SUM(CASE WHEN ce.status = 'pending' THEN ce.net_amount ELSE 0 END) as pending_earnings,
      SUM(CASE WHEN ce.status = 'settled' THEN ce.net_amount ELSE 0 END) as settled_earnings,
      COUNT(DISTINCT ce.patch_id) as paid_patches_count,
      COUNT(*) as total_sales,
      COUNT(DISTINCT o.user_id) as total_buyers
    FROM creator_earnings ce
    LEFT JOIN orders o ON ce.order_id = o.id
    WHERE ce.creator_id = ?
  `);
  const overview = stmt.get(creatorId);

  const patchStatsStmt = db.prepare(`
    SELECT 
      p.id as patch_id,
      p.title as patch_title,
      p.image_url as patch_image,
      COUNT(ce.id) as sales_count,
      SUM(ce.net_amount) as net_earnings
    FROM creator_earnings ce
    LEFT JOIN patches p ON ce.patch_id = p.id
    WHERE ce.creator_id = ?
    GROUP BY ce.patch_id
    ORDER BY net_earnings DESC
    LIMIT 5
  `);
  const topPatches = patchStatsStmt.all(creatorId);

  const recentSalesStmt = db.prepare(`
    SELECT ce.*, o.order_no, o.amount, o.paid_at,
           p.title as patch_title, u.username as buyer_name
    FROM creator_earnings ce
    LEFT JOIN orders o ON ce.order_id = o.id
    LEFT JOIN patches p ON ce.patch_id = p.id
    LEFT JOIN users u ON o.user_id = u.id
    WHERE ce.creator_id = ?
    ORDER BY ce.created_at DESC
    LIMIT 10
  `);
  const recentSales = recentSalesStmt.all(creatorId);

  ctx.body = {
    overview,
    topPatches,
    recentSales
  };
};

const createWithdrawal = async (ctx) => {
  const creatorId = ctx.state.user.id;
  const { amount, payment_method, payment_account } = ctx.request.body;

  if (!amount || !payment_method || !payment_account) {
    ctx.status = 400;
    ctx.body = { error: 'amount、payment_method 和 payment_account 为必填字段' };
    return;
  }

  if (amount <= 0) {
    ctx.status = 400;
    ctx.body = { error: '提现金额必须大于0' };
    return;
  }

  const stmt = db.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'pending' THEN net_amount ELSE 0 END) as available_balance
    FROM creator_earnings
    WHERE creator_id = ?
  `);
  const { available_balance } = stmt.get(creatorId);

  if (!available_balance || amount > available_balance) {
    ctx.status = 400;
    ctx.body = { error: '可提现余额不足' };
    return;
  }

  const insertStmt = db.prepare(`
    INSERT INTO creator_withdrawals 
    (creator_id, amount, payment_method, payment_account)
    VALUES (?, ?, ?, ?)
  `);
  const result = insertStmt.run(creatorId, amount, payment_method, payment_account);

  ctx.body = {
    id: result.lastInsertRowid,
    message: '提现申请已提交'
  };
};

const getMyWithdrawals = async (ctx) => {
  const creatorId = ctx.state.user.id;
  const { page = 1, pageSize = 20, status = '' } = ctx.query;
  const offset = (page - 1) * pageSize;

  let whereClause = 'creator_id = ?';
  const params = [creatorId];

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as total FROM creator_withdrawals
    WHERE ${whereClause}
  `);
  const { total } = totalStmt.get(...params);

  const listStmt = db.prepare(`
    SELECT * FROM creator_withdrawals
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  const list = listStmt.all(...params, parseInt(pageSize), offset);

  const balanceStmt = db.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'pending' THEN net_amount ELSE 0 END) as available_balance
    FROM creator_earnings
    WHERE creator_id = ?
  `);
  const { available_balance } = balanceStmt.get(creatorId);

  ctx.body = {
    list,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    available_balance: available_balance || 0
  };
};

const getAllWithdrawals = async (ctx) => {
  const { page = 1, pageSize = 20, status = '', keyword = '' } = ctx.query;
  const offset = (page - 1) * pageSize;

  let whereClause = '1=1';
  const params = [];

  if (status) {
    whereClause += ' AND cw.status = ?';
    params.push(status);
  }

  if (keyword) {
    whereClause += ' AND u.username LIKE ?';
    params.push(`%${keyword}%`);
  }

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as total FROM creator_withdrawals cw
    LEFT JOIN users u ON cw.creator_id = u.id
    WHERE ${whereClause}
  `);
  const { total } = totalStmt.get(...params);

  const listStmt = db.prepare(`
    SELECT cw.*, u.username as creator_name, u.avatar as creator_avatar
    FROM creator_withdrawals cw
    LEFT JOIN users u ON cw.creator_id = u.id
    WHERE ${whereClause}
    ORDER BY cw.created_at DESC
    LIMIT ? OFFSET ?
  `);
  const list = listStmt.all(...params, parseInt(pageSize), offset);

  const statsStmt = db.prepare(`
    SELECT 
      COUNT(*) as total_requests,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
      SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
      SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END) as rejected_amount,
      SUM(CASE WHEN status = 'transferred' THEN amount ELSE 0 END) as transferred_amount
    FROM creator_withdrawals cw
    WHERE ${whereClause}
  `);
  const stats = statsStmt.get(...params);

  ctx.body = {
    list,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    stats
  };
};

const reviewWithdrawal = async (ctx) => {
  const { id } = ctx.params;
  const { status, review_note } = ctx.request.body;
  const adminId = ctx.state.user.id;

  if (!status || !['approved', 'rejected', 'transferred'].includes(status)) {
    ctx.status = 400;
    ctx.body = { error: '无效的状态值' };
    return;
  }

  const stmt = db.prepare('SELECT * FROM creator_withdrawals WHERE id = ?');
  const withdrawal = stmt.get(id);

  if (!withdrawal) {
    ctx.status = 404;
    ctx.body = { error: '提现申请不存在' };
    return;
  }

  if (withdrawal.status !== 'pending') {
    ctx.status = 400;
    ctx.body = { error: '该申请已处理，无法重复审核' };
    return;
  }

  const updateStmt = db.prepare(`
    UPDATE creator_withdrawals SET
      status = ?,
      review_note = ?,
      reviewed_by = ?,
      reviewed_at = CURRENT_TIMESTAMP,
      ${status === 'transferred' ? 'transferred_at = CURRENT_TIMESTAMP,' : ''}
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  updateStmt.run(status, review_note || null, adminId, id);

  if (status === 'approved' || status === 'transferred') {
    const settleEarningsStmt = db.prepare(`
      UPDATE creator_earnings 
      SET status = 'settled', settled_at = CURRENT_TIMESTAMP
      WHERE creator_id = ? AND status = 'pending'
      ORDER BY created_at ASC
      LIMIT (
        SELECT COUNT(*) FROM creator_earnings 
        WHERE creator_id = ? AND status = 'pending'
      )
    `);
    settleEarningsStmt.run(withdrawal.creator_id, withdrawal.creator_id);
  }

  ctx.body = { message: '审核完成' };
};

const getEarningsStats = async (ctx) => {
  const stmt = db.prepare(`
    SELECT 
      SUM(ce.amount) as total_earnings,
      SUM(ce.platform_fee) as total_platform_fee,
      SUM(ce.net_amount) as total_creator_earnings,
      SUM(CASE WHEN ce.status = 'pending' THEN ce.net_amount ELSE 0 END) as total_pending,
      SUM(CASE WHEN ce.status = 'settled' THEN ce.net_amount ELSE 0 END) as total_settled,
      COUNT(DISTINCT ce.creator_id) as earning_creators,
      COUNT(DISTINCT ce.patch_id) as paid_patches,
      COUNT(*) as total_transactions
    FROM creator_earnings ce
  `);
  const stats = stmt.get();

  const topCreatorsStmt = db.prepare(`
    SELECT 
      u.id as creator_id,
      u.username as creator_name,
      u.avatar as creator_avatar,
      SUM(ce.net_amount) as total_earnings,
      COUNT(*) as sales_count
    FROM creator_earnings ce
    LEFT JOIN users u ON ce.creator_id = u.id
    GROUP BY ce.creator_id
    ORDER BY total_earnings DESC
    LIMIT 10
  `);
  const topCreators = topCreatorsStmt.all();

  const topPatchesStmt = db.prepare(`
    SELECT 
      p.id as patch_id,
      p.title as patch_title,
      p.image_url as patch_image,
      u.username as creator_name,
      SUM(ce.net_amount) as total_earnings,
      COUNT(*) as sales_count
    FROM creator_earnings ce
    LEFT JOIN patches p ON ce.patch_id = p.id
    LEFT JOIN users u ON p.user_id = u.id
    GROUP BY ce.patch_id
    ORDER BY total_earnings DESC
    LIMIT 10
  `);
  const topPatches = topPatchesStmt.all();

  ctx.body = {
    stats,
    topCreators,
    topPatches
  };
};

module.exports = {
  getMyEarnings,
  getEarningsOverview,
  createWithdrawal,
  getMyWithdrawals,
  getAllWithdrawals,
  reviewWithdrawal,
  getEarningsStats
};
