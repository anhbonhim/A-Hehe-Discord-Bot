// src/services/documentParser.js
// Phân tích tài liệu từ file đính kèm Discord
// Hỗ trợ: PDF, DOCX, TXT, MD, CSV, JSON, JS, PY và các file text khác

const path = require('path');

// ============================================================
// CẤU HÌNH
// ============================================================

/**
 * Danh sách phần mở rộng file text thuần (đọc trực tiếp dạng UTF-8).
 * Bao gồm các ngôn ngữ lập trình phổ biến.
 */
const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'json', 'jsonl',
  'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
  'py', 'pyw', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'hpp',
  'cs', 'go', 'rs', 'swift', 'kt', 'kts',
  'html', 'htm', 'css', 'scss', 'less', 'sass',
  'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
  'sh', 'bash', 'zsh', 'fish', 'bat', 'cmd', 'ps1',
  'sql', 'graphql', 'gql',
  'env', 'gitignore', 'dockerignore', 'editorconfig',
  'log', 'rst', 'tex', 'r', 'lua', 'dart', 'vue', 'svelte',
]);

/** Kích thước file tối đa cho phép (25MB — giới hạn Discord) */
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/** Timeout tải file (ms) */
const DOWNLOAD_TIMEOUT_MS = 30000;

// ============================================================
// HÀM TẢI FILE TỪ URL
// ============================================================

/**
 * Tải file từ URL đính kèm Discord.
 * @param {string} url - URL tải file
 * @returns {Promise<Buffer>} Nội dung file dạng Buffer
 */
async function downloadFile(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Discord-AI-Bot/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Không thể tải file: HTTP ${response.status} ${response.statusText}`);
    }

    // Đọc response thành ArrayBuffer rồi chuyển sang Buffer
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// HÀM PHÂN TÍCH TỪNG LOẠI FILE
// ============================================================

/**
 * Phân tích file PDF — trích xuất text từ tất cả các trang.
 * @param {Buffer} buffer - Nội dung file PDF
 * @returns {Promise<string>} Nội dung text được trích xuất
 */
async function parsePDF(buffer) {
  // Lazy import để tránh lỗi khi package chưa được cài đặt
  const pdfParse = require('pdf-parse');

  const data = await pdfParse(buffer);
  return data.text || '';
}

/**
 * Phân tích file DOCX — trích xuất text thuần (không giữ format).
 * @param {Buffer} buffer - Nội dung file DOCX
 * @returns {Promise<string>} Nội dung text được trích xuất
 */
async function parseDOCX(buffer) {
  // Lazy import
  const mammoth = require('mammoth');

  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

/**
 * Đọc file text thuần dạng UTF-8.
 * @param {Buffer} buffer - Nội dung file
 * @returns {string} Nội dung text
 */
function parseText(buffer) {
  return buffer.toString('utf-8');
}

// ============================================================
// HÀM XÁC ĐỊNH LOẠI FILE
// ============================================================

/**
 * Xác định loại file từ tên file.
 * @param {string} fileName - Tên file (có phần mở rộng)
 * @returns {string} Loại file: 'pdf', 'docx', 'text', hoặc 'unsupported'
 */
function detectFileType(fileName) {
  const ext = path.extname(fileName).toLowerCase().replace('.', '');

  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';

  // Thử nhận diện file không có extension hoặc extension lạ
  // Giả sử là text nếu không có extension
  if (!ext) return 'text';

  return 'unsupported';
}

// ============================================================
// HÀM CHÍNH: PHÂN TÍCH TÀI LIỆU
// ============================================================

/**
 * Phân tích tài liệu từ file đính kèm Discord.
 * Tự động phát hiện loại file và sử dụng parser phù hợp.
 *
 * @param {Object} attachment - Đối tượng file đính kèm Discord
 * @param {string} attachment.url - URL tải file
 * @param {string} attachment.name - Tên file
 * @param {number} attachment.size - Kích thước file (bytes)
 *
 * @returns {Promise<Object>} Kết quả phân tích:
 *   {
 *     fileName: string,      // Tên file gốc
 *     fileType: string,      // Loại file (pdf, docx, text)
 *     content: string,       // Nội dung text được trích xuất
 *     charCount: number      // Số ký tự
 *   }
 *
 * @throws {Error} Khi file quá lớn, loại không được hỗ trợ, hoặc lỗi phân tích
 */
async function parseDocument(attachment) {
  const { url, name: fileName, size } = attachment;

  console.info(`[DocumentParser] Bắt đầu phân tích: ${fileName} (${formatBytes(size)})`);

  // Kiểm tra kích thước file
  if (size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File "${fileName}" quá lớn (${formatBytes(size)}). ` +
      `Giới hạn: ${formatBytes(MAX_FILE_SIZE_BYTES)}.`
    );
  }

  // Xác định loại file
  const fileType = detectFileType(fileName);
  if (fileType === 'unsupported') {
    const ext = path.extname(fileName);
    throw new Error(
      `Loại file "${ext}" không được hỗ trợ. ` +
      `Hỗ trợ: PDF, DOCX, TXT, MD, CSV, JSON, JS, PY và các file text khác.`
    );
  }

  // Tải file từ Discord CDN
  const buffer = await downloadFile(url);

  // Phân tích nội dung theo loại file
  let content = '';

  switch (fileType) {
    case 'pdf':
      content = await parsePDF(buffer);
      break;

    case 'docx':
      content = await parseDOCX(buffer);
      break;

    case 'text':
      content = parseText(buffer);
      break;

    default:
      throw new Error(`Không có parser cho loại file: ${fileType}`);
  }

  // Loại bỏ ký tự null và whitespace thừa
  content = content.replace(/\0/g, '').trim();

  const result = {
    fileName,
    fileType,
    content,
    charCount: content.length,
  };

  console.info(
    `[DocumentParser] Hoàn thành: ${fileName} — ${result.charCount} ký tự`
  );

  return result;
}

