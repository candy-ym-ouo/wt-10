const db = require('../db');

const generateOrderNo = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD${timestamp}${random}`;
};

const getProductList = async (ctx) => {
  const { page = 1, pageSize = 20, keyword = '', status = '', patch_id = '' } = ctx.query;
  const offset = (page - 1) * pageSize;

  let whereClause = '1=1';
  const params = [];

  if (keyword) {
    whereClause += ' AND (pp.name LIKE ? OR p.title LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status === 'active') {
    whereClause += ' AND pp.is_active = 1';
  } else if (status === 'inactive') {
    whereClause += ' AND pp.is_active = 0';
  }

  if (patch_id) {
    whereClause += ' AND pp.patch_id = ?';
    params.push(patch_id);
  }

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as total FROM patch_products pp
    LEFT JOIN patches p ON pp.patch_id = p.id
    WHERE ${whereClause}
  `);
  const { total } = totalStmt.get(...params);

  const listStmt = db.prepare(`
    SELECT pp.*, p.title as patch_title, p.user_id as creator_id,
           u.username as creator_name, u.avatar as creator_avatar,
           p.image_url as patch_image, p.preview_content
    FROM patch_products pp
    LEFT JOIN patches p ON pp.patch_id = p.id
    LEFT JOIN users u ON p.user_id = u.id
    WHERE ${whereClause}
    ORDER BY pp.created_at DESC
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

const getProductDetail = async (ctx) => {
  const { id } = ctx.params;

  const stmt = db.prepare(`
    SELECT pp.*, p.title as patch_title, p.description as patch_description,
           p.user_id as creator_id, u.username as creator_name,
           u.avatar as creator_avatar, p.image_url as patch_image,
           p.preview_content, p.is_paid, p.price as patch_price
    FROM patch_products pp
    LEFT JOIN patches p ON pp.patch_id = p.id
    LEFT JOIN users u ON p.user_id = u.id
    WHERE pp.id = ?
  `);
  const product = stmt.get(id);

  if (!product) {
    ctx.status = 404;
    ctx.body = { error: '商品不存在' };
    return;
  }

  ctx.body = product;
};

const createProduct = async (ctx) => {
  const { patch_id, name, description, price, original_price, currency, is_active, is_discount, discount_start_date, discount_end_date } = ctx.request.body;

  if (!patch_id || !name || price === undefined) {
    ctx.status = 400;
    ctx.body = { error: 'patch_id、name 和 price 为必填字段' };
    return;
  }

  const patchStmt = db.prepare('SELECT * FROM patches WHERE id = ? AND deleted_at IS NULL');
  const patch = patchStmt.get(patch_id);
  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  const existingStmt = db.prepare('SELECT * FROM patch_products WHERE patch_id = ?');
  const existing = existingStmt.get(patch_id);
  if (existing) {
    ctx.status = 400;
    ctx.body = { error: '该 Patch 已存在商品' };
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO patch_products 
    (patch_id, name, description, price, original_price, currency, is_active, is_discount, discount_start_date, discount_end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    patch_id,
    name,
    description || null,
    price,
    original_price || null,
    currency || 'CNY',
    is_active !== undefined ? is_active : 1,
    is_discount || 0,
    discount_start_date || null,
    discount_end_date || null
  );

  const updatePatchStmt = db.prepare(`
    UPDATE patches SET is_paid = 1, price = ? WHERE id = ?
  `);
  updatePatchStmt.run(price, patch_id);

  ctx.body = {
    id: result.lastInsertRowid,
    message: '商品创建成功'
  };
};

const updateProduct = async (ctx) => {
  const { id } = ctx.params;
  const { name, description, price, original_price, currency, is_active, is_discount, discount_start_date, discount_end_date } = ctx.request.body;

  const stmt = db.prepare('SELECT * FROM patch_products WHERE id = ?');
  const product = stmt.get(id);
  if (!product) {
    ctx.status = 404;
    ctx.body = { error: '商品不存在' };
    return;
  }

  const updateStmt = db.prepare(`
    UPDATE patch_products SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      price = COALESCE(?, price),
      original_price = COALESCE(?, original_price),
      currency = COALESCE(?, currency),
      is_active = COALESCE(?, is_active),
      is_discount = COALESCE(?, is_discount),
      discount_start_date = COALESCE(?, discount_start_date),
      discount_end_date = COALESCE(?, discount_end_date),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  updateStmt.run(
    name,
    description,
    price,
    original_price,
    currency,
    is_active,
    is_discount,
    discount_start_date,
    discount_end_date,
    id
  );

  if (price !== undefined) {
    const updatePatchStmt = db.prepare(`
      UPDATE patches SET price = ? WHERE id = ?
    `);
    updatePatchStmt.run(price, product.patch_id);
  }

  ctx.body = { message: '商品更新成功' };
};

const deleteProduct = async (ctx) => {
  const { id } = ctx.params;

  const stmt = db.prepare('SELECT * FROM patch_products WHERE id = ?');
  const product = stmt.get(id);
  if (!product) {
    ctx.status = 404;
    ctx.body = { error: '商品不存在' };
    return;
  }

  const deleteStmt = db.prepare('DELETE FROM patch_products WHERE id = ?');
  deleteStmt.run(id);

  const updatePatchStmt = db.prepare(`
    UPDATE patches SET is_paid = 0, price = 0 WHERE id = ?
  `);
  updatePatchStmt.run(product.patch_id);

  ctx.body = { message: '商品删除成功' };
};

const toggleProductActive = async (ctx) => {
  const { id } = ctx.params;
  const { is_active } = ctx.request.body;

  const stmt = db.prepare('UPDATE patch_products SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const result = stmt.run(is_active ? 1 : 0, id);

  if (result.changes === 0) {
    ctx.status = 404;
    ctx.body = { error: '商品不存在' };
    return;
  }

  ctx.body = { message: is_active ? '商品已上架' : '商品已下架' };
};

const getProductByPatchId = async (ctx) => {
  const { patchId } = ctx.params;

  const stmt = db.prepare(`
    SELECT pp.*, p.title as patch_title, p.description as patch_description,
           p.user_id as creator_id, u.username as creator_name,
           u.avatar as creator_avatar, p.image_url as patch_image,
           p.preview_content, p.is_paid
    FROM patch_products pp
    LEFT JOIN patches p ON pp.patch_id = p.id
    LEFT JOIN users u ON p.user_id = u.id
    WHERE pp.patch_id = ? AND pp.is_active = 1
  `);
  const product = stmt.get(patchId);

  if (!product) {
    ctx.body = null;
    return;
  }

  ctx.body = product;
};

module.exports = {
  getProductList,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
  getProductByPatchId,
  generateOrderNo
};
