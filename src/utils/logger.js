// src/utils/logger.js
// Logger đơn giản với màu sắc ANSI cho terminal
// Format: [HH:MM:SS] [LEVEL] message

// ============================================================
// MÃ MÀU ANSI
// ============================================================

/** Mã màu ANSI cho từng cấp độ log */
const ANSI = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',

  // Màu foreground
  CYAN: '\x1b[36m',     // info — thông tin
  YELLOW: '\x1b[33m',   // warn — cảnh báo
  RED: '\x1b[31m',      // error — lỗi
  GRAY: '\x1b[90m',     // debug — gỡ lỗi
  GREEN: '\x1b[32m',    // success — thành công

  // Màu background (dùng cho nhãn cấp độ)
  BG_CYAN: '\x1b[46m',
  BG_YELLOW: '\x1b[43m',
  BG_RED: '\x1b[41m',
  BG_GRAY: '\x1b[100m',
  BG_GREEN: '\x1b[42m',
  BLACK: '\x1b[30m',
};

// ============================================================
// HÀM TIỆN ÍCH
// ============================================================

/**
 * Lấy timestamp hiện tại theo format HH:MM:SS.
 * @returns {string} Timestamp đã format
 */
function getTimestamp() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format và in log ra terminal với màu sắc.
 *
 * @param {string} level - Cấp độ log (INFO, WARN, ERROR, DEBUG, SUCCESS)
 * @param {string} color - Mã màu ANSI cho text
 * @param {string} bgColor - Mã màu nền ANSI cho nhãn cấp độ
 * @param {string} message - Nội dung log
 * @param {Array} args - Tham số bổ sung (sẽ được truyền cho console.log)
 */
function formatLog(level, color, bgColor, message, args) {
  const timestamp = getTimestamp();

  // Format: [HH:MM:SS] [LEVEL] message
  const prefix = `${ANSI.DIM}[${timestamp}]${ANSI.RESET} ${bgColor}${ANSI.BLACK}${ANSI.BOLD} ${level} ${ANSI.RESET}`;
  const coloredMessage = `${color}${message}${ANSI.RESET}`;

  if (args.length > 0) {
    console.log(`${prefix} ${coloredMessage}`, ...args);
  } else {
    console.log(`${prefix} ${coloredMessage}`);
  }
}

// ============================================================
// LOGGER OBJECT
// ============================================================

/**
 * Logger đơn giản với màu sắc cho terminal.
 *
 * Cách sử dụng:
 *   const { logger } = require('./utils/logger');
 *   logger.info('Bot đã khởi động');
 *   logger.success('Kết nối thành công');
 *   logger.warn('Cảnh báo: rate limit');
 *   logger.error('Lỗi kết nối');
 *   logger.debug('Chi tiết debug...');
 */
const logger = {
  /**
   * Log thông tin — màu cyan.
   * Dùng cho: trạng thái, thông báo, sự kiện thông thường.
   * @param {string} message - Nội dung log
   * @param {...any} args - Tham số bổ sung
   */
  info(message, ...args) {
    formatLog('INFO', ANSI.CYAN, ANSI.BG_CYAN, message, args);
  },

  /**
   * Log cảnh báo — màu vàng.
   * Dùng cho: vấn đề tiềm ẩn, deprecation, hiệu suất.
   * @param {string} message - Nội dung log
   * @param {...any} args - Tham số bổ sung
   */
  warn(message, ...args) {
    formatLog('WARN', ANSI.YELLOW, ANSI.BG_YELLOW, message, args);
  },

  /**
   * Log lỗi — màu đỏ.
   * Dùng cho: lỗi nghiêm trọng, exception, thất bại.
   * @param {string} message - Nội dung log
   * @param {...any} args - Tham số bổ sung
   */
  error(message, ...args) {
    formatLog('ERROR', ANSI.RED, ANSI.BG_RED, message, args);
  },

  /**
   * Log debug — màu xám.
   * Dùng cho: chi tiết kỹ thuật, biến, trạng thái nội bộ.
   * @param {string} message - Nội dung log
   * @param {...any} args - Tham số bổ sung
   */
  debug(message, ...args) {
    formatLog('DEBUG', ANSI.GRAY, ANSI.BG_GRAY, message, args);
  },

  /**
   * Log thành công — màu xanh lá.
   * Dùng cho: hoàn thành task, kết nối thành công, khởi tạo OK.
   * @param {string} message - Nội dung log
   * @param {...any} args - Tham số bổ sung
   */
  success(message, ...args) {
    formatLog('SUCCESS', ANSI.GREEN, ANSI.BG_GREEN, message, args);
  },
  /**
   * Log sự kiện Discord — màu tím.
   * Dùng cho: tin nhắn Discord, interactions, events.
   * @param {string} message - Nội dung log
   * @param {...any} args - Tham số bổ sung
   */
  discord(message, ...args) {
    formatLog('DISCORD', '\x1b[35m', '\x1b[45m', message, args);
  },
};

// ============================================================
// XUẤT MODULE
// ============================================================

module.exports = logger;
