const { InlineKeyboard } = require('grammy');
const db = require('../db/database');
const config = require('../config');
const { formatVND } = require('../utils/vietqr');

/**
 * Xử lý khi khách bấm nút "✅ Tôi đã chuyển khoản"
 */
async function handlePaidCheck(ctx, orderCode) {
  const order = db.getOrderByCode(orderCode);
  if (!order) {
    return ctx.answerCallbackQuery({ text: 'Đơn hàng không tồn tại!', show_alert: true });
  }

  if (order.status === 'PAID') {
    return ctx.answerCallbackQuery({ text: 'Đơn hàng này đã được thanh toán và giao tài khoản!', show_alert: true });
  }

  if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
    return ctx.answerCallbackQuery({ text: 'Đơn hàng này đã hết hạn hoặc bị hủy.', show_alert: true });
  }

  await ctx.answerCallbackQuery({
    text: `Đã gửi thông báo xác nhận đơn #${orderCode}. Vui lòng đợi trong giây lát!`,
    show_alert: true
  });

  const durationStr = order.pricing_type === 'MONTHLY' ? ` (Gói ${order.duration_months} Tháng)` : ` (x${order.quantity})`;

  await ctx.reply(
    `⏳ <b>ĐÃ TIẾP NHẬN YÊU CẦU XÁC NHẬN ĐƠN #${orderCode}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 <b>Sản phẩm:</b> ${order.product_name}${durationStr}\n` +
    `💰 <b>Số tiền:</b> ${formatVND(order.total_price)}\n` +
    `📌 <b>Nội dung CK:</b> <code>${orderCode}</code>\n\n` +
    `Admin đang kiểm tra biến động số dư Vietcombank. Ngay khi có thông báo nhận tiền, Bot sẽ tự động gửi tài khoản vào khung chat này lập tức!`,
    { parse_mode: 'HTML' }
  );

  // Gửi thông báo đến Admin
  const adminUsers = db.db.prepare('SELECT telegram_id FROM users WHERE is_admin = 1').all();
  if (config.ADMIN_ID && !adminUsers.some(u => u.telegram_id === config.ADMIN_ID)) {
    adminUsers.push({ telegram_id: config.ADMIN_ID });
  }

  for (const admin of adminUsers) {
    try {
      const adminKb = new InlineKeyboard()
        .text('✅ Duyệt nhận tiền & Giao acc', `admin_approve_${orderCode}`)
        .text('❌ Từ chối', `admin_reject_${orderCode}`);

      await ctx.api.sendMessage(
        admin.telegram_id,
        `🔔 <b>CÓ KHÁCH HÀNG BÁO ĐÃ CHUYỂN KHOẢN!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🧾 <b>Mã đơn:</b> <code>#${orderCode}</code>\n` +
        `👤 <b>Khách hàng:</b> @${order.user_name || 'Không có user'} (ID: <code>${order.user_id}</code>)\n` +
        `📦 <b>Mặt hàng:</b> ${order.product_name}${durationStr}\n` +
        `💰 <b>Số tiền cần nhận:</b> <b>${formatVND(order.total_price)}</b>\n` +
        `🏦 <b>Ngân hàng:</b> VCB - 9923678668 (TRAN ANH VIET)\n` +
        `📌 <b>Nội dung CK:</b> <code>${orderCode}</code>\n\n` +
        `<i>Kiểm tra app ngân hàng, nếu đã nhận đúng số tiền hãy bấm Duyệt bên dưới để bot xuất kho giao acc cho khách!</i>`,
        { parse_mode: 'HTML', reply_markup: adminKb }
      );
    } catch {
      // ignore
    }
  }
}

/**
 * Xử lý thanh toán thử nghiệm (Test Mode 0đ)
 */
