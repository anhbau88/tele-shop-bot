import json
import os
from datetime import datetime

HISTORY_FILE = os.path.join(os.path.dirname(__file__), 'history.json')

def load_history():
    if not os.path.exists(HISTORY_FILE):
        return {"contacted": {}, "daily_counts": {}}
    try:
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {"contacted": {}, "daily_counts": {}}

def save_history(data):
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def is_already_contacted(user_id):
    history = load_history()
    return str(user_id) in history.get("contacted", {})

def get_today_count():
    history = load_history()
    today_str = datetime.now().strftime("%Y-%m-%d")
    return history.get("daily_counts", {}).get(today_str, 0)

def record_contact(user_id, username, message_text, category):
    history = load_history()
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    # Lưu thông tin người nhận
    history.setdefault("contacted", {})[str(user_id)] = {
        "username": username or "",
        "category": category,
        "message": message_text,
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    # Tăng biến đếm trong ngày
    counts = history.setdefault("daily_counts", {})
    counts[today_str] = counts.get(today_str, 0) + 1
    
    save_history(history)
