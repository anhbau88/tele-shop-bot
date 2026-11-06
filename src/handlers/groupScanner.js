const { InlineKeyboard } = require('grammy');
const config = require('../config');

// Bộ đệm lưu thời gian reply gần nhất theo từng Group ID để chống spam (Cooldown 20 giây / group)
const groupCooldowns = new Map();

/**
 * Xử lý tin nhắn trong Group / Supergroup để nhận diện nhu cầu khách hàng
 * @param {import('grammy').Context} ctx 
 * @returns {Promise<boolean>} Trả về true nếu đã bắt từ khóa và phản hồi
 */
async function handleGroupMessage(ctx) {
  const chatType = ctx.chat?.type;
  if (chatType !== 'group' && chatType !== 'supergroup') {
    return false;
  }

  const text = (ctx.message?.text || ctx.message?.caption || '').toLowerCase();
  if (!text || text.startsWith('/')) {
    return false; // Bỏ qua nếu tin nhắn trống hoặc là lệnh bắt đầu bằng dấu /
  }

  const chatId = ctx.chat.id;
  const now = Date.now();
  const lastTime = groupCooldowns.get(chatId) || 0;

  // Giới hạn tần suất: mỗi group chỉ reply cách nhau ít nhất 20 giây để không gây loãng nhóm
  if (now - lastTime < 20000) {
    return false;
  }

  const senderName = ctx.from.username 
    ? `@${ctx.from.username}` 
    : (ctx.from.first_name || 'bạn');

  let matched = null;

  // 1. Nhóm ChatGPT
  if (/chat\s*gpt|gpt\s*plus|gpt4|openai|chatgpt/i.test(text)) {
    matched = {
      service: 'ChatGPT Plus',
      info: '• <b>ChatGPT Plus Dùng chung:</b> <code>135.000đ/tháng</code>\n• <b>ChatGPT Plus Chính chủ:</b> <code>450.000đ/tháng</code>\n• <b>ChatGPT Free kèm Gmail:</b> <code>3.000đ</code>',
      startParam: 'cat_1'
    };
  }
  // 2. Nhóm Gemini
  else if (/gemini|gemini\s*pro|gemini\s*advanced|google\s*ai|google\s*one/i.test(text)) {
    matched = {
      service: 'Google Gemini Pro',
      info: '• <b>Google Gemini Pro (Slot 6 Tháng):</b> <code>200.000đ</code>\n• <b>Google Gemini Pro (Slot 12 Tháng / 1 Năm):</b> <code>390.000đ</code>',
      startParam: 'cat_2'
    };
  }
  // 3. Nhóm Claude
  else if (/claude|claude\s*pro|sonnet|anthropic/i.test(text)) {
    matched = {
      service: 'Claude AI Anthropic',
      info: '• <b>Claude Pro Dùng chung:</b> <code>150.000đ/tháng</code>\n• <b>Claude Pro Chính chủ:</b> <code>440.000đ/tháng</code>',
      startParam: 'cat_3'
    };
  }
  // 4. Nhóm Cursor & Code AI
  else if (/cursor|cursor\s*pro|copilot|github\s*copilot/i.test(text)) {
    matched = {
      service: 'Cursor & Code AI',
      info: '• <b>Cursor Pro Premium:</b> <code>140.000đ/tháng</code>\n• <b>GitHub Copilot Chính chủ 1 Năm:</b> <code>210.000đ</code>',
      startParam: 'cat_4'
    };
  }
  // 5. Nhóm Super Grok
  else if (/grok|super\s*grok|xai|x\s*premium/i.test(text)) {
    matched = {
      service: 'Super Grok (xAI)',
      info: '• <b>Super Grok 2 Dùng chung:</b> <code>80.000đ/tháng</code>\n• <b>Super Grok 2 Cấp sẵn riêng:</b> <code>140.000đ/tháng</code>\n• <b>Combo Grok 2 + Cursor Pro:</b> <code>220.000đ</code>',
      startParam: 'cat_5'
    };
  }
  // 6. Nhóm Design / Media (Capcut / Canva)
  else if (/capcut|canva/i.test(text)) {
    matched = {
      service: 'Design & Media AI',
      info: '• <b>Capcut Pro Cá nhân:</b> <code>35.000đ/tháng</code>\n• <b>Canva Pro Chính chủ 1 Năm:</b> <code>49.000đ</code>\n• <b>Canva Pro Vĩnh viễn:</b> <code>89.000đ</code>',
      startParam: 'cat_6'
    };
  }
  // 7. Nhóm từ khóa hỏi mua chung
  else if (/mua\s*acc|cần\s*mua|ai\s*bán|ai\s*có\s*acc|tài\s*khoản\s*ai|acc\s*ai|mua\s*tài\s*khoản/i.test(text)) {
    matched = {
      service: 'Tài khoản AI Giá Rẻ',
      info: '🔥 <b>Bảng giá rẻ hơn thị trường 10k:</b>\n• ChatGPT Plus: <code>135k</code>\n• Gemini Pro 6T: <code>200k</code>\n• Claude Pro: <code>150k</code>\n• Cursor Pro: <code>140k</code>\n• Grok 2: <code>80k</code>\n• Capcut Pro: <code>35k</code>',
      startParam: 'nav_menu'
    };
  }

  if (matched) {
    groupCooldowns.set(chatId, now);

    let replyMsg = `👋 Chào ${senderName}! Nhận thấy bạn đang quan tâm đến <b>${matched.service}</b>:\n\n`;
    replyMsg += `${matched.info}\n\n`;
    replyMsg += `⚡ <b>Bảo hành 1 đổi 1 - Hệ thống tự động giao tài khoản 24/7 qua VietQR trong 3 giây.</b>`;

    const buyUrl = `https://t.me/${config.BOT_USERNAME}?start=${matched.startParam}`;
    const keyboard = new InlineKeyboard()
      .url('🛒 Xem chi tiết & Mua ngay', buyUrl);

    try {
      await ctx.reply(replyMsg, {
        parse_mode: 'HTML',
        reply_to_message_id: ctx.message.message_id,
        reply_markup: keyboard
      });
      return true;
    } catch (err) {
      console.error('Lỗi khi reply trong nhóm:', err);
    }
  }

  return false;
}

module.exports = {
  handleGroupMessage
};
