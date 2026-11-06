const { InlineKeyboard, InputFile } = require('grammy');
const db = require('../db/database');
const config = require('../config');
const { formatVND, generateVietQRUrl, fetchQRBuffer } = require('../utils/vietqr');

/**
 * Hiển thị Menu chính với danh sách các Danh mục AI lớn (2 cột gọn gàng)
 */
async function showMainMenu(ctx, isEdit = false) {
  const userId = ctx.from.id;
  const username = ctx.from.username || '';
  const firstName = ctx.from.first_name || '';

  db.registerUser(userId, username, firstName);
  const categories = db.getCategories();
  const isAdmin = db.isAdmin(userId);

  let text = `🤖 <b>CHÀO MỪNG ĐẾN VỚI SHOP TÀI KHOẢN AI TỰ ĐỘNG</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `⚡ <b>Giao tài khoản tự động 24/7</b> ngay sau khi thanh toán.\n`;
  text += `🛡️ <b>Bảo hành uy tín</b> - Hỗ trợ nhanh chóng 1-1.\n`;
  text += `🔥 <b>Bảng giá rẻ hơn thị trường 10k</b> - Đủ gói 1, 3, 6, 12 tháng.\n`;
  text += `💳 <b>Thanh toán VietQR trực tiếp</b> không cần nạp ví trước.\n\n`;
  text += `👇 <b>Vui lòng chọn danh mục tài khoản AI bên dưới:</b>`;

  const keyboard = new InlineKeyboard();

  for (let i = 0; i < categories.length; i += 2) {
    const cat1 = categories[i];
    const cat2 = categories[i + 1];

    if (cat2) {
      keyboard
        .text(`${cat1.icon} ${cat1.name} (${cat1.total_stock})`, `cat_${cat1.id}`)
        .text(`${cat2.icon} ${cat2.name} (${cat2.total_stock})`, `cat_${cat2.id}`)
        .row();
    } else {
      keyboard.text(`${cat1.icon} ${cat1.name} (${cat1.total_stock})`, `cat_${cat1.id}`).row();
    }
  }

  keyboard
    .text('📜 Đơn hàng đã mua', 'my_orders')
    .text('💬 Hỗ trợ CSKH', 'support_info')
    .row();

  if (isAdmin) {
    keyboard.text('⚙️ Quản trị Admin', 'admin_panel').row();
  }

  if (isEdit && ctx.callbackQuery) {
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
 * Hiển thị danh sách sản phẩm trong 1 Danh mục (1 cột dọc hiển thị rõ Tên · Giá · Còn X)
 */
async function showCategoryProducts(ctx, categoryId) {
  const category = db.getCategoryById(categoryId);
  if (!category) {
    return ctx.answerCallbackQuery({ text: 'Danh mục không tồn tại!', show_alert: true });
  }

  const products = db.getProductsByCategory(categoryId);

  let text = `📂 <b>Danh mục: ${category.icon} ${category.name}</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Chọn gói sản phẩm bạn muốn mua bên dưới:`;

  const keyboard = new InlineKeyboard();

  if (products.length === 0) {
    text += `\n\n<i>Hiện chưa có sản phẩm nào trong mục này.</i>`;
  } else {
    for (const p of products) {
      const stockText = p.stock_count > 0 ? `Còn ${p.stock_count}` : 'Hết hàng';
      const suffix = p.pricing_type === 'MONTHLY' ? '/tháng' : '';
      const label = `${p.name} · ${formatVND(p.price_vnd)}${suffix} · ${stockText}`;
      keyboard.text(label, `prod_${p.id}`).row();
    }
  }

  keyboard
    .text('⬅️ Quay lại danh mục', 'nav_menu')
    .text('🔄 Làm mới', `cat_${categoryId}`);

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

/**
 * Hiển thị chi tiết 1 sản phẩm & nút chọn thời hạn (1, 3, 6, 12 Tháng)
 */
async function showProductDetail(ctx, productId) {
  const product = db.getProductById(productId);
  if (!product) {
    return ctx.answerCallbackQuery ? ctx.answerCallbackQuery({ text: 'Sản phẩm không tồn tại!', show_alert: true }) : ctx.reply('Sản phẩm không tồn tại!');
  }

  let text = `🛒 <b>THÔNG TIN SẢN PHẨM</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📦 <b>Sản phẩm:</b> ${product.name}\n`;
  text += `📂 <b>Danh mục:</b> ${product.category_icon || '📁'} ${product.category_name || 'Khác'}\n`;
  
  if (product.pricing_type === 'MONTHLY') {
    text += `💵 <b>Giá gốc 1 tháng:</b> ${formatVND(product.price_vnd)}\n`;
    text += `🎁 <b>Ưu đãi gói:</b> <i>Giảm 20k (3T) · Giảm 50k (6T) · Giảm 100k (12T)</i>\n`;
  } else {
    text += `💵 <b>Đơn giá trọn gói:</b> ${formatVND(product.price_vnd)}\n`;
  }

  text += `💼 <b>Tình trạng:</b> ${product.stock_count > 0 ? `Còn <b>${product.stock_count}</b> tài khoản trong kho` : '❌ <b>Hết hàng</b>'}\n`;
  if (product.warranty_info) {
    text += `🛡️ <b>Bảo hành:</b> ${product.warranty_info}\n`;
  }
  if (product.description) {
    text += `📝 <b>Mô tả:</b> ${product.description}\n`;
  }

  const keyboard = new InlineKeyboard();

  if (product.stock_count > 0) {
    if (product.pricing_type === 'MONTHLY') {
      text += `\n👇 <b>Vui lòng chọn thời hạn sử dụng:</b>`;
      
      const p1 = db.calculatePackagePrice(product.price_vnd, 1);
      const p3 = db.calculatePackagePrice(product.price_vnd, 3);
      const p6 = db.calculatePackagePrice(product.price_vnd, 6);
      const p12 = db.calculatePackagePrice(product.price_vnd, 12);

      // Bố trí 4 nút thời hạn 1, 3, 6, 12 tháng (mỗi hàng 2 nút)
      keyboard
        .text(`1 Tháng (${formatVND(p1)})`, `buy_${product.id}_1`)
        .text(`3 Tháng (${formatVND(p3)} -20k)`, `buy_${product.id}_3`)
        .row()
        .text(`6 Tháng (${formatVND(p6)} -50k)`, `buy_${product.id}_6`)
        .text(`12 Tháng (${formatVND(p12)} -100k)`, `buy_${product.id}_12`)
        .row();
    } else {
      text += `\n👇 <b>Chọn số lượng mua:</b>`;
      const row = [];
      row.push(InlineKeyboard.text(`Mua 1 (${formatVND(product.price_vnd)})`, `buy_${product.id}_1`));
      if (product.stock_count >= 2) {
        row.push(InlineKeyboard.text(`Mua 2 (${formatVND(product.price_vnd * 2)})`, `buy_${product.id}_2`));
      }
      keyboard.row(...row);
    }
  } else {
    text += `\n<i>⚠️ Mặt hàng này hiện tạm hết tài khoản trong kho. Quý khách vui lòng chọn mặt hàng khác hoặc quay lại sau!</i>`;
  }

  keyboard
    .text('⬅️ Quay lại', `cat_${product.category_id}`)
    .text('🏠 Về Menu chính', 'nav_menu');

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
 * Tạo đơn hàng & gửi hóa đơn kèm mã QR thanh toán VietQR trực tiếp
 */
async function processOrderCreation(ctx, productId, monthsOrQty) {
  const userId = ctx.from.id;
  const userName = ctx.from.username || ctx.from.first_name || `User_${userId}`;

  try {
    const val = parseInt(monthsOrQty, 10);
    const order = db.createOrder(userId, userName, productId, val, 1);

    let caption = `🧾 <b>HÓA ĐƠN THANH TOÁN #${order.orderCode}</b>\n`;
    caption += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    caption += `📦 <b>Sản phẩm:</b> ${order.productName}\n`;
    
    if (order.pricingType === 'MONTHLY') {
      let discountText = '';
      if (order.durationMonths === 3) discountText = ' <i>(Đã giảm 20.000đ)</i>';
      else if (order.durationMonths === 6) discountText = ' <i>(Đã giảm 50.000đ)</i>';
      else if (order.durationMonths === 12) discountText = ' <i>(Đã giảm 100.000đ)</i>';

      caption += `⏳ <b>Thời hạn gói:</b> <b>${order.durationMonths} Tháng</b>${discountText}\n`;
    } else {
      caption += `🔢 <b>Số lượng:</b> ${order.quantity}\n`;
    }

    caption += `💰 <b>Tổng thanh toán:</b> <code>${formatVND(order.totalPrice)}</code>\n`;
    caption += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    caption += `🏦 <b>Ngân hàng:</b> ${config.BANK_CODE} (Vietcombank)\n`;
    caption += `💳 <b>Số tài khoản:</b> <code>${config.BANK_ACCOUNT}</code>\n`;
    caption += `👤 <b>Chủ tài khoản:</b> <b>${config.BANK_ACCOUNT_NAME}</b>\n`;
    caption += `📌 <b>Nội dung chuyển khoản (Bắt buộc):</b> <code>${order.orderCode}</code>\n`;
    caption += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    caption += `⏳ <i>Đơn hàng tự động giữ kho trong ${config.ORDER_HOLD_MINUTES} phút.</i>\n`;
    caption += `👉 <b>Quét mã VietQR để được điền sẵn số tiền & nội dung chính xác 100%!</b>`;

    const keyboard = new InlineKeyboard()
      .text('✅ Tôi đã chuyển khoản', `paid_check_${order.orderCode}`)
      .row();

    if (config.TEST_MODE) {
      keyboard.text('🧪 Thanh toán thử nghiệm (Test Mode 0đ)', `test_pay_${order.orderCode}`).row();
    }

    keyboard.text('❌ Hủy đơn hàng', `cancel_order_${order.orderCode}`).row();

    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery();
    }

    const qrBuffer = await fetchQRBuffer(order.totalPrice, order.orderCode);
    if (qrBuffer) {
      await ctx.replyWithPhoto(new InputFile(qrBuffer, `vietqr_${order.orderCode}.png`), {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } else {
      const qrFallbackUrl = generateVietQRUrl(order.totalPrice, order.orderCode);
      caption += `\n\n🔗 <a href="${qrFallbackUrl}">Bấm vào đây để xem ảnh QR</a>`;
      await ctx.reply(caption, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    }
  } catch (err) {
    console.error('Lỗi tạo đơn:', err);
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: err.message, show_alert: true });
    } else {
      await ctx.reply(`❌ Lỗi: ${err.message}`);
    }
  }
}

module.exports = {
  showMainMenu,
  showCategoryProducts,
  showProductDetail,
  processOrderCreation
};
