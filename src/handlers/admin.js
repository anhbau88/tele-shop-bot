const { InlineKeyboard } = require('grammy');
const db = require('../db/database');
const config = require('../config');
const { formatVND } = require('../utils/vietqr');

// Lưu trạng thái nhập liệu tạm của Admin trong RAM
const adminSessions = new Map();

/**
 * Hiển thị Bảng điều khiển Quản trị Admin
 */
async function showAdminPanel(ctx) {
  if (!db.isAdmin(ctx.from.id)) {
    return ctx.reply('⛔ Bạn không có quyền truy cập trang quản trị!');
  }

  const text = `⚙️ <b>BẢNG ĐIỀU KHIỂN QUẢN TRỊ ADMIN</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Chào mừng Admin! Chọn tính năng bạn muốn thao tác bên dưới:`;

  const keyboard = new InlineKeyboard()
    .text('📊 Thống kê doanh thu', 'admin_stats')
    .text('📦 Nhập kho tài khoản', 'admin_stock_select')
    .row()
    .text('📢 Tạo bài thông báo kho hàng', 'admin_broadcast_select')
    .row()
    .text('🏠 Về Menu khách hàng', 'nav_menu');

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } else {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

/**
 * Hiển thị thống kê doanh thu
 */
async function showAdminStats(ctx) {
  if (!db.isAdmin(ctx.from.id)) return;

  const stats = db.getRevenueStats();
  const products = db.getAllProductsForAdmin();

  let text = `📊 <b>BÁO CÁO DOANH THU & TỒN KHO</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 <b>Tổng doanh thu:</b> <b>${formatVND(stats.totalRevenue)}</b>\n`;
  text += `🧾 <b>Tổng đơn hoàn tất:</b> ${stats.totalOrders} đơn\n`;
  text += `👥 <b>Tổng khách hàng:</b> ${stats.totalUsers} người\n`;
  text += `💼 <b>Tổng tài khoản còn trong kho:</b> ${stats.totalStockAvail} acc\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📦 <b>Chi tiết tồn kho từng sản phẩm:</b>\n`;

  for (const p of products) {
    text += `• <b>${p.name}:</b> Còn <code>${p.available_stock}</code> (Đã bán ${p.sold_stock})\n`;
  }

  const keyboard = new InlineKeyboard()
    .text('⬅️ Quay lại Admin', 'admin_panel')
    .text('🔄 Làm mới', 'admin_stats');

  await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
}

/**
 * Hiển thị danh sách sản phẩm để chọn nhập kho
 */
async function showStockSelect(ctx) {
  if (!db.isAdmin(ctx.from.id)) return;

  const products = db.getAllProductsForAdmin();
  let text = `📦 <b>CHỌN SẢN PHẨM CẦN NHẬP KHO</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Bấm vào sản phẩm bạn muốn nạp thêm tài khoản:`;

  const keyboard = new InlineKeyboard();
  for (const p of products) {
    keyboard.text(`${p.name} (Hiện còn ${p.available_stock})`, `admin_add_stock_${p.id}`).row();
  }
  keyboard.text('⬅️ Quay lại Admin', 'admin_panel');

  await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
}

/**
 * Bắt đầu phiên nhập kho cho 1 sản phẩm
 */
async function startAddStockSession(ctx, productId) {
  if (!db.isAdmin(ctx.from.id)) return;

  const product = db.getProductById(productId);
  if (!product) return ctx.answerCallbackQuery({ text: 'Sản phẩm không tồn tại!' });

  adminSessions.set(ctx.from.id, {
    action: 'ADD_STOCK',
    productId: product.id,
    productName: product.name
  });

  await ctx.reply(
    `📥 <b>NHẬP KHO CHO: ${product.name}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Vui lòng copy & dán danh sách tài khoản vào đây.\n` +
    `<b>Quy cách:</b> Mỗi dòng là 1 tài khoản (hoặc key/link).\n\n` +
    `<i>Ví dụ:</i>\n` +
    `<code>tk1@gmail.com|matkhau1</code>\n` +
    `<code>tk2@gmail.com|matkhau2</code>\n\n` +
    `👉 Gõ <code>/cancel</code> nếu muốn hủy thao tác.`,
    { parse_mode: 'HTML' }
  );
  await ctx.answerCallbackQuery();
}

/**
 * Xử lý khi Admin gửi tin nhắn văn bản chứa danh sách tài khoản
 */
async function handleAdminTextInput(ctx) {
  const session = adminSessions.get(ctx.from.id);
  if (!session) return false;

  if (ctx.message.text === '/cancel') {
    adminSessions.delete(ctx.from.id);
    await ctx.reply('❌ Đã hủy thao tác.');
    return true;
  }

  if (session.action === 'ADD_STOCK') {
    const lines = ctx.message.text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      await ctx.reply('⚠️ Danh sách trống, vui lòng gửi lại hoặc gõ /cancel.');
      return true;
    }

    const count = db.addStock(session.productId, lines);
    const updatedProd = db.getProductById(session.productId);
    adminSessions.delete(ctx.from.id);

    await ctx.reply(
      `✅ <b>NHẬP KHO THÀNH CÔNG!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 <b>Sản phẩm:</b> ${updatedProd.name}\n` +
      `🔨 <b>Đã nhập thêm:</b> ${count} tài khoản\n` +
      `💼 <b>Tổng tồn kho hiện tại:</b> ${updatedProd.stock_count} tài khoản\n\n` +
      `<i>Dưới đây là mẫu tin thông báo bạn có thể đăng hoặc chuyển tiếp vào Channel:</i>`,
      { parse_mode: 'HTML' }
    );

    // Gửi mẫu tin thông báo giống hệt hình ảnh của người dùng!
    await sendStockNotification(ctx, updatedProd, count);
    return true;
  }

  return false;
}