async function handleTestPay(ctx, orderCode) {
  const result = db.fulfillOrder(orderCode);
  if (!result) {
    return ctx.answerCallbackQuery({ text: 'Đơn hàng không hợp lệ hoặc đã xử lý!', show_alert: true });
  }

  await ctx.answerCallbackQuery({ text: 'Thanh toán thử thành công!', show_alert: false });

  const { order, accounts } = result;
  const durationStr = order.pricing_type === 'MONTHLY' ? ` (Gói ${order.duration_months} Tháng)` : ` (x${order.quantity})`;

  let text = `🎉 <b>THANH TOÁN THÀNH CÔNG! (Chế độ Test)</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🧾 <b>Mã đơn hàng:</b> <code>#${order.order_code}</code>\n`;
  text += `📦 <b>Sản phẩm:</b> ${order.product_name}${durationStr}\n`;
  text += `💰 <b>Tổng tiền:</b> ${formatVND(order.total_price)}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🔑 <b>THÔNG TIN TÀI KHOẢN / KEY CỦA BẠN:</b>\n\n`;

  text += `<code>${accounts.join('\n')}</code>\n\n`;

  if (order.warranty_info) {
    text += `🛡️ <b>Chính sách bảo hành:</b> ${order.warranty_info}\n`;
  }
  text += `\n<i>Cảm ơn quý khách! Bạn có thể xem lại thông tin bất cứ lúc nào trong mục '📜 Đơn hàng đã mua'.</i>`;

  const keyboard = new InlineKeyboard()
    .text('📜 Đơn hàng đã mua', 'my_orders')
    .text('🏠 Về Menu chính', 'nav_menu');

  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
}

/**
 * Xử lý hủy đơn hàng
 */
async function handleCancelOrder(ctx, orderCode) {
  const success = db.cancelOrder(orderCode, ctx.from.id);
  if (success) {
    await ctx.answerCallbackQuery({ text: `Đã hủy đơn hàng #${orderCode} và hoàn kho thành công!`, show_alert: true });
    await ctx.reply(`❌ Đơn hàng <b>#${orderCode}</b> đã được hủy.`, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('🏠 Về Menu chính', 'nav_menu')
    });
  } else {
    await ctx.answerCallbackQuery({ text: 'Không thể hủy đơn hàng này!', show_alert: true });
  }
}

/**
 * Xem lịch sử các đơn hàng đã mua
 */
async function handleMyOrders(ctx) {
  const orders = db.getUserOrders(ctx.from.id);

  if (orders.length === 0) {
    const kb = new InlineKeyboard().text('🛒 Mua sắm ngay', 'nav_menu');
    const msg = `📜 <b>LỊCH SỬ ĐƠN HÀNG</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━\nBạn chưa mua đơn hàng nào tại shop.`;
    if (ctx.callbackQuery) {
      return ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: kb });
    }
    return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: kb });
  }

  let text = `📜 <b>DANH SÁCH ĐƠN HÀNG ĐÃ MUA</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Bấm vào đơn hàng bên dưới để xem lại tài khoản / mật khẩu:\n`;

  const keyboard = new InlineKeyboard();
  for (const o of orders) {
    const durationLabel = o.pricing_type === 'MONTHLY' ? ` (${o.duration_months}T)` : '';
    const label = `#${o.order_code} · ${o.product_name}${durationLabel}`;
    keyboard.text(label, `view_order_${o.order_code}`).row();
  }
  keyboard.text('🏠 Về Menu chính', 'nav_menu');

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } else {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

/**
 * Xem lại chi tiết 1 đơn hàng cũ
 */
async function handleViewOldOrder(ctx, orderCode) {
  const order = db.getOrderByCode(orderCode);
  if (!order || order.user_id !== ctx.from.id) {
    return ctx.answerCallbackQuery({ text: 'Đơn hàng không tồn tại!', show_alert: true });
  }

  const durationStr = order.pricing_type === 'MONTHLY' ? ` (Gói ${order.duration_months} Tháng)` : ` (x${order.quantity})`;

  let text = `📦 <b>CHI TIẾT ĐƠN HÀNG #${order.order_code}</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📦 <b>Sản phẩm:</b> ${order.product_name}${durationStr}\n`;
  text += `💰 <b>Số tiền đã trả:</b> ${formatVND(order.total_price)}\n`;
  text += `📅 <b>Ngày mua:</b> ${new Date(order.created_at).toLocaleString('vi-VN')}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🔑 <b>TÀI KHOẢN ĐÃ GIAO:</b>\n\n`;
  text += `<code>${order.delivered_accounts || 'Không có dữ liệu'}</code>\n\n`;
  if (order.warranty_info) {
    text += `🛡️ <b>Bảo hành:</b> ${order.warranty_info}\n`;
  }

  const keyboard = new InlineKeyboard()
    .text('⬅️ Danh sách đơn', 'my_orders')
    .text('🏠 Về Menu chính', 'nav_menu');

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } else {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

module.exports = {
  handlePaidCheck,
  handleTestPay,
  handleCancelOrder,
  handleMyOrders,
  handleViewOldOrder
};
