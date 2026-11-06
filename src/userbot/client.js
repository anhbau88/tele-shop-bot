const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const config = require('../config');
const db = require('../db/database');

const sessionString = process.env.TELEGRAM_STRING_SESSION || '';
const apiId = parseInt(process.env.TELEGRAM_API_ID || '35489005', 10);
const apiHash = process.env.TELEGRAM_API_HASH || 'b772aea6df245d6d52542c2396c62b92';
const botUsername = config.BOT_USERNAME || 'botbanac69_bot';
const maxDaily = parseInt(process.env.USERBOT_MAX_DAILY || '25', 10);

// Danh sách từ khóa của NGƯỜI BÁN (Nếu dính bất kỳ từ nào -> BỎ QUA NGAY)
const SELLER_KEYWORDS = /bên em|em bán|shop em|sẵn kho|sẵn acc|xả kho|xả hàng|bảng giá|cung cấp|nhận nâng|nhận nạp|bảo hành full|1 đổi 1|zalo|t\.me\/|tele:|lh:|liên hệ:|feedback|tri ân|khuyến mãi|sỉ lẻ|giá sỉ|tuyển sỉ|tồn kho|bác nào cần ib|ai cần ib|ai cần dm|ai cần nhắn|ib shop|inbox shop|chuyên cung cấp|chính chủ giá/i;

// Danh sách từ khóa của NGƯỜI MUA (Bắt buộc PHẢI CÓ để xác định đúng khách hàng cần mua)
const BUYER_KEYWORDS = /cần\s*(mua|tìm|acc|tài\s*khoản|slot|key)|tìm\s*(mua|acc|tài\s*khoản|slot)|ai\s*(bán|có|còn|nhận|pass)|có\s*ai\s*(bán|có|nhận|pass)|bác\s*nào\s*(bán|có|pass)|ông\s*nào\s*(bán|có)|shop\s*nào\s*(bán|có)|xin\s*giá|giá\s*sao|bao\s*nhiêu|nhiêu\s*tiền|nhiêu\s*k|báo\s*giá|ib\s*em|inbox\s*em|dm\s*em|nhắn\s*em|ib\s*mình|inbox\s*mình|mua\s*ở\s*đâu|mua\s*thế\s*nào/i;

const MESSAGE_TEMPLATES = {
  CHATGPT: [
    `Bác cần GPT Plus à, bên em sẵn acc dùng chung 135k / chính chủ 450k nhé. Lấy acc tự động ở đây: @${botUsername}`,
    `GPT Plus 135k sẵn kho nha bác, quét QR lấy acc tự động luôn: @${botUsername}`,
    `Bác mua được GPT chưa? Chưa thì vào bot em lấy nhé, Plus 135k bảo hành full time: @${botUsername}`
  ],
  GEMINI: [
    `Bác cần Gemini Pro à, bên em sẵn slot 6 tháng 200k / 1 năm 390k nhé: @${botUsername}`,
    `Gemini Pro 6 tháng 200k sẵn kho đây bác, quét QR lấy luôn: @${botUsername}`
  ],
  CLAUDE: [
    `Claude Pro 150k sẵn kho nha bác, bảo hành full time: @${botUsername}`,
    `Bác cần Claude Pro à, bên em sẵn 150k bảo hành 1 đổi 1 nhé: @${botUsername}`
  ],
  CURSOR: [
    `Cursor Pro 140k / Copilot 210k sẵn kho nha bác: @${botUsername}`,
    `Bác cần Cursor Pro thì vào bot em lấy nhé, sẵn 140k/tháng: @${botUsername}`
  ],
  GROK: [
    `Grok 2 Premium 80k - 140k sẵn kho nha bác, lấy tự động ở đây: @${botUsername}`
  ],
  MEDIA: [
    `Capcut Pro 35k / Canva 49k sẵn kho quét QR lấy luôn bác nhé: @${botUsername}`
  ],
  GENERAL: [
    `Bác cần acc AI gì cứ ghé bot em check nhé, sẵn Plus 135k, Gemini 200k rẻ hơn thị trường: @${botUsername}`,
    `Bác chưa mua được thì ghé bot em tham khảo nhé, đủ Plus, Gemini, Claude rẻ hơn ngoài: @${botUsername}`
  ]
};

/**
 * Phân tích ý định: Chỉ trả về category nếu là NGƯỜI MUA THẬT, loại bỏ 100% người bán
 */
