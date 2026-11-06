import asyncio
import json
import os
import random
import re
import sys
from datetime import datetime
from telethon import TelegramClient, events
from telethon.tl.types import User
import storage

CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.json')

def load_config():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

config = load_config()

api_id = config.get("api_id")
api_hash = config.get("api_hash")
bot_username = config.get("bot_username", "botbanac69_bot")
send_mode = config.get("send_mode", "DM")
min_delay = config.get("min_delay_seconds", 15)
max_delay = config.get("max_delay_seconds", 35)
max_daily = config.get("max_messages_per_day", 25)

if not api_id or not api_hash:
    print("❌ Chưa cấu hình api_id và api_hash trong config.json!")
    sys.exit(1)

# Danh sách từ khóa người bán -> Loại bỏ ngay
SELLER_REGEX = re.compile(
    r'bên em|em bán|shop em|sẵn kho|sẵn acc|xả kho|xả hàng|bảng giá|cung cấp|nhận nâng|nhận nạp|'
    r'bảo hành full|1 đổi 1|zalo|t\.me\/|tele:|lh:|liên hệ:|feedback|tri ân|khuyến mãi|sỉ lẻ|giá sỉ|'
    r'tuyển sỉ|tồn kho|bác nào cần ib|ai cần ib|ai cần dm|ai cần nhắn|ib shop|inbox shop|chuyên cung cấp|chính chủ giá',
    re.IGNORECASE
)

# Danh sách từ khóa người mua -> Bắt buộc phải có
BUYER_REGEX = re.compile(
    r'cần\s*(mua|tìm|acc|tài\s*khoản|slot|key)|tìm\s*(mua|acc|tài\s*khoản|slot)|'
    r'ai\s*(bán|có|còn|nhận|pass)|có\s*ai\s*(bán|có|nhận|pass)|bác\s*nào\s*(bán|có|pass)|'
    r'ông\s*nào\s*(bán|có)|shop\s*nào\s*(bán|có)|xin\s*giá|giá\s*sao|bao\s*nhiêu|nhiêu\s*tiền|'
    r'nhiêu\s*k|báo\s*giá|ib\s*em|inbox\s*em|dm\s*em|nhắn\s*em|ib\s*mình|inbox\s*mình|mua\s*ở\s*đâu|mua\s*thế\s*nào',
    re.IGNORECASE
)

MESSAGE_TEMPLATES = {
    "CHATGPT": [
        f"Bác cần GPT Plus à, bên em sẵn acc dùng chung 135k / chính chủ 450k nhé. Lấy acc tự động ở đây: @{bot_username}",
        f"GPT Plus 135k sẵn kho nha bác, quét QR lấy acc tự động luôn: @{bot_username}",
        f"Bác mua được GPT chưa? Chưa thì vào bot em lấy nhé, Plus 135k bảo hành full time: @{bot_username}"
    ],
    "GEMINI": [
        f"Bác cần Gemini Pro à, bên em sẵn slot 6 tháng 200k / 1 năm 390k nhé: @{bot_username}",
        f"Gemini Pro 6 tháng 200k sẵn kho đây bác, quét QR lấy luôn: @{bot_username}"
    ],
    "CLAUDE": [
        f"Claude Pro 150k sẵn kho nha bác, bảo hành full time: @{bot_username}",
        f"Bác cần Claude Pro à, bên em sẵn 150k bảo hành 1 đổi 1 nhé: @{bot_username}"
    ],
    "CURSOR": [
        f"Cursor Pro 140k / Copilot 210k sẵn kho nha bác: @{bot_username}",
        f"Bác cần Cursor Pro thì vào bot em lấy nhé, sẵn 140k/tháng: @{bot_username}"
    ],
    "GROK": [
        f"Grok 2 Premium 80k - 140k sẵn kho nha bác, lấy tự động ở đây: @{bot_username}"
    ],
    "MEDIA": [
        f"Capcut Pro 35k / Canva 49k sẵn kho quét QR lấy luôn bác nhé: @{bot_username}"
    ],
    "GENERAL": [
        f"Bác cần acc AI gì cứ ghé bot em check nhé, sẵn Plus 135k, Gemini 200k rẻ hơn thị trường: @{bot_username}",
        f"Bác chưa mua được thì ghé bot em tham khảo nhé, đủ Plus, Gemini, Claude rẻ hơn ngoài: @{bot_username}"
    ]
}

