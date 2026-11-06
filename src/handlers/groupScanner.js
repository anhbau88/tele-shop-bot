const { InlineKeyboard } = require('grammy');
const config = require('../config');

// Bộ đệm lưu thời gian reply gần nhất theo từng Group ID để chống spam (Cooldown 20 giây / group)
const groupCooldowns = new Map();

// Từ khóa của người bán -> Bỏ qua ngay
const SELLER_KEYWORDS = /bên em|em bán|shop em|sẵn kho|sẵn acc|xả kho|xả hàng|bảng giá|cung cấp|nhận nâng|nhận nạp|bảo hành full|1 đổi 1|zalo|t\.me\/|tele:|lh:|liên hệ:|feedback|tri ân|khuyến mãi|sỉ lẻ|giá sỉ|tuyển sỉ|tồn kho|bác nào cần ib|ai cần ib|ai cần dm|ai cần nhắn|ib shop|inbox shop|chuyên cung cấp|chính chủ giá/i;

// Từ khóa người mua -> Bắt buộc phải có
const BUYER_KEYWORDS = /cần\s*(mua|tìm|acc|tài\s*khoản|slot|key)|tìm\s*(mua|acc|tài\s*khoản|slot)|ai\s*(bán|có|còn|nhận|pass)|có\s*ai\s*(bán|có|nhận|pass)|bác\s*nào\s*(bán|có|pass)|ông\s*nào\s*(bán|có)|shop\s*nào\s*(bán|có)|xin\s*giá|giá\s*sao|bao\s*nhiêu|nhiêu\s*tiền|nhiêu\s*k|báo\s*giá|ib\s*em|inbox\s*em|dm\s*em|nhắn\s*em|ib\s*mình|inbox\s*mình|mua\s*ở\s*đâu|mua\s*thế\s*nào/i;

async function handleGroupMessage(ctx) {
  const chatType = ctx.chat?.type;
  if (chatType !== 'group' && chatType !== 'supergroup') {
    return false;
  }

  const raw = ctx.message?.text || ctx.message?.caption || '';
  if (!raw || raw.startsWith('/')) {
    return false;
  }

  const text = raw.trim();

  // 1. Loại bỏ người bán
  if (SELLER_KEYWORDS.test(text)) return false;
  if (text.length > 200 || (text.match(/\n/g) || []).length > 3) return false;

  // 2. Kiểm tra ý định mua thực sự
  const hasBuyerIntent = BUYER_KEYWORDS.test(text) || (text.includes('?') && /có\s*(ko|không)|được\s*(ko|không)/i.test(text));
  if (!hasBuyerIntent) return false;

  const chatId = ctx.chat.id;
  const now = Date.now();
  const lastTime = groupCooldowns.get(chatId) || 0;

  if (now - lastTime < 20000) {
    return false;
  }

  const senderName = ctx.from.username 
    ? `@${ctx.from.username}` 
    : (ctx.from.first_name || 'bạn');

  let matched = null;
  const lower = text.toLowerCase();

  if (/chat\s*gpt|gpt\s*plus|gpt4|openai|chatgpt/.test(lower)) {
    matched = {
      service: 'ChatGPT Plus',
      info: '• <b>ChatGPT Plus Dùng chung:</b> <code>135.000đ/tháng</code>\n• <b>ChatGPT Plus Chính chủ:</b> <code>450.000đ/tháng</code>',
      startParam: 'cat_1'
    };
  } else if (/gemini|gemini\s*pro|gemini\s*advanced|google\s*ai|google\s*one/.test(lower)) {
    matched = {
      service: 'Google Gemini Pro',
      info: '• <b>Google Gemini Pro (Slot 6 Tháng):</b> <code>200.000đ</code>\n• <b>Google Gemini Pro (Slot 12 Tháng / 1 Năm):</b> <code>390.000đ</code>',
      startParam: 'cat_2'
    };
  } else if (/claude|claude\s*pro|sonnet|anthropic/.test(lower)) {
    matched = {
      service: 'Claude AI Anthropic',
      info: '• <b>Claude Pro Dùng chung:</b> <code>150.000đ/tháng</code>\n• <b>Claude Pro Chính chủ:</b> <code>440.000đ/tháng</code>',
      startParam: 'cat_3'
    };
  } else if (/cursor|cursor\s*pro|copilot|github\s*copilot/.test(lower)) {
    matched = {
      service: 'Cursor & Code AI',
      info: '• <b>Cursor Pro Premium:</b> <code>140.000đ/tháng</code>\n• <b>GitHub Copilot Chính chủ 1 Năm:</b> <code>210.000đ</code>',
      startParam: 'cat_4'
    };
  } else if (/grok|super\s*grok|xai|x\s*premium/.test(lower)) {
    matched = {
      service: 'Super Grok (xAI)',
      info: '• <b>Super Grok 2 Dùng chung:</b> <code>80.000đ/tháng</code>\n• <b>Super Grok 2 Cấp sẵn riêng:</b> <code>140.000đ/tháng</code>',
      startParam: 'cat_5'
    };
  } else if (/capcut|canva/.test(lower)) {
    matched = {
      service: 'Design & Media AI',
      info: '• <b>Capcut Pro Cá nhân:</b> <code>35.000đ/tháng</code>\n• <b>Canva Pro Chính chủ 1 Năm:</b> <code>49.000đ</code>',
      startParam: 'cat_6'
    };
  } else {
    matched = {
      service: 'Tài khoản AI Giá Rẻ',
      info: '🔥 <b>Bảng giá rẻ hơn thị trường 10k:</b>\n• ChatGPT Plus: <code>135k</code>\n• Gemini Pro 6T: <code>200k</code>\n• Claude Pro: <code>150k</code>\n• Cursor Pro: <code>140k</code>',
      startParam: 'nav_menu'
    };
  }

  groupCooldowns.set(chatId, now);

  let replyMsg = `👋 Chào ${senderName}! Bên em có sẵn <b>${matched.service}</b> giao tự động:\n\n`;
  replyMsg += `${matched.info}\n\n`;
  replyMsg += `⚡ <b>Bảo hành 1 đổi 1 - Quét QR Vietcombank nhận tài khoản ngay sau 3 giây.</b>`;

  const buyUrl = `https://t.me/${config.BOT_USERNAME}?start=${matched.startParam}`;
  const keyboard = new InlineKeyboard().url('🛒 Lấy tài khoản ngay', buyUrl);

  try {
    await ctx.reply(replyMsg, {
      parse_mode: 'HTML',
      reply_to_message_id: ctx.message.message_id,
      reply_markup: keyboard
    });
    return true;
  } catch (err) {
    console.error('Lỗi reply nhóm:', err);
  }

  return false;
}

module.exports = { handleGroupMessage };
