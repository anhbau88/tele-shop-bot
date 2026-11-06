# 🚀 Hướng Dẫn Đưa Bot Lên Render.com Để Chạy 24/7 Miễn Phí (Tắt PC Vẫn Chạy)

Để bot hoạt động liên tục 24/7 kể cả khi bạn tắt máy tính hay đi ngủ, bạn chỉ cần đưa mã nguồn lên nền tảng đám mây **Render.com** (hoàn toàn miễn phí 100%).

---

## Bước 1: Đẩy code lên GitHub cá nhân (Mất 2 phút)

1. Mở trang web [GitHub.com](https://github.com/) và đăng nhập tài khoản của bạn (nếu chưa có thì đăng ký miễn phí trong 30 giây).
2. Bấm nút **New** (Tạo Repository mới):
   * Đặt tên repository: `tele-shop-bot`
   * Chọn chế độ: **Private** (Riêng tư - để bảo mật token bot của bạn)
   * Bấm **Create repository**.
3. Mở phần mềm **Git Bash** hoặc **PowerShell** ngay tại thư mục bot trên máy tính của bạn và chạy 4 lệnh sau:
   ```bash
   git init
   git add .
   git commit -m "Khoi tao bot ban hang tele"
   git branch -M main
   git remote add origin https://github.com/TÊN_GITHUB_CỦA_BẠN/tele-shop-bot.git
   git push -u origin main
   ```

---

## Bước 2: Tạo dịch vụ chạy Bot trên Render.com (Miễn phí 100%)

1. Truy cập [Render.com](https://render.com/) và đăng nhập bằng tài khoản GitHub vừa tạo.
2. Tại bảng điều khiển Render, bấm nút **New +** $\rightarrow$ chọn **Web Service**.
3. Chọn kho code **`tele-shop-bot`** mà bạn vừa tải lên ở Bước 1.
4. Điền các thông tin cấu hình như sau:
   * **Name:** `shop-bot-telegram`
   * **Region:** Singapore (Đông Nam Á - tốc độ nhanh nhất về VN)
   * **Branch:** `main`
   * **Runtime:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `node src/index.js`
   * **Instance Type:** Chọn gói **Free** ($0/month)
5. Kéo xuống mục **Environment Variables** (Biến môi trường) và thêm các giá trị giống file `.env`:
   * `BOT_TOKEN`: `9226172041:AAFf8yBEFDRrRgjoHJ9FMAOEODO4gUIvUz4`
   * `BOT_USERNAME`: `botbanacc69_bot`
   * `BANK_CODE`: `VCB`
   * `BANK_ACCOUNT`: `9923678668`
   * `BANK_ACCOUNT_NAME`: `TRAN ANH VIET`
   * `TEST_MODE`: `true` (hoặc `false` nếu muốn bán thật)
6. Bấm nút **Create Web Service**.

---

## Bước 3: Hoàn tất!
* Render sẽ tự động tải mã nguồn, cài đặt và khởi động bot trong khoảng 1–2 phút.
* Khi màn hình hiện chữ **`Live`** màu xanh là bot đã chính thức online trên mây.
* **Từ lúc này, bạn có thể tắt máy tính thoải mái!** Bot sẽ luôn trực tuyến 24/7/365, tự động quét nhóm, nhận tiền VietQR và giao tài khoản cho khách hàng không ngừng nghỉ.
