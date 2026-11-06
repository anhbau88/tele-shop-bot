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
send_mode = config.get("send_mode", "DM")  # DM hoặc REPLY hoặc BOTH
min_delay = config.get("min_delay_seconds", 15)
max_delay = config.get("max_delay_seconds", 35)
max_daily = config.get("max_messages_per_day", 25)

if not api_id or not api_hash:
    print("\n" + "="*60)
    print("❌ LỖI: Chưa điền api_id và api_hash trong file userbot/config.json!")
    print("👉 Hãy truy cập https://my.telegram.org -> API development tools để lấy miễn phí.")
    print("="*60 + "\n")
    sys.exit(1)

# Các mẫu tin nhắn chuẩn dân buôn - Cộc, ngắn, không thảo mai
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

def detect_category(text):
    t = text.lower()
    if re.search(r'chat\s*gpt|gpt\s*plus|gpt4|openai|chatgpt', t):
        return "CHATGPT"
    elif re.search(r'gemini|gemini\s*pro|gemini\s*advanced|google\s*ai|google\s*one', t):
        return "GEMINI"
    elif re.search(r'claude|claude\s*pro|sonnet|anthropic', t):
        return "CLAUDE"
    elif re.search(r'cursor|cursor\s*pro|copilot|github\s*copilot', t):
        return "CURSOR"
    elif re.search(r'grok|super\s*grok|xai|x\s*premium', t):
        return "GROK"
    elif re.search(r'capcut|canva', t):
        return "MEDIA"
    elif re.search(r'mua\s*acc|cần\s*mua|ai\s*bán|ai\s*có\s*acc|tài\s*khoản\s*ai|acc\s*ai|mua\s*tài\s*khoản', t):
        return "GENERAL"
    return None

session_file = os.path.join(os.path.dirname(__file__), 'userbot_session')
client = TelegramClient(session_file, api_id, api_hash)

@client.on(events.NewMessage)
async def message_handler(event):
    # Chỉ bắt tin nhắn trong các Group / Supergroup
    if not event.is_group:
        return

    # Bỏ qua tin nhắn không có nội dung chữ
    text = event.raw_text
    if not text:
        return

    # Lấy thông tin người gửi
    sender = await event.get_sender()
    if not sender or not isinstance(sender, User):
        return

    # Bỏ qua nếu người gửi là Bot hoặc là chính bản thân mình
    if sender.bot or sender.is_self:
        return

    user_id = sender.id
    username = sender.username or f"User_{user_id}"

    # Kiểm tra xem người này đã từng được nhắn trước đây chưa (Chống trùng 100%)
    if storage.is_already_contacted(user_id):
        return

    # Kiểm tra hạn mức gửi tin trong ngày (Chống ban tài khoản)
    today_count = storage.get_today_count()
    if today_count >= max_daily:
        print(f"⚠️ [GIỚI HẠN] Hôm nay đã gửi đủ {today_count}/{max_daily} khách. Tạm dừng để bảo vệ nick an toàn!")
        return

    # Nhận diện nhu cầu mặt hàng
    category = detect_category(text)
    if not category:
        return

    # Chọn ngẫu nhiên 1 câu tin nhắn
    templates = MESSAGE_TEMPLATES.get(category, MESSAGE_TEMPLATES["GENERAL"])
    msg_to_send = random.choice(templates)

    # Delay ngẫu nhiên giống người thật (15 - 35 giây)
    delay = random.uniform(min_delay, max_delay)
    chat = await event.get_chat()
    chat_title = getattr(chat, 'title', 'Nhóm ẩn')

    print(f"\n🎯 [PHÁT HIỆN KHÁCH] Group: '{chat_title}' | Người gửi: @{username}")
    print(f"   💬 Khách chat: \"{text[:60]}...\"")
    print(f"   ⏳ Đang chờ {delay:.1f} giây trước khi gửi (giả lập người thật)...")

    await asyncio.sleep(delay)

    # Thực hiện gửi tin
    sent_success = False
    try:
        if send_mode in ["DM", "BOTH"]:
            await client.send_message(user_id, msg_to_send)
            print(f"   ✅ [ĐÃ INBOX RIÊNG] Tới @{username}: \"{msg_to_send}\"")
            sent_success = True

        if send_mode in ["REPLY", "BOTH"]:
            await event.reply(msg_to_send)
            print(f"   ✅ [ĐÃ REPLY NHÓM] Trả lời tin nhắn của @{username}")
            sent_success = True

        if sent_success:
            # Ghi nhớ lịch sử để không bao giờ nhắn lại
            storage.record_contact(user_id, username, msg_to_send, category)
            print(f"   📊 Tiến độ hôm nay: {storage.get_today_count()}/{max_daily} khách.")

    except Exception as e:
        print(f"   ❌ [GỬI THẤT BẠI] Lỗi: {e}")

print("\n" + "="*60)
print("🚀 TELEGRAM USERBOT QUÉT KHÁCH ĐÃ KHỞI ĐỘNG!")
print(f"🤖 Bot bán hàng điều hướng: @{bot_username}")
print(f"🛡️ Chế độ gửi: {send_mode} (Giới hạn: {max_daily} khách/ngày)")
print("👉 Đang lắng nghe tin nhắn trong tất cả các nhóm mà nick tham gia...")
print("="*60 + "\n")

client.start()
client.run_until_disconnected()
