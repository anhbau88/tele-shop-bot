# 📖 Hướng Dẫn Sử Dụng Bot Bán Hàng Telegram (@botbanacc69_bot)

Chào bạn! Bot bán tài khoản AI tự động của bạn đã được khởi chạy thành công trực tiếp trên máy tính với chi phí **0 đồng**.

---

## 1. Trải Nghiệm Mua Hàng Ngay Lập Tức
1. Mở ứng dụng Telegram, vào tìm kiếm bot: **`@botbanacc69_bot`**
2. Bấm nút **START** (hoặc gửi `/start` / `/menu`).
3. Bạn sẽ thấy Menu chính chia theo các **Danh mục AI lớn** (lưới 2 cột gọn gàng):
   * `🟢 ChatGPT / OpenAI`
   * `✨ Google Gemini Pro`
   * `🧠 Claude AI Anthropic`
   * `💻 Cursor & Code AI`
   * `🚀 Super Grok / xAI`
   * `🎨 Design & Media AI`
4. Bấm vào một danh mục bất kỳ $\rightarrow$ Chọn sản phẩm $\rightarrow$ Bấm chọn số lượng (Mua 1, Mua 2...).
5. **Màn hình thanh toán:**
   * Bot sẽ gửi ngay **ảnh mã QR Vietcombank** (đã điền sẵn số tiền & nội dung chuyển khoản).
   * Thông tin STK: **9923678668 - VCB (TRAN ANH VIET)**.
   * Vì đang bật chế độ **Test Mode**, bạn chỉ cần bấm nút:  
     👉 **`[ 🧪 Thanh toán thử nghiệm (Test Mode 0đ) ]`**  
     Bot sẽ ngay lập tức xuất tài khoản và mật khẩu ra màn hình chat cho bạn!
6. Bấm nút **`[ 📜 Đơn hàng đã mua ]`** để xem lại tài khoản bất kỳ lúc nào.

---

## 2. Kích Hoạt Quyền Admin Quản Trị
1. Trong khung chat với bot, gửi lệnh:
   ```text
   /setadmin
   ```
2. Bot sẽ cấp quyền **Admin tối cao** cho tài khoản Telegram của bạn.
3. Gửi lệnh:
   ```text
   /admin
   ```
   Bảng điều khiển quản trị sẽ hiện ra với các tính năng:
   * **`📊 Thống kê doanh thu:`** Xem tổng doanh thu bán được, số đơn hàng và lượng tồn kho chi tiết của từng sản phẩm.
   * **`📦 Nhập kho tài khoản:`** Chọn sản phẩm muốn nạp thêm $\rightarrow$ Dán danh sách tài khoản (mỗi dòng 1 acc) $\rightarrow$ Bot tự đếm và lưu vào kho.
   * **`📢 Tạo bài thông báo kho hàng:`** Tự động tạo tin nhắn cập nhật kho hàng (kèm nút `🛒 Mua ngay`) giống hệt ảnh mẫu của bạn để bạn chuyển tiếp vào Channel.

---

## 3. Quy Trình Duyệt Đơn Khi Bán Thật
Khi khách hàng quét mã VietQR và bấm **`[ ✅ Tôi đã chuyển khoản ]`**:
1. Bot sẽ tự động gửi một thông báo riêng đến tài khoản Telegram Admin của bạn:
   * Tên khách hàng, mã đơn `#DHxxxx`, số tiền cần nhận.
   * Kèm 2 nút bấm: **`[ ✅ Duyệt nhận tiền & Giao acc ]`** và **`[ ❌ Từ chối ]`**.
2. Khi điện thoại bạn nhận được tin nhắn biến động số dư Vietcombank đúng số tiền đó, bạn chỉ cần bấm nút **`[ ✅ Duyệt nhận tiền & Giao acc ]`** $\rightarrow$ Bot tự động nhả tài khoản cho khách ngay tức khắc mà bạn không cần phải copy dán thủ công!

---

## 4. Bật / Tắt Chế Độ Test Mode
Khi bạn đã thử nghiệm xong và muốn bắt đầu bán thật:
1. Mở file `.env` trong thư mục dự án.
2. Đổi dòng:
   ```env
   TEST_MODE=true
   ```
   thành:
   ```env
   TEST_MODE=false
   ```
3. Khởi động lại bot. Lúc này nút *"Thanh toán thử 0đ"* sẽ tự động biến mất, chỉ khách chuyển khoản thật và được duyệt mới nhận được tài khoản.
