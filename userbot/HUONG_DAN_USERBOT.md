# 📖 Hướng Dẫn Sử Dụng Userbot Quét Khách Tự Động

Bộ công cụ này giúp **tài khoản cá nhân của bạn** tự động "nằm vùng" trong mọi nhóm Telegram mà bạn tham gia. Khi thấy ai hỏi mua tài khoản AI, nick sẽ tự động gửi tin nhắn ngắn gọn, báo giá và đưa link bot `@botbanac69_bot`.

---

## Bước 1: Lấy `api_id` và `api_hash` từ Telegram (Miễn phí 100% - Mất 1 phút)
1. Dùng trình duyệt mở trang web chính thức của Telegram: 👉 **[https://my.telegram.org](https://my.telegram.org)**
2. Nhập số điện thoại tài khoản Telegram của bạn (kèm mã quốc gia `+84...`).
3. Telegram sẽ gửi một mã xác nhận vào tin nhắn Telegram của bạn $\rightarrow$ Nhập mã vào web để đăng nhập.
4. Bấm vào mục **`API development tools`**.
5. Điền thông tin tạo App (Điền đơn giản):
   * **App title:** `Shop Scanner`
   * **Short name:** `scanner`
   * Bấm **Save Changes**.
6. Bạn sẽ nhận được 2 thông số:
   * **`api_id`** (Là dãy số, ví dụ: `12345678`)
   * **`api_hash`** (Là chuỗi chữ và số, ví dụ: `0123456789abcdef...`)

---

## Bước 2: Điền vào file cấu hình
Mở file `userbot/config.json` và điền 2 thông số trên vào:
```json
{
  "api_id": 12345678,
  "api_hash": "chuỗi_api_hash_của_bạn",
  "bot_username": "botbanac69_bot",
  "send_mode": "DM",
  "min_delay_seconds": 15,
  "max_delay_seconds": 35,
  "max_messages_per_day": 25
}
```
* **`send_mode`**: 
  * `"DM"`: Tự động nhắn tin riêng vào hộp thư của khách (Mặc định).
  * `"REPLY"`: Reply trích dẫn tin nhắn của khách ngay trong nhóm.
  * `"BOTH"`: Vừa reply nhóm vừa nhắn tin riêng.
* **`max_messages_per_day`**: Mặc định 25 khách/ngày để bảo vệ nick tuyệt đối an toàn không bao giờ bị khóa.

---

## Bước 3: Khởi chạy
1. Bấm đúp chuột vào file **`userbot/run.bat`**.
2. Lần đầu tiên chạy, cửa sổ đen sẽ hỏi:
   * **`Please enter your phone (or bot token):`** $\rightarrow$ Nhập số điện thoại của bạn (VD: `+84912345678`).
   * **`Please enter the code you received:`** $\rightarrow$ Nhập mã OTP gồm 5 số mà Telegram gửi về app Telegram của bạn.
   * Nếu nick có cài mật khẩu 2 lớp (2FA) thì nhập thêm mật khẩu.
3. Sau khi đăng nhập thành công, tool sẽ tự tạo file `userbot_session` và từ các lần sau bạn chỉ cần bật lên là chạy ngay, **không phải đăng nhập lại**.

---

## 🎯 Văn phong tự động gửi (Cộc, ngắn, đúng chất dân buôn):
* **Khách hỏi GPT:** *"Bác cần GPT Plus à, bên em sẵn acc dùng chung 135k / chính chủ 450k nhé. Lấy acc tự động ở đây: @botbanac69_bot"*
* **Khách hỏi Gemini:** *"Gemini Pro 6 tháng 200k sẵn kho đây bác, quét QR lấy luôn: @botbanac69_bot"*
* **Khách hỏi chung:** *"Bác cần acc AI gì cứ ghé bot em check nhé, sẵn Plus 135k, Gemini 200k rẻ hơn thị trường: @botbanac69_bot"*
