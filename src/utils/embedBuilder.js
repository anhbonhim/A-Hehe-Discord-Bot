// src/utils/embedBuilder.js
// Tạo các Discord embed đẹp mắt cho bot AI
// Mỗi loại embed có màu sắc và format riêng biệt

const { EmbedBuilder } = require('discord.js');

// ============================================================
// BẢNG MÀU
// ============================================================

/** Màu sắc cho từng loại embed (hex) */
const COLORS = {
  AI: 0x6366f1,       // Indigo — phản hồi AI
  SEARCH: 0x10b981,   // Emerald — kết quả tìm kiếm
  ERROR: 0xef4444,    // Red — thông báo lỗi
  DOCUMENT: 0xf59e0b, // Amber — thông tin tài liệu
  INFO: 0x6b7280,     // Gray — thông tin chung
};

// ============================================================
// EMBED PHẢN HỒI AI
// ============================================================

/**
 * Tạo embed cho phản hồi AI đặc biệt (format rich).
 * Dùng cho các phản hồi cần trình bày nổi bật.
 *
 * @param {string} content - Nội dung phản hồi từ AI
 * @param {string} [model='GPT-OSS 120B'] - Tên model AI đã sử dụng
 * @returns {EmbedBuilder} Discord embed đã cấu hình
 */
function createAIResponseEmbed(content, model = 'GPT-OSS 120B') {
  // Cắt nội dung nếu vượt quá giới hạn embed (4096 ký tự)
  const truncatedContent =
    content.length > 4096
      ? content.substring(0, 4090) + '\n...'
      : content;

  return new EmbedBuilder()
    .setColor(COLORS.AI)
    .setDescription(truncatedContent)
    .setFooter({
      text: `⚡ Powered by ${model}`,
    })
    .setTimestamp();
}

// ============================================================
// EMBED KẾT QUẢ TÌM KIẾM
// ============================================================

/**
 * Tạo embed hiển thị kết quả tìm kiếm web.
 * Liệt kê các kết quả với tiêu đề, URL, và đoạn trích.
 *
 * @param {Array<Object>} results - Mảng kết quả tìm kiếm
 *   Mỗi phần tử: { title: string, url: string, snippet: string }
 * @param {string} query - Truy vấn tìm kiếm gốc
 * @returns {EmbedBuilder} Discord embed đã cấu hình
 */
function createSearchResultEmbed(results, query) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.SEARCH)
    .setTitle('🔍 Kết quả tìm kiếm')
    .setTimestamp();

  // Thêm truy vấn gốc
  if (query) {
    embed.setDescription(`Tìm kiếm: **${query}**`);
  }

  // Thêm từng kết quả dưới dạng field
  if (results && results.length > 0) {
    results.forEach((result, index) => {
      // Cắt snippet nếu quá dài (giới hạn field value: 1024 ký tự)
      const snippet =
        result.snippet && result.snippet.length > 200
          ? result.snippet.substring(0, 200) + '...'
          : result.snippet || 'Không có mô tả';

      // Format: tiêu đề là link, snippet bên dưới
      const fieldValue = result.url
        ? `[${result.url}](${result.url})\n${snippet}`
        : snippet;

      embed.addFields({
        name: `${index + 1}. ${result.title || 'Không có tiêu đề'}`,
        value: fieldValue.substring(0, 1024), // Đảm bảo không vượt giới hạn
        inline: false,
      });
    });
  } else {
    embed.addFields({
      name: 'Không có kết quả',
      value: 'Không tìm thấy kết quả nào phù hợp.',
      inline: false,
    });
  }

  embed.setFooter({
    text: `Tìm thấy ${results?.length || 0} kết quả`,
  });

  return embed;
}

// ============================================================
// EMBED THÔNG BÁO LỖI
// ============================================================

/**
 * Tạo embed thông báo lỗi.
 * Hiển thị thông tin lỗi rõ ràng cho người dùng.
 *
 * @param {string|Error} error - Thông báo lỗi hoặc đối tượng Error
 * @returns {EmbedBuilder} Discord embed đã cấu hình
 */
function createErrorEmbed(error) {
  // Trích xuất message từ Error object hoặc dùng string trực tiếp
  const errorMessage =
    error instanceof Error ? error.message : String(error);

  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle('❌ Đã xảy ra lỗi')
    .setDescription(
      errorMessage.length > 4096
        ? errorMessage.substring(0, 4090) + '...'
        : errorMessage
    )
    .setFooter({
      text: 'Vui lòng thử lại hoặc liên hệ quản trị viên',
    })
    .setTimestamp();
}

// ============================================================
// EMBED THÔNG TIN TÀI LIỆU
// ============================================================

/**
 * Tạo embed hiển thị thông tin tài liệu đã phân tích.
 * Cho biết tên file, loại file, và số ký tự.
 *
 * @param {Object} docInfo - Thông tin tài liệu
 * @param {string} docInfo.fileName - Tên file
 * @param {string} docInfo.fileType - Loại file (pdf, docx, text)
 * @param {number} docInfo.charCount - Số ký tự
 * @returns {EmbedBuilder} Discord embed đã cấu hình
 */
function createDocumentEmbed(docInfo) {
  // Map loại file sang biểu tượng emoji
  const typeEmojis = {
    pdf: '📄',
    docx: '📝',
    text: '📃',
  };

  const emoji = typeEmojis[docInfo.fileType] || '📎';

  return new EmbedBuilder()
    .setColor(COLORS.DOCUMENT)
    .setTitle(`${emoji} Tài liệu đã phân tích`)
    .addFields(
      {
        name: '📁 Tên file',
        value: docInfo.fileName || 'Không rõ',
        inline: true,
      },
      {
        name: '📋 Loại file',
        value: (docInfo.fileType || 'Không rõ').toUpperCase(),
        inline: true,
      },
      {
        name: '📊 Số ký tự',
        value: (docInfo.charCount || 0).toLocaleString('vi-VN'),
        inline: true,
      }
    )
    .setFooter({
      text: 'Nội dung đã được trích xuất và gửi đến AI',
    })
    .setTimestamp();
}

// ============================================================
// EMBED THÔNG TIN CHUNG
// ============================================================

/**
 * Tạo embed thông tin chung.
 * Dùng cho các thông báo, hướng dẫn, hoặc thông tin bot.
 *
 * @param {string} title - Tiêu đề embed
 * @param {string} description - Nội dung mô tả
 * @returns {EmbedBuilder} Discord embed đã cấu hình
 */
function createInfoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(title)
    .setDescription(
      description.length > 4096
        ? description.substring(0, 4090) + '...'
        : description
    )
    .setTimestamp();
}

// ============================================================
// XUẤT MODULE
// ============================================================

module.exports = {
  /** Embed cho phản hồi AI */
  createAIResponseEmbed,

  /** Embed cho kết quả tìm kiếm */
  createSearchResultEmbed,

  /** Embed cho thông báo lỗi */
  createErrorEmbed,

  /** Embed cho thông tin tài liệu */
  createDocumentEmbed,

  /** Embed cho thông tin chung */
  createInfoEmbed,

  /** Bảng màu (export để module khác sử dụng nếu cần) */
  COLORS,
};
