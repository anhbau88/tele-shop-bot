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

function detectCategory(text) {
  const t = text.toLowerCase();
  if (/chat\s*gpt|gpt\s*plus|gpt4|openai|chatgpt/.test(t)) return "CHATGPT";
  if (/gemini|gemini\s*pro|gemini\s*advanced|google\s*ai|google\s*one/.test(t)) return "GEMINI";
  if (/claude|claude\s*pro|sonnet|anthropic/.test(t)) return "CLAUDE";
  if (/cursor|cursor\s*pro|copilot|github\s*copilot/.test(t)) return "CURSOR";
  if (/grok|super\s*grok|xai|x\s*premium/.test(t)) return "GROK";
  if (/capcut|canva/.test(t)) return "MEDIA";
  if (/mua\s*acc|cần\s*mua|ai\s*bán|ai\s*có\s*acc|tài\s*khoản\s*ai|acc\s*ai|mua\s*tài\s*khoản/.test(t)) return "GENERAL";
  return null;
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
    console.log(`🎯 Userbot đang nằm vùng trong mọi nhóm mà nick tham gia để săn khách tự động!\n`);

    client.addEventHandler(async (event) => {
      try {
        const message = event.message;
        if (!message || !message.text) return;
        if (!message.isGroup) return;

        const sender = await message.getSender();
        if (!sender || sender.bot || sender.isSelf) return;

        const userId = Number(sender.id);
        const username = sender.username || `User_${userId}`;

        // Kiểm tra đã nhắn chưa
        if (db.isLeadContacted(userId)) return;

        // Kiểm tra hạn mức ngày
        const todayCount = db.getTodayLeadCount();
        if (todayCount >= maxDaily) {
          console.log(`⚠️ [Userbot] Đã đạt hạn mức an toàn ${todayCount}/${maxDaily} khách/ngày. Tạm nghỉ.`);
          return;
        }

        const category = detectCategory(message.text);
        if (!category) return;

        const templates = MESSAGE_TEMPLATES[category] || MESSAGE_TEMPLATES.GENERAL;
        const msgToSend = templates[Math.floor(Math.random() * templates.length)];

        // Delay ngẫu nhiên 15 - 35s
        const delayMs = Math.floor(Math.random() * (35000 - 15000 + 1) + 15000);
        console.log(`🎯 [Userbot Cloud] Phát hiện khách @${username} cần [${category}]. Đang đợi ${(delayMs/1000).toFixed(1)}s để inbox...`);

        setTimeout(async () => {
          try {
            await client.sendMessage(userId, { message: msgToSend });
            db.recordContactedLead(userId, username, category, msgToSend);
            console.log(`✅ [Userbot Cloud] ĐÃ INBOX RIÊNG @${username}: "${msgToSend}"`);
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
