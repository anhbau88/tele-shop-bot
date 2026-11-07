const { Bot, InlineKeyboard } = require('grammy');
const http = require('node:http');
const config = require('./config');
const db = require('./db/database');
const { seedData } = require('./db/seed');
const {
  showMainMenu,
  showCategoryProducts,
  showProductDetail,
  processOrderCreation
} = require('./handlers/shop');
const {
  handlePaidCheck,
  handleTestPay,
  handleCancelOrder,
  handleMyOrders,
  handleViewOldOrder
} = require('./handlers/orders');
const {
  showAdminPanel,
  showAdminStats,
  showStockSelect,
  startAddStockSession,
  handleAdminTextInput,
  handleAdminApprove,
  handleAdminReject,
  sendStockNotification
} = require('./handlers/admin');
const { handleGroupMessage } = require('./handlers/groupScanner');
const { startUserbot } = require('./userbot/client');

if (!config.BOT_TOKEN) {
  console.error('❌ Lỗi: Chưa cung cấp BOT_TOKEN trong file .env!');
  process.exit(1);
}

const bot = new Bot(config.BOT_TOKEN);

// Khởi tạo Database và nạp dữ liệu mẫu
seedData();

// Tự động quét và hoàn kho các đơn quá hạn 10 phút (mỗi 30 giây chạy 1 lần)
setInterval(() => {
  try {
    const expiredCount = db.expirePendingOrders();
    if (expiredCount > 0) {
      console.log(`[Cleaner] Đã hoàn kho ${expiredCount} đơn hàng hết hạn giữ chỗ.`);
    }
  } catch (err) {
    console.error('Lỗi khi quét đơn hết hạn:', err);
  }
}, 30000);

// ==================== LỆNH TELEGRAM ====================

// Lệnh /start & Xử lý Deep Link thông minh
bot.command('start', async (ctx) => {
  const match = ctx.match; // Tham số sau /start ví dụ buy_3 hoặc cat_1

  if (match) {
    if (match.startsWith('buy_')) {
      const productId = parseInt(match.replace('buy_', ''), 10);
      if (!isNaN(productId)) {
        return showProductDetail(ctx, productId);
      }
    } else if (match.startsWith('cat_')) {
      const catId = parseInt(match.replace('cat_', ''), 10);
      if (!isNaN(catId)) {
        return showCategoryProducts(ctx, catId);
      }
    }
  }

  await showMainMenu(ctx);
});

// Lệnh /menu
bot.command('menu', async (ctx) => {
  await showMainMenu(ctx);
});

// Lệnh /orders - Xem đơn đã mua
bot.command('orders', async (ctx) => {
  await handleMyOrders(ctx);
});

// Lệnh /admin - Quản trị
bot.command('admin', async (ctx) => {
  await showAdminPanel(ctx);
});

// Lệnh /setadmin - Đăng ký làm Admin cho tài khoản hiện tại
bot.command('setadmin', async (ctx) => {
  db.setAdmin(ctx.from.id);
  await ctx.reply(`✅ <b>Chúc mừng!</b> Tài khoản của bạn (ID: <code>${ctx.from.id}</code>) đã được nâng cấp quyền <b>Admin tối cao</b>.\nGõ <code>/admin</code> để mở bảng điều khiển.`, { parse_mode: 'HTML' });
});

// ==================== XỬ LÝ NÚT BẤM (CALLBACK QUERY) ====================

// Quay về Menu chính
bot.callbackQuery('nav_menu', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showMainMenu(ctx, true);
});

// Xem danh sách sản phẩm trong danh mục: cat_1
bot.callbackQuery(/^cat_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const categoryId = parseInt(ctx.match[1], 10);
  await showCategoryProducts(ctx, categoryId);
});

// Xem chi tiết sản phẩm: prod_1
bot.callbackQuery(/^prod_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = parseInt(ctx.match[1], 10);
  await showProductDetail(ctx, productId);
});

// Chọn số lượng hoặc thời hạn và tạo đơn: buy_1_3 (SP 1, Gói 3 Tháng)
bot.callbackQuery(/^buy_(\d+)_(\d+)$/, async (ctx) => {
  const productId = parseInt(ctx.match[1], 10);
  const monthsOrQty = parseInt(ctx.match[2], 10);
  await processOrderCreation(ctx, productId, monthsOrQty);
});

// Khách bấm "Tôi đã chuyển khoản": paid_check_DH1234
bot.callbackQuery(/^paid_check_([A-Za-z0-9]+)$/, async (ctx) => {
  const orderCode = ctx.match[1];
  await handlePaidCheck(ctx, orderCode);
});

// Khách bấm "Thanh toán thử nghiệm (Test Mode)": test_pay_DH1234
bot.callbackQuery(/^test_pay_([A-Za-z0-9]+)$/, async (ctx) => {
  const orderCode = ctx.match[1];
  await handleTestPay(ctx, orderCode);
});

// Khách bấm "Hủy đơn hàng": cancel_order_DH1234
bot.callbackQuery(/^cancel_order_([A-Za-z0-9]+)$/, async (ctx) => {
  const orderCode = ctx.match[1];
  await handleCancelOrder(ctx, orderCode);
});

// Xem danh sách đơn hàng đã mua
bot.callbackQuery('my_orders', async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleMyOrders(ctx);
});

// Xem chi tiết 1 đơn hàng cũ
bot.callbackQuery(/^view_order_([A-Za-z0-9]+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const orderCode = ctx.match[1];
  await handleViewOldOrder(ctx, orderCode);
});