// ============================================================
// HÀM CHIA NHỎ VĂN BẢN
// ============================================================

/**
 * Chia văn bản dài thành các đoạn nhỏ hơn.
 * Cần thiết khi nội dung tài liệu quá dài để gửi trong một lần.
 *
 * @param {string} text - Văn bản cần chia
 * @param {number} [maxChars=6000] - Số ký tự tối đa mỗi đoạn
 * @returns {Array<string>} Mảng các đoạn văn bản
 */
function chunkText(text, maxChars = 6000) {
  // Nếu text ngắn hơn giới hạn, trả về nguyên vẹn
  if (!text || text.length <= maxChars) {
    return text ? [text] : [];
  }

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      // Phần còn lại vừa đủ — thêm vào và kết thúc
      chunks.push(remaining);
      break;
    }

    // Tìm điểm cắt tốt nhất trong phạm vi maxChars
    let cutPoint = maxChars;

    // Ưu tiên 1: Cắt tại ranh giới đoạn văn (\n\n)
    const paragraphBreak = remaining.lastIndexOf('\n\n', maxChars);
    if (paragraphBreak > maxChars * 0.3) {
      cutPoint = paragraphBreak + 2; // +2 để bao gồm \n\n
    } else {
      // Ưu tiên 2: Cắt tại ranh giới dòng (\n)
      const lineBreak = remaining.lastIndexOf('\n', maxChars);
      if (lineBreak > maxChars * 0.3) {
        cutPoint = lineBreak + 1;
      } else {
        // Ưu tiên 3: Cắt tại ranh giới câu (. )
        const sentenceBreak = remaining.lastIndexOf('. ', maxChars);
        if (sentenceBreak > maxChars * 0.3) {
          cutPoint = sentenceBreak + 2;
        }
        // Ưu tiên 4: Cắt cứng tại maxChars (mặc định)
      }
    }

    chunks.push(remaining.substring(0, cutPoint));
    remaining = remaining.substring(cutPoint);
  }

  console.info(
    `[DocumentParser] Đã chia văn bản thành ${chunks.length} đoạn ` +
    `(tổng ${text.length} ký tự)`
  );

  return chunks;
}

// ============================================================
// HÀM TIỆN ÍCH
// ============================================================

/**
 * Format số bytes thành chuỗi dễ đọc (KB, MB, v.v.)
 * @param {number} bytes - Số bytes
 * @returns {string} Chuỗi đã format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

// ============================================================
// HÀM TƯƠNG THÍCH VỚI EVENT HANDLERS
// ============================================================

/**
 * Kiểm tra xem file đính kèm có phải tài liệu được hỗ trợ không.
 * Dùng bởi messageCreate event handler.
 * @param {Object} attachment - Đối tượng file đính kèm Discord
 * @returns {boolean}
 */
function isDocument(attachment) {
  if (!attachment || !attachment.name) return false;
  const ext = path.extname(attachment.name).toLowerCase().replace('.', '');
  const fileType = detectFileType(attachment.name);
  return fileType !== 'unsupported';
}

/**
 * Trích xuất nội dung từ file đính kèm Discord.
 * Wrapper cho parseDocument trả về format đơn giản hơn.
 * @param {Object} attachment - Đối tượng file đính kèm Discord
 * @returns {Promise<Object>} { filename, type, content }
 */
async function extractContent(attachment) {
  const result = await parseDocument(attachment);
  return {
    filename: result.fileName,
    type: result.fileType,
    content: result.content.length > 50000
      ? result.content.substring(0, 50000) + '\n\n... [Nội dung đã bị cắt do quá dài]'
      : result.content,
  };
}

// ============================================================
// XUẤT MODULE
// ============================================================

module.exports = {
  /** Phân tích tài liệu từ file đính kèm Discord */
  parseDocument,

  /** Chia văn bản dài thành các đoạn nhỏ hơn */
  chunkText,

  /** Kiểm tra file có phải tài liệu không — dùng bởi event handlers */
  isDocument,

  /** Trích xuất nội dung file — dùng bởi event handlers */
  extractContent,
};
