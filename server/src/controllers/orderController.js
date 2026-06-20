const db = require('../db');
const { generateOrderNo } = require('./productController');

const PLATFORM_FEE_RATE = 0.3;

const getMyOrders = async (ctx) => {
  const userId = ctx.state.user.id;
  const { page = 1, pageSize = 20, status = '' } = ctx.query;
  const offset = (page - 1) * pageSize;

  let whereClause = 'o.user_id = ?';
  const params = [userId];

  if (status) {
    whereClause += ' AND o.status = ?';
    params.push(status);
  }

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as total FROM orders o
    WHERE ${whereClause}
  `);
  const { total } = totalStmt.get(...params);

  const listStmt = db.prepare(`
    SELECT o.*, p.title as patch_title, p.image_url as patch_image,
           pp.name as product_name, pp.price as product_price,
           u.username as creator_name, u.avatar as creator_avatar
    FROM orders o
    LEFT JOIN patches p ON o.patch_id = p.id
    LEFT JOIN patch_products pp ON o.product_id = pp.id
    LEFT JOIN users u ON p.user_id = u.id
    WHERE ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `);
  const list = listStmt.all(...params, parseInt(pageSize), offset);

  ctx.body = {
    list,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  };
};

const getOrderDetail = async (ctx) => {
  const userId = ctx.state.user.id;
  const { id } = ctx.params;

  const stmt = db.prepare(`
    SELECT o.*, p.title as patch_title, p.description as patch_description,
           p.image_url as patch_image, p.parameters as patch_parameters,
           p.cables as patch_cables, p.patch_file as patch_file,
           pp.name as product_name, pp.description as product_description,
           pp.price as product_price, u.username as creator_name,
           u.avatar as creator_avatar
    FROM orders o
    LEFT JOIN patches p ON o.patch_id = p.id
    LEFT JOIN patch_products pp ON o.product_id = pp.id
    LEFT JOIN users u ON p.user_id = u.id
    WHERE o.id = ? AND o.user_id = ?
  `);
  const order = stmt.get(id, userId);

  if (!order) {
    ctx.status = 404;
    ctx.body = { error: '订单不存在' };
    return;
  }

  ctx.body = order;
};

const createOrder = async (ctx) => {
  const userId = ctx.state.user.id;
  const { patch_id, product_id, payment_method = 'balance' } = ctx.request.body;

  if (!patch_id) {
    ctx.status = 400;
    ctx.body = { error: 'patch_id 为必填字段' };
    return;
  }

  const patchStmt = db.prepare('SELECT * FROM patches WHERE id = ?');
  const patch = patchStmt.get(patch_id);
  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  if (!patch.is_paid) {
    ctx.status = 400;
    ctx.body = { error: '该 Patch 不是付费内容' };
    return;
  }

  if (patch.user_id === userId) {
    ctx.status = 400;
    ctx.body = { error: '不能购买自己的作品' };
    return;
  }

  const permissionStmt = db.prepare(`
    SELECT * FROM patch_permissions WHERE user_id = ? AND patch_id = ?
  `);
  const existingPermission = permissionStmt.get(userId, patch_id);
  if (existingPermission) {
    ctx.status = 400;
    ctx.body = { error: '您已购买该 Patch，无需重复购买' };
    return;
  }

  let product;
  if (product_id) {
    const productStmt = db.prepare('SELECT * FROM patch_products WHERE id = ? AND patch_id = ? AND is_active = 1');
    product = productStmt.get(product_id, patch_id);
    if (!product) {
      ctx.status = 404;
      ctx.body = { error: '商品不存在或已下架' };
      return;
    }
  } else {
    const productStmt = db.prepare('SELECT * FROM patch_products WHERE patch_id = ? AND is_active = 1');
    product = productStmt.get(patch_id);
    if (!product) {
      ctx.status = 404;
      ctx.body = { error: '该 Patch 暂未设置商品' };
      return;
    }
  }

  const orderNo = generateOrderNo();
  const amount = product.price;

  const insertOrderStmt = db.prepare(`
    INSERT INTO orders 
    (order_no, user_id, patch_id, product_id, amount, currency, status, payment_method)
    VALUES (?, ?, ?, ?, ?, 'CNY', 'paid', ?)
  `);
  const orderResult = insertOrderStmt.run(
    orderNo,
    userId,
    patch_id,
    product.id,
    amount,
    payment_method
  );

  const orderId = orderResult.lastInsertRowid;

  const updateOrderStmt = db.prepare(`
    UPDATE orders SET paid_at = CURRENT_TIMESTAMP WHERE id = ?
  `);
  updateOrderStmt.run(orderId);

  const insertPermissionStmt = db.prepare(`
    INSERT OR IGNORE INTO patch_permissions 
    (user_id, patch_id, order_id, permission_type)
    VALUES (?, ?, ?, 'purchase')
  `);
  insertPermissionStmt.run(userId, patch_id, orderId);

  const platformFee = amount * PLATFORM_FEE_RATE;
  const netAmount = amount - platformFee;

  const insertEarningsStmt = db.prepare(`
    INSERT INTO creator_earnings 
    (creator_id, order_id, patch_id, amount, platform_fee, net_amount, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `);
  insertEarningsStmt.run(patch.user_id, orderId, patch_id, amount, platformFee, netAmount);

  const updateSalesStmt = db.prepare(`
    UPDATE patch_products SET sales_count = sales_count + 1 WHERE id = ?
  `);
  updateSalesStmt.run(product.id);

  ctx.body = {
    id: orderId,
    order_no: orderNo,
    message: '购买成功',
    amount
  };
};

const checkPermission = async (ctx) => {
  const userId = ctx.state.user ? ctx.state.user.id : null;
  const { patchId } = ctx.params;

  const result = {
    has_permission: false,
    permission_type: null,
    purchased_at: null
  };

  if (!userId) {
    ctx.body = result;
    return;
  }

  const patchStmt = db.prepare('SELECT user_id, is_paid FROM patches WHERE id = ?');
  const patch = patchStmt.get(patchId);

  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  if (patch.user_id === userId) {
    result.has_permission = true;
    result.permission_type = 'owner';
    ctx.body = result;
    return;
  }

  if (!patch.is_paid) {
    result.has_permission = true;
    result.permission_type = 'free';
    ctx.body = result;
    return;
  }

  const permissionStmt = db.prepare(`
    SELECT * FROM patch_permissions WHERE user_id = ? AND patch_id = ?
  `);
  const permission = permissionStmt.get(userId, patchId);

  if (permission) {
    result.has_permission = true;
    result.permission_type = permission.permission_type;
    result.purchased_at = permission.created_at;
  }

  ctx.body = result;
};

const getMyPermissions = async (ctx) => {
  const userId = ctx.state.user.id;
  const { page = 1, pageSize = 20 } = ctx.query;
  const offset = (page - 1) * pageSize;

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as total FROM patch_permissions pp
    WHERE pp.user_id = ?
  `);
  const { total } = totalStmt.get(userId);

  const listStmt = db.prepare(`
    SELECT pp.*, p.title as patch_title, p.image_url as patch_image,
           p.is_paid, o.amount as purchase_amount, o.order_no,
           u.username as creator_name, u.avatar as creator_avatar
    FROM patch_permissions pp
    LEFT JOIN patches p ON pp.patch_id = p.id
    LEFT JOIN orders o ON pp.order_id = o.id
    LEFT JOIN users u ON p.user_id = u.id
    WHERE pp.user_id = ?
    ORDER BY pp.created_at DESC
    LIMIT ? OFFSET ?
  `);
  const list = listStmt.all(userId, parseInt(pageSize), offset);

  ctx.body = {
    list,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  };
};