// Nút CSKH / Hỗ trợ
bot.callbackQuery('support_info', async (ctx) => {
  await ctx.answerCallbackQuery();
  const kb = new InlineKeyboard().text('⬅️ Quay lại Menu', 'nav_menu');
  await ctx.reply(
    `💬 <b>THÔNG TIN HỖ TRỢ KHÁCH HÀNG</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🛡️ Mọi thắc mắc về đơn hàng, bảo hành hoặc sự cố tài khoản, quý khách vui lòng liên hệ:\n\n` +
    `👤 <b>Admin Support:</b> ${config.SUPPORT_CONTACT}\n` +
    `⏰ <b>Thời gian hỗ trợ:</b> 08:00 - 23:00 hàng ngày\n` +
    `⚡ <b>Cam kết:</b> Bảo hành 1 đổi 1 nhanh chóng theo quy định!`,
    { parse_mode: 'HTML', reply_markup: kb }
  );
});

// ==================== CALLBACKS CỦA ADMIN ====================

bot.callbackQuery('admin_panel', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showAdminPanel(ctx);
});

bot.callbackQuery('admin_stats', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showAdminStats(ctx);
});

bot.callbackQuery('admin_stock_select', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showStockSelect(ctx);
});

bot.callbackQuery(/^admin_add_stock_(\d+)$/, async (ctx) => {
  const productId = parseInt(ctx.match[1], 10);
  await startAddStockSession(ctx, productId);
});

bot.callbackQuery('admin_broadcast_select', async (ctx) => {
  await ctx.answerCallbackQuery();
  const products = db.getAllProductsForAdmin();
  const kb = new InlineKeyboard();
  for (const p of products) {
    kb.text(p.name, `admin_send_bc_${p.id}`).row();
  }
  kb.text('⬅️ Quay lại Admin', 'admin_panel');
  await ctx.editMessageText('📢 Chọn sản phẩm bạn muốn tạo tin thông báo cập nhật kho hàng:', { reply_markup: kb });
});

bot.callbackQuery(/^admin_send_bc_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = parseInt(ctx.match[1], 10);
  const prod = db.getProductById(productId);
  if (prod) {
    await sendStockNotification(ctx, prod, 0);
  }
});

bot.callbackQuery(/^admin_approve_([A-Za-z0-9]+)$/, async (ctx) => {
  const orderCode = ctx.match[1];
  await handleAdminApprove(ctx, orderCode);
});

bot.callbackQuery(/^admin_reject_([A-Za-z0-9]+)$/, async (ctx) => {
  const orderCode = ctx.match[1];
  await handleAdminReject(ctx, orderCode);
});

// ==================== XỬ LÝ TIN NHẮN VĂN BẢN ====================

bot.on('message:text', async (ctx) => {
  // 1. Nếu là tin nhắn trong Nhóm: Chạy bộ quét từ khóa tìm khách
  const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
  if (isGroup) {
    const handled = await handleGroupMessage(ctx);
    if (handled) return;
    return; // Nếu không khớp từ khóa thì bỏ qua, không spam nhóm
  }

  // 2. Nếu là tin nhắn riêng với bot (Private Chat):
  const handled = await handleAdminTextInput(ctx);
  if (!handled) {
    await ctx.reply('👉 Vui lòng sử dụng các nút bấm trong Menu hoặc gõ <code>/menu</code> để mua hàng!', { parse_mode: 'HTML' });
  }
});

// Bắt lỗi toàn cục
bot.catch((err) => {
  console.error('Bot Error:', err);
});

// ==================== HTTP SERVER CHO RENDER / CLOUD (HEALTHCHECK) ====================
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Bot Bán Hàng Telegram (@botbanacc69_bot) đang hoạt động 24/7!');
});
server.listen(PORT, () => {
  console.log(`🌐 Server Healthcheck cổng ${PORT} sẵn sàng cho Render/Koyeb.`);
});

// Tự động Ping để giữ Render không bị Sleep (Keep-Alive mỗi 9 phút)
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || 'https://botbanacc69.onrender.com';
setInterval(() => {
  fetch(RENDER_EXTERNAL_URL)
    .then(() => console.log(`[Keep-Alive] Đã ping ${RENDER_EXTERNAL_URL} giữ server thức 24/7.`))
    .catch((err) => console.error('[Keep-Alive] Lỗi ping:', err.message));
}, 9 * 60 * 1000);

// ==================== KHỞI CHẠY BOT ====================

console.log('⏳ Đang kết nối Bot Telegram...');
bot.start({
  onStart: (botInfo) => {
    console.log(`\n======================================================`);
    console.log(`🚀 BOT ĐÃ HOẠT ĐỘNG THÀNH CÔNG!`);
    console.log(`🤖 Tên bot: @${botInfo.username} (${botInfo.first_name})`);
    console.log(`🏦 Ngân hàng nhận tiền: ${config.BANK_CODE} - ${config.BANK_ACCOUNT} (${config.BANK_ACCOUNT_NAME})`);
    console.log(`🔍 Quét từ khóa Group: ĐANG BẬT (ChatGPT, Gemini, Claude, Cursor, Grok, Capcut...)`);
    console.log(`⚡ Chế độ Test Mode: ${config.TEST_MODE ? 'BẬT (Có nút nạp test 0đ)' : 'TẮT'}`);
    console.log(`👉 Bạn có thể thêm bot vào Group để quét khách ngay!`);
    console.log(`======================================================\n`);
  }
});

// Khởi chạy Userbot tự động quét khách 24/7 trên Cloud (nếu có StringSession)
startUserbot();