function detectBuyerCategory(text) {
  if (!text) return null;
  const t = text.trim();

  // 1. Nếu là người bán (dính từ khóa bán hàng) -> BỎ QUA NGAY
  if (SELLER_KEYWORDS.test(t)) {
    return null;
  }

  // 2. Nếu tin nhắn quá dài (trên 200 ký tự hoặc nhiều dòng liệt kê) -> Thường là bài đăng bán dạo, bỏ qua
  if (t.length > 200 || (t.match(/\n/g) || []).length > 3) {
    return null;
  }

  // 3. Phải có dấu hiệu của NGƯỜI MUA (hỏi mua, cần tìm, hỏi giá, xin ib)
  const hasBuyerIntent = BUYER_KEYWORDS.test(t) || (t.includes('?') && /có\s*(ko|không)|được\s*(ko|không)/i.test(t));
  if (!hasBuyerIntent) {
    return null; // Không có ý định mua rõ ràng thì không làm phiền
  }

  // 4. Xác định mặt hàng cụ thể mà khách đang hỏi
  const lower = t.toLowerCase();
  if (/chat\s*gpt|gpt\s*plus|gpt4|openai|chatgpt/.test(lower)) return "CHATGPT";
  if (/gemini|gemini\s*pro|gemini\s*advanced|google\s*ai|google\s*one/.test(lower)) return "GEMINI";
  if (/claude|claude\s*pro|sonnet|anthropic/.test(lower)) return "CLAUDE";
  if (/cursor|cursor\s*pro|copilot|github\s*copilot/.test(lower)) return "CURSOR";
  if (/grok|super\s*grok|xai|x\s*premium/.test(lower)) return "GROK";
  if (/capcut|canva/.test(lower)) return "MEDIA";

  // Nếu nói chung chung về mua tài khoản
  return "GENERAL";
}

async function startUserbot() {
  if (!sessionString) {
    console.log('ℹ️ [Userbot Cloud] Chưa cấu hình TELEGRAM_STRING_SESSION. Bỏ qua chạy Userbot.');
    return;
  }

  try {
    const stringSession = new StringSession(sessionString);
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      useWSS: false
    });

    await client.connect();
    const me = await client.getMe();
    console.log(`\n🚀 [Userbot Cloud 24/7] ĐÃ ĐĂNG NHẬP THÀNH CÔNG VỚI NICK: ${me.firstName} (${me.phone})`);
    console.log(`🎯 Bộ lọc thông minh: CHỈ QUÉT NGƯỜI MUA, LOẠI BỎ 100% NGƯỜI BÁN!\n`);

    client.addEventHandler(async (event) => {
      try {
        const message = event.message;
        if (!message || !message.text) return;
        if (!message.isGroup) return;

        const sender = await message.getSender();
        if (!sender || sender.bot || sender.isSelf) return;

        const userId = Number(sender.id);
        const username = sender.username || `User_${userId}`;

        // Kiểm tra đã nhắn chưa (Chống trùng)
        if (db.isLeadContacted(userId)) return;

        // Kiểm tra hạn mức ngày (Chống ban nick)
        const todayCount = db.getTodayLeadCount();
        if (todayCount >= maxDaily) {
          return;
        }

        // Lọc thông minh: CHỈ LẤY NGƯỜI MUA
        const category = detectBuyerCategory(message.text);
        if (!category) return;

        const templates = MESSAGE_TEMPLATES[category] || MESSAGE_TEMPLATES.GENERAL;
        const msgToSend = templates[Math.floor(Math.random() * templates.length)];

        // Delay ngẫu nhiên 15 - 35s giả lập người thật
        const delayMs = Math.floor(Math.random() * (35000 - 15000 + 1) + 15000);
        console.log(`🎯 [Userbot Cloud] Phát hiện KHÁCH THẬT CẦN MUA: @${username} [${category}]. Đang đợi ${(delayMs/1000).toFixed(1)}s để inbox...`);

        setTimeout(async () => {
          try {
            await client.sendMessage(userId, { message: msgToSend });
            db.recordContactedLead(userId, username, category, msgToSend);
            console.log(`✅ [Userbot Cloud] ĐÃ INBOX KHÁCH @${username}: "${msgToSend}"`);
          } catch (err) {
            console.error(`❌ [Userbot Cloud] Không thể inbox @${username}:`, err.message);
          }
        }, delayMs);

      } catch (err) {
        // ignore
      }
    }, new NewMessage({}));

  } catch (err) {
    console.error('❌ Lỗi khởi động Userbot Cloud:', err.message);
  }
}

module.exports = { startUserbot };
