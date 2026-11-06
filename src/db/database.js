const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const config = require('../config');

const dbPath = path.resolve(__dirname, '../../shop.db');
const db = new DatabaseSync(dbPath);

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      telegram_id INTEGER PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📁',
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      price_vnd INTEGER NOT NULL,
      pricing_type TEXT DEFAULT 'MONTHLY', -- 'MONTHLY' (hỗ trợ gói 1,3,6,12T) hoặc 'FIXED' (gói cố định)
      description TEXT,
      warranty_info TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS stock_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      account_data TEXT NOT NULL,
      is_sold INTEGER DEFAULT 0,
      order_id INTEGER NULL,
      reserved_until INTEGER NULL,
      reserved_by_order_code TEXT NULL,
      created_at TEXT,
      sold_at TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      user_name TEXT,
      product_id INTEGER NOT NULL,
      duration_months INTEGER DEFAULT 1,
      quantity INTEGER NOT NULL DEFAULT 1,
      total_price INTEGER NOT NULL,
      status TEXT DEFAULT 'PENDING',
      delivered_accounts TEXT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT,
      paid_at TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE INDEX IF NOT EXISTS idx_stock_prod_avail ON stock_items (product_id, is_sold, reserved_until);
    CREATE INDEX IF NOT EXISTS idx_orders_code ON orders (order_code);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
  `);
}

function registerUser(telegramId, username, firstName) {
  const existing = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
  if (!existing) {
    const isFirstUser = db.prepare('SELECT COUNT(*) as count FROM users').get().count === 0;
    const isAdmin = (config.ADMIN_ID && config.ADMIN_ID === telegramId) || isFirstUser ? 1 : 0;
    db.prepare(`
      INSERT INTO users (telegram_id, username, first_name, is_admin, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(telegramId, username || '', firstName || '', isAdmin, new Date().toISOString());
    return { telegramId, isAdmin: !!isAdmin };
  } else {
    if (config.ADMIN_ID && config.ADMIN_ID === telegramId && !existing.is_admin) {
      db.prepare('UPDATE users SET is_admin = 1 WHERE telegram_id = ?').run(telegramId);
      return { telegramId, isAdmin: true };
    }
    return { telegramId, isAdmin: !!existing.is_admin };
  }
}

function isAdmin(telegramId) {
  if (config.ADMIN_ID && config.ADMIN_ID === telegramId) return true;
  const user = db.prepare('SELECT is_admin FROM users WHERE telegram_id = ?').get(telegramId);
  return user ? !!user.is_admin : false;
}

function setAdmin(telegramId) {
  db.prepare('UPDATE users SET is_admin = 1 WHERE telegram_id = ?').run(telegramId);
}

function getCategories() {
  const now = Date.now();
  const rows = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as product_count,
      (SELECT COUNT(*) FROM stock_items s 
       JOIN products p ON s.product_id = p.id 
       WHERE p.category_id = c.id AND s.is_sold = 0 AND (s.reserved_until IS NULL OR s.reserved_until < ?)) as total_stock
    FROM categories c
    ORDER BY c.sort_order ASC, c.id ASC
  `).all(now);
  return rows;
}

function getCategoryById(id) {
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

function getProductsByCategory(categoryId) {
  const now = Date.now();
  const rows = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM stock_items s 
       WHERE s.product_id = p.id AND s.is_sold = 0 AND (s.reserved_until IS NULL OR s.reserved_until < ?)) as stock_count
    FROM products p
    WHERE p.category_id = ?
    ORDER BY p.sort_order ASC, p.id ASC
  `).all(now, categoryId);
  return rows;
}

