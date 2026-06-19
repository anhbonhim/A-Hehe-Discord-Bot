const crypto = require('crypto');
const logger = require('../utils/logger');

// Lưu trữ lịch sử theo dạng hash
// Cấu trúc: { [category]: Array<string> }
const history = {};

// Số lượng ảnh tối đa lưu trong lịch sử cho mỗi category
const MAX_HISTORY_SIZE = 10;

/**
 * Tạo mã băm (hash) từ URL để tiết kiệm bộ nhớ và so sánh nhanh hơn
 * @param {string} url 
 * @returns {string} Mã băm SHA256 (hex)
 */
function hashUrl(url) {
  if (!url) return '';
  return crypto.createHash('sha256').update(url).digest('hex');
}

/**
 * Thêm một URL vào lịch sử của category
 * @param {string} category - Thể loại / từ khóa
 * @param {string} url - URL của ảnh
 */
function addHistory(category, url) {
  if (!category || !url) return;
  
  const normalizedCategory = category.toLowerCase().trim();
  const hash = hashUrl(url);
  
  if (!history[normalizedCategory]) {
    history[normalizedCategory] = [];
  }
  
  // Xóa nếu đã tồn tại để đẩy lên cuối hàng đợi (mới nhất)
  const existingIndex = history[normalizedCategory].indexOf(hash);
  if (existingIndex !== -1) {
    history[normalizedCategory].splice(existingIndex, 1);
  }
  
  // Thêm vào cuối mảng
  history[normalizedCategory].push(hash);
  
  // Giữ kích thước tối đa là MAX_HISTORY_SIZE
  if (history[normalizedCategory].length > MAX_HISTORY_SIZE) {
    history[normalizedCategory].shift(); // Bỏ phần tử cũ nhất ở đầu
  }
  
  logger.debug(`[ImageHistory] Đã thêm ảnh vào lịch sử cho ${normalizedCategory} (kích thước: ${history[normalizedCategory].length})`);
}

/**
 * Kiểm tra xem một URL có nằm trong lịch sử gửi gần đây của category không
 * @param {string} category - Thể loại / từ khóa
 * @param {string} url - URL của ảnh cần kiểm tra
 * @returns {boolean} true nếu có trong lịch sử, false nếu không
 */
function isRecent(category, url) {
  if (!category || !url) return false;
  
  const normalizedCategory = category.toLowerCase().trim();
  
  if (!history[normalizedCategory] || history[normalizedCategory].length === 0) {
    return false;
  }
  
  const hash = hashUrl(url);
  return history[normalizedCategory].includes(hash);
}

/**
 * Làm sạch lịch sử (dùng khi cần thiết)
 */
function clearAll() {
  for (const key in history) {
    delete history[key];
  }
  logger.info('[ImageHistory] Đã xóa toàn bộ lịch sử');
}

module.exports = {
  addHistory,
  isRecent,
  clearAll,
  hashUrl
};