/**
 * Gửi thông báo kho hàng giống ảnh mẫu của người dùng
 */
async function sendStockNotification(ctx, product, addedCount) {
  // Tính quy đổi USDT tham khảo (~25.400đ/USDT)
  const usdtPrice = (product.price_vnd / 25400).toFixed(2);

  let msg = `🐱 <b>SHOP VỪA CẬP NHẬT KHO HÀNG</b> 🐱\n\n`;
  msg += `✂️ <b>${product.name}</b>\n`;
  msg += `💵 Giá: ${formatVND(product.price_vnd)} / ${usdtPrice} USDT\n`;
  msg += `🔨 Nhập thêm: ${addedCount}\n`;
  msg += `💼 Còn lại: ${product.stock_count}`;

  const buyUrl = `https://t.me/${config.BOT_USERNAME}?start=buy_${product.id}`;
  const keyboard = new InlineKeyboard().url('🛒 Mua ngay', buyUrl);

  await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: keyboard });
}

/**
 * Duyệt đơn hàng khi Admin bấm nút xác nhận nhận tiền
 */
async function handleAdminApprove(ctx, orderCode) {
  if (!db.isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({ text: 'Bạn không có quyền duyệt!', show_alert: true });
  }

  const result = db.fulfillOrder(orderCode);
  if (!result) {
    return ctx.answerCallbackQuery({ text: 'Đơn hàng này không hợp lệ hoặc đã xử lý!', show_alert: true });
  }

  const { order, accounts } = result;
  const durationStr = order.pricing_type === 'MONTHLY' ? ` (Gói ${order.duration_months} Tháng)` : ` (x${order.quantity})`;

  // Gửi thông báo và tài khoản ngay cho khách hàng
  try {
    let customerMsg = `🎉 <b>ĐƠN HÀNG #${order.order_code} ĐÃ ĐƯỢC DUYỆT!</b>\n`;
    customerMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    customerMsg += `Cảm ơn bạn đã thanh toán. Dưới đây là thông tin tài khoản của bạn:\n\n`;
    customerMsg += `📦 <b>Sản phẩm:</b> ${order.product_name}${durationStr}\n`;
    customerMsg += `💰 <b>Số tiền:</b> ${formatVND(order.total_price)}\n`;
    customerMsg += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    customerMsg += `🔑 <b>TÀI KHOẢN / KEY CỦA BẠN:</b>\n\n`;
    customerMsg += `<code>${accounts.join('\n')}</code>\n\n`;
    if (order.warranty_info) {
      customerMsg += `🛡️ <b>Bảo hành:</b> ${order.warranty_info}\n`;
    }
    customerMsg += `\n<i>Bạn có thể xem lại tài khoản bất kỳ lúc nào tại mục '📜 Đơn hàng đã mua'.</i>`;

    const custKb = new InlineKeyboard()
      .text('📜 Đơn hàng đã mua', 'my_orders')
      .text('🏠 Về Menu chính', 'nav_menu');

    await ctx.api.sendMessage(order.user_id, customerMsg, {
      parse_mode: 'HTML',
      reply_markup: custKb
    });
  } catch (err) {
    console.error('Lỗi gửi acc cho khách:', err);
  }

  // Cập nhật lại tin nhắn bên Admin
  await ctx.editMessageText(
    ctx.callbackQuery.message.text + `\n\n✅ <b>ĐÃ DUYỆT & GIAO TÀI KHOẢN THÀNH CÔNG!</b> (Bởi Admin @${ctx.from.username || ctx.from.id})`,
    { parse_mode: 'HTML' }
  );
  await ctx.answerCallbackQuery({ text: `Đã duyệt đơn #${orderCode} và giao hàng cho khách!` });
}

/**
 * Từ chối đơn hàng
 */
async function handleAdminReject(ctx, orderCode) {
  if (!db.isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({ text: 'Bạn không có quyền!', show_alert: true });
  }

  const order = db.getOrderByCode(orderCode);
  if (!order) return ctx.answerCallbackQuery({ text: 'Đơn không tồn tại!' });

  db.cancelOrder(orderCode);

  try {
    await ctx.api.sendMessage(
      order.user_id,
      `❌ <b>Đơn hàng #${orderCode} chưa được duyệt.</b>\n` +
      `Lý do: Admin kiểm tra chưa nhận được số tiền tương ứng hoặc nội dung chuyển khoản sai.\n` +
      `Nếu bạn đã chuyển khoản thành công, vui lòng liên hệ Admin để được hỗ trợ kiểm tra lại!`,
      { parse_mode: 'HTML' }
    );
  } catch {
    // ignore
  }

  await ctx.editMessageText(
    ctx.callbackQuery.message.text + `\n\n❌ <b>ĐÃ TỪ CHỐI ĐƠN HÀNG NÀY.</b>`,
    { parse_mode: 'HTML' }
  );
  await ctx.answerCallbackQuery({ text: `Đã từ chối đơn #${orderCode}!` });
}

module.exports = {
  adminSessions,
  showAdminPanel,
  showAdminStats,
  showStockSelect,
  startAddStockSession,
  handleAdminTextInput,
  handleAdminApprove,
  handleAdminReject,
  sendStockNotification
};
