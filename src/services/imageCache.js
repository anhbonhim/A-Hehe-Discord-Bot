const logger = require('../utils/logger');

// Lưu trữ bộ nhớ đệm
// Cấu trúc: { [category]: { images: Array<string>, expiresAt: number } }
const cache = {};

// Thời gian sống (TTL) của cache: 24 giờ
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Ngưỡng Soft Refresh: trước 10 phút khi hết hạn (tức là sau 23h50)
const SOFT_REFRESH_THRESHOLD_MS = 10 * 60 * 1000;

/**
 * Lưu danh sách ảnh vào cache cho một category
 * @param {string} category - Thể loại / từ khóa
 * @param {Array<string>} images - Danh sách URL ảnh
 */
function setCache(category, images) {
  if (!category || !images || images.length === 0) return;
  
  const normalizedCategory = category.toLowerCase().trim();
  
  cache[normalizedCategory] = {
    images,
    expiresAt: Date.now() + CACHE_TTL_MS
  };
  
  logger.debug(`[ImageCache] Đã lưu cache cho category: ${normalizedCategory} (${images.length} ảnh)`);
}

/**
 * Lấy cache nếu còn hạn
 * @param {string} category - Thể loại / từ khóa
 * @returns {Object|null} Trả về { images, needsRefresh } hoặc null nếu hết hạn/không có
 */
function getCache(category) {
  if (!category) return null;
  
  const normalizedCategory = category.toLowerCase().trim();
  const cachedData = cache[normalizedCategory];
  
  if (!cachedData) return null;
  
  const now = Date.now();
  
  // Nếu đã quá thời gian hết hạn (Hard expiration)
  if (now > cachedData.expiresAt) {
    logger.debug(`[ImageCache] Cache cho ${normalizedCategory} đã quá hạn`);
    delete cache[normalizedCategory];
    return null;
  }
  
  // Kiểm tra Soft Refresh (còn dưới 10 phút nữa là hết hạn)
  const timeUntilExpiration = cachedData.expiresAt - now;
  const needsRefresh = timeUntilExpiration <= SOFT_REFRESH_THRESHOLD_MS;
  
  if (needsRefresh) {
    logger.debug(`[ImageCache] Cache cho ${normalizedCategory} cần được làm mới (soft refresh)`);
  }
  
  return {
    images: cachedData.images,
    needsRefresh
  };
}

/**
 * Xóa cache của một category cụ thể
 * @param {string} category 
 */
function clearCache(category) {
  const normalizedCategory = category.toLowerCase().trim();
  if (cache[normalizedCategory]) {
    delete cache[normalizedCategory];
  }
}

/**
 * Dọn dẹp tất cả cache
 */
function clearAll() {
  for (const key in cache) {
    delete cache[key];
  }
  logger.info('[ImageCache] Đã xóa toàn bộ bộ nhớ đệm');
}

module.exports = {
  setCache,
  getCache,
  clearCache,
  clearAll
};