def detect_buyer_category(text):
    if not text:
        return None
    t = text.strip()

    # 1. Bỏ qua người bán
    if SELLER_REGEX.search(t):
        return None
    if len(t) > 200 or t.count('\n') > 3:
        return None

    # 2. Phải có ý định mua
    has_buyer_intent = bool(BUYER_REGEX.search(t)) or ('?' in t and re.search(r'có\s*(ko|không)|được\s*(ko|không)', t, re.I))
    if not has_buyer_intent:
        return None

    # 3. Phân loại sản phẩm
    lower = t.lower()
    if re.search(r'chat\s*gpt|gpt\s*plus|gpt4|openai|chatgpt', lower):
        return "CHATGPT"
    elif re.search(r'gemini|gemini\s*pro|gemini\s*advanced|google\s*ai|google\s*one', lower):
        return "GEMINI"
    elif re.search(r'claude|claude\s*pro|sonnet|anthropic', lower):
        return "CLAUDE"
    elif re.search(r'cursor|cursor\s*pro|copilot|github\s*copilot', lower):
        return "CURSOR"
    elif re.search(r'grok|super\s*grok|xai|x\s*premium', lower):
        return "GROK"
    elif re.search(r'capcut|canva', lower):
        return "MEDIA"
    return "GENERAL"

session_file = os.path.join(os.path.dirname(__file__), 'userbot_session')
client = TelegramClient(session_file, api_id, api_hash)

@client.on(events.NewMessage)
async def message_handler(event):
    if not event.is_group:
        return

    text = event.raw_text
    if not text:
        return

    sender = await event.get_sender()
    if not sender or not isinstance(sender, User):
        return

    if sender.bot or sender.is_self:
        return

    user_id = sender.id
    username = sender.username or f"User_{user_id}"

    if storage.is_already_contacted(user_id):
        return

    today_count = storage.get_today_count()
    if today_count >= max_daily:
        return

    # Lọc thông minh: CHỈ BẮT NGƯỜI MUA
    category = detect_buyer_category(text)
    if not category:
        return

    templates = MESSAGE_TEMPLATES.get(category, MESSAGE_TEMPLATES["GENERAL"])
    msg_to_send = random.choice(templates)

    delay = random.uniform(min_delay, max_delay)
    chat = await event.get_chat()
    chat_title = getattr(chat, 'title', 'Nhóm ẩn')

    print(f"\n🎯 [PHÁT HIỆN KHÁCH THẬT] Group: '{chat_title}' | Người gửi: @{username}")
    print(f"   💬 Khách hỏi: \"{text[:60]}...\"")
    print(f"   ⏳ Đang chờ {delay:.1f} giây trước khi gửi...")

    await asyncio.sleep(delay)

    sent_success = False
    try:
        if send_mode in ["DM", "BOTH"]:
            await client.send_message(user_id, msg_to_send)
            print(f"   ✅ [ĐÃ INBOX] Tới @{username}: \"{msg_to_send}\"")
            sent_success = True

        if send_mode in ["REPLY", "BOTH"]:
            await event.reply(msg_to_send)
            print(f"   ✅ [ĐÃ REPLY NHÓM] Trả lời tin nhắn của @{username}")
            sent_success = True

        if sent_success:
            storage.record_contact(user_id, username, msg_to_send, category)
            print(f"   📊 Tiến độ hôm nay: {storage.get_today_count()}/{max_daily} khách.")

    except Exception as e:
        print(f"   ❌ [GỬI THẤT BẠI] Lỗi: {e}")

print("\n" + "="*60)
print("🚀 TELEGRAM USERBOT QUÉT KHÁCH ĐÃ KHỞI ĐỘNG (BỘ LỌC THÔNG MINH)!")
print("🛡️ ĐÃ BẬT BỘ LỌC: CHỈ QUÉT NGƯỜI MUA, LOẠI BỎ 100% NGƯỜI BÁN!")
print(f"🤖 Bot bán hàng điều hướng: @{bot_username}")
print("="*60 + "\n")

client.start()
client.run_until_disconnected()