function getProductById(id) {
  const now = Date.now();
  const prod = db.prepare(`
    SELECT p.*, c.name as category_name, c.icon as category_icon,
      (SELECT COUNT(*) FROM stock_items s 
       WHERE s.product_id = p.id AND s.is_sold = 0 AND (s.reserved_until IS NULL OR s.reserved_until < ?)) as stock_count
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(now, id);
  return prod;
}

/**
 * Tính giá theo số tháng với công thức chiết khấu:
 * 1T: giá * 1
 * 3T: giá * 3 - 20k
 * 6T: giá * 6 - 50k
 * 12T: giá * 12 - 100k
 */
function calculatePackagePrice(basePrice, months) {
  months = parseInt(months, 10);
  let discount = 0;
  if (months === 3) discount = 20000;
  else if (months === 6) discount = 50000;
  else if (months === 12) discount = 100000;
  return Math.max(basePrice * months - discount, 0);
}

function createOrder(userId, userName, productId, months = 1, quantity = 1) {
  const now = Date.now();
  const product = getProductById(productId);
  if (!product) throw new Error('Sản phẩm không tồn tại!');
  if (product.stock_count < quantity) {
    throw new Error(`Kho chỉ còn ${product.stock_count} tài khoản, không đủ cung cấp!`);
  }

  // Lấy các stock_item khả dụng
  const items = db.prepare(`
    SELECT id FROM stock_items 
    WHERE product_id = ? AND is_sold = 0 AND (reserved_until IS NULL OR reserved_until < ?)
    LIMIT ?
  `).all(productId, now, quantity);

  if (items.length < quantity) {
    throw new Error(`Kho không đủ hàng khả dụng (vừa có khách khác giữ chỗ)!`);
  }

  let orderCode = 'DH' + Math.floor(1000 + Math.random() * 9000);
  while (db.prepare('SELECT id FROM orders WHERE order_code = ?').get(orderCode)) {
    orderCode = 'DH' + Math.floor(1000 + Math.random() * 9000);
  }

  const holdMs = config.ORDER_HOLD_MINUTES * 60 * 1000;
  const expiresAt = now + holdMs;

  let totalPrice = 0;
  if (product.pricing_type === 'MONTHLY') {
    totalPrice = calculatePackagePrice(product.price_vnd, months);
  } else {
    totalPrice = product.price_vnd * quantity;
  }

  // Khóa các item cho đơn hàng này
  const itemIds = items.map(i => i.id);
  const placeholders = itemIds.map(() => '?').join(',');
  db.prepare(`
    UPDATE stock_items 
    SET reserved_until = ?, reserved_by_order_code = ?
    WHERE id IN (${placeholders})
  `).run(expiresAt, orderCode, ...itemIds);

  // Tạo đơn
  db.prepare(`
    INSERT INTO orders (order_code, user_id, user_name, product_id, duration_months, quantity, total_price, status, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).run(orderCode, userId, userName || '', productId, months, quantity, totalPrice, expiresAt, new Date().toISOString());

  return {
    orderCode,
    productId,
    productName: product.name,
    durationMonths: months,
    pricingType: product.pricing_type,
    quantity,
    totalPrice,
    expiresAt
  };
}

function cancelOrder(orderCode, userId) {
  const order = db.prepare('SELECT * FROM orders WHERE order_code = ?').get(orderCode);
  if (!order) return false;
  if (userId && order.user_id !== userId) return false;
  if (order.status !== 'PENDING') return false;

  db.prepare(`UPDATE orders SET status = 'CANCELLED' WHERE order_code = ?`).run(orderCode);
  db.prepare(`UPDATE stock_items SET reserved_until = NULL, reserved_by_order_code = NULL WHERE reserved_by_order_code = ?`).run(orderCode);
  return true;
}

function getOrderByCode(orderCode) {
  return db.prepare(`
    SELECT o.*, p.name as product_name, p.pricing_type, p.description, p.warranty_info
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE o.order_code = ?
  `).get(orderCode);
}

function fulfillOrder(orderCode) {
  const order = getOrderByCode(orderCode);
  if (!order) return null;
  if (order.status === 'PAID') {
    return {
      order,
      accounts: order.delivered_accounts ? order.delivered_accounts.split('\n') : []
    };
  }

  let items = db.prepare(`
    SELECT id, account_data FROM stock_items
    WHERE reserved_by_order_code = ?
  `).all(orderCode);

  if (items.length < order.quantity) {
    const needed = order.quantity - items.length;
    const extra = db.prepare(`
      SELECT id, account_data FROM stock_items
      WHERE product_id = ? AND is_sold = 0 AND (reserved_until IS NULL OR reserved_until < ?)
      LIMIT ?
    `).all(order.product_id, Date.now(), needed);
    items = items.concat(extra);
  }

  const itemIds = items.map(i => i.id);
  const nowIso = new Date().toISOString();
  if (itemIds.length > 0) {
    const placeholders = itemIds.map(() => '?').join(',');
    db.prepare(`
      UPDATE stock_items
      SET is_sold = 1, order_id = ?, sold_at = ?, reserved_until = NULL, reserved_by_order_code = NULL
      WHERE id IN (${placeholders})
    `).run(order.id, nowIso, ...itemIds);
  }

  const accounts = items.map(i => i.account_data.trim());
  const accountsText = accounts.join('\n');

  db.prepare(`
    UPDATE orders
    SET status = 'PAID', delivered_accounts = ?, paid_at = ?
    WHERE order_code = ?
  `).run(accountsText, nowIso, orderCode);

  return {
    order,
    accounts
  };
}

function expirePendingOrders() {
  const now = Date.now();
  const expiredOrders = db.prepare(`
    SELECT order_code FROM orders
    WHERE status = 'PENDING' AND expires_at < ?
  `).all(now);

  for (const o of expiredOrders) {
    db.prepare(`UPDATE orders SET status = 'EXPIRED' WHERE order_code = ?`).run(o.order_code);
    db.prepare(`UPDATE stock_items SET reserved_until = NULL, reserved_by_order_code = NULL WHERE reserved_by_order_code = ?`).run(o.order_code);
  }
  return expiredOrders.length;
}

function getUserOrders(userId) {
  return db.prepare(`
    SELECT o.*, p.name as product_name
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE o.user_id = ? AND o.status = 'PAID'
    ORDER BY o.id DESC
    LIMIT 10
  `).all(userId);
}

function addStock(productId, accountList) {
  const nowIso = new Date().toISOString();
  let count = 0;
  for (const acc of accountList) {
    const clean = acc.trim();
    if (clean) {
      db.prepare(`
        INSERT INTO stock_items (product_id, account_data, is_sold, created_at)
        VALUES (?, ?, 0, ?)
      `).run(productId, clean, nowIso);
      count++;
    }
  }
  return count;
}

function getAllProductsForAdmin() {
  const now = Date.now();
  return db.prepare(`
    SELECT p.*, c.name as category_name,
      (SELECT COUNT(*) FROM stock_items s WHERE s.product_id = p.id AND s.is_sold = 0 AND (s.reserved_until IS NULL OR s.reserved_until < ?)) as available_stock,
      (SELECT COUNT(*) FROM stock_items s WHERE s.product_id = p.id AND s.is_sold = 1) as sold_stock
    FROM products p
    JOIN categories c ON p.category_id = c.id
    ORDER BY c.sort_order, p.sort_order
  `).all(now);
}

function getRevenueStats() {
  const totalRevenue = db.prepare(`SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE status = 'PAID'`).get().total;
  const totalOrders = db.prepare(`SELECT COUNT(*) as count FROM orders WHERE status = 'PAID'`).get().count;
  const totalUsers = db.prepare(`SELECT COUNT(*) as count FROM users`).get().count;
  const totalStockAvail = db.prepare(`SELECT COUNT(*) as count FROM stock_items WHERE is_sold = 0`).get().count;

  return {
    totalRevenue,
    totalOrders,
    totalUsers,
    totalStockAvail
  };
}

module.exports = {
  db,
  initDb,
  registerUser,
  isAdmin,
  setAdmin,
  getCategories,
  getCategoryById,
  getProductsByCategory,
  getProductById,
  calculatePackagePrice,
  createOrder,
  cancelOrder,
  getOrderByCode,
  fulfillOrder,
  expirePendingOrders,
  getUserOrders,
  addStock,
  getAllProductsForAdmin,
  getRevenueStats
};