const getAllOrders = async (ctx) => {
  const { page = 1, pageSize = 20, keyword = '', status = '', start_date = '', end_date = '' } = ctx.query;
  const offset = (page - 1) * pageSize;

  let whereClause = '1=1';
  const params = [];

  if (keyword) {
    whereClause += ' AND (o.order_no LIKE ? OR u.username LIKE ? OR p.title LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    whereClause += ' AND o.status = ?';
    params.push(status);
  }

  if (start_date) {
    whereClause += ' AND o.created_at >= ?';
    params.push(start_date);
  }

  if (end_date) {
    whereClause += ' AND o.created_at <= ?';
    params.push(end_date);
  }

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as total FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN patches p ON o.patch_id = p.id
    WHERE ${whereClause}
  `);
  const { total } = totalStmt.get(...params);

  const listStmt = db.prepare(`
    SELECT o.*, u.username as buyer_name, u.avatar as buyer_avatar,
           p.title as patch_title, p.image_url as patch_image,
           pp.name as product_name,
           creator.username as creator_name, creator.avatar as creator_avatar
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN patches p ON o.patch_id = p.id
    LEFT JOIN patch_products pp ON o.product_id = pp.id
    LEFT JOIN users creator ON p.user_id = creator.id
    WHERE ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `);
  const list = listStmt.all(...params, parseInt(pageSize), offset);

  const statsStmt = db.prepare(`
    SELECT 
      COUNT(*) as total_orders,
      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_amount,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
      SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded_count
    FROM orders o
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

const getOrderStats = async (ctx) => {
  const stmt = db.prepare(`
    SELECT 
      COUNT(*) as total_orders,
      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as total_paid_orders,
      SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) as total_refunded,
      COUNT(DISTINCT user_id) as total_buyers
    FROM orders
  `);
  const stats = stmt.get();

  const todayStmt = db.prepare(`
    SELECT 
      COUNT(*) as today_orders,
      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as today_revenue
    FROM orders
    WHERE DATE(created_at) = DATE('now')
  `);
  const todayStats = todayStmt.get();

  ctx.body = {
    ...stats,
    ...todayStats,
    platform_fee_rate: PLATFORM_FEE_RATE
  };
};

module.exports = {
  getMyOrders,
  getOrderDetail,
  createOrder,
  checkPermission,
  getMyPermissions,
  getAllOrders,
  getOrderStats
};
