const config = require('../config');

/**
 * Tạo link ảnh QR thanh toán VietQR chuẩn PNG
 * @param {number} amount Số tiền thanh toán (VNĐ)
 * @param {string} orderCode Mã đơn hàng làm nội dung chuyển khoản
 * @returns {string} URL ảnh VietQR PNG
 */
function generateVietQRUrl(amount, orderCode) {
  const bankCode = encodeURIComponent(config.BANK_CODE);
  const accountNo = encodeURIComponent(config.BANK_ACCOUNT);
  const memo = encodeURIComponent(orderCode);

  // Dịch vụ sinh ảnh PNG chuẩn VietQR (hỗ trợ đầy đủ logo ngân hàng & mã chuyển tiền)
  return `https://qr.sepay.vn/img?acc=${accountNo}&bank=${bankCode}&amount=${amount}&des=${memo}&template=compact`;
}

/**
 * Tải ảnh QR dưới dạng Buffer để gửi trực tiếp qua Telegram InputFile (chống lỗi tải URL)
 * @param {number} amount
 * @param {string} orderCode
 * @returns {Promise<Buffer|null>}
 */
async function fetchQRBuffer(amount, orderCode) {
  try {
    const url = generateVietQRUrl(amount, orderCode);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('Lỗi khi tải ảnh QR:', err);
    return null;
  }
}

/**
 * Định dạng tiền tệ VNĐ (VD: 90000 -> "90.000đ")
 * @param {number} num 
 * @returns {string}
 */
function formatVND(num) {
  return new Intl.NumberFormat('vi-VN').format(num) + 'đ';
}

module.exports = {
  generateVietQRUrl,
  fetchQRBuffer,
  formatVND
};
