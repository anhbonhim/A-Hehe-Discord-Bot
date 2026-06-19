// src/services/imageAnalyzer.js
// Phân tích hình ảnh bằng AI thông qua OpenRouter vision
// Hỗ trợ: phân tích đơn ảnh, đa ảnh, kiểm tra định dạng

const { chat } = require('./aiService');

// ============================================================
// CẤU HÌNH
// ============================================================

/** Danh sách định dạng ảnh được hỗ trợ bởi vision model */
const supportedFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

/** Prompt mặc định khi không chỉ định yêu cầu cụ thể */
const DEFAULT_PROMPT = 'Describe this image in detail';

// ============================================================
// HÀM KIỂM TRA ĐỊNH DẠNG ẢNH
// ============================================================

/**
 * Kiểm tra xem file đính kèm Discord có phải là ảnh được hỗ trợ không.
 * Kiểm tra cả content type và phần mở rộng file.
 *
 * @param {Object} attachment - Đối tượng file đính kèm Discord
 * @param {string} attachment.contentType - MIME type của file
 * @param {string} attachment.name - Tên file
 * @returns {boolean} true nếu là ảnh được hỗ trợ
 */
function isImageAttachment(attachment) {
  // Kiểm tra qua content type (đáng tin cậy nhất)
  if (attachment.contentType && attachment.contentType.startsWith('image/')) {
    const mimeSubtype = attachment.contentType.split('/')[1]?.toLowerCase();
    if (supportedFormats.includes(mimeSubtype)) {
      return true;
    }
  }

  // Fallback: kiểm tra qua phần mở rộng file
  if (attachment.name) {
    const ext = attachment.name.split('.').pop()?.toLowerCase();
    return supportedFormats.includes(ext);
  }

  return false;
}

// ============================================================
// PHÂN TÍCH ĐƠN ẢNH
// ============================================================

/**
 * Phân tích một hình ảnh bằng AI vision.
 * Gửi URL ảnh cùng prompt đến model vision và nhận mô tả chi tiết.
 *
 * @param {string} imageUrl - URL của hình ảnh cần phân tích
 * @param {string} [prompt='Describe this image in detail'] - Yêu cầu/câu hỏi về ảnh
 *
 * @returns {Promise<string>} Mô tả/phân tích từ AI
 *
 * @example
 *   const description = await analyzeImage(
 *     'https://cdn.discordapp.com/attachments/.../image.png',
 *     'Hãy mô tả ảnh này bằng tiếng Việt'
 *   );
 */
async function analyzeImage(imageUrl, prompt = DEFAULT_PROMPT) {
  console.info(`[ImageAnalyzer] Phân tích ảnh: ${imageUrl.substring(0, 80)}...`);

  // Xây dựng tin nhắn với content dạng mảng (vision format)
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: prompt,
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
          },
        },
      ],
    },
  ];

  try {
    // Gọi AI service để phân tích
    const response = await chat(messages, null, {
      maxTokens: 2048,
      temperature: 0.3, // Giảm temperature cho mô tả chính xác hơn
    });

    // Trích xuất nội dung phản hồi
    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('AI không trả về nội dung phân tích ảnh.');
    }

    console.info(`[ImageAnalyzer] Hoàn thành phân tích (${content.length} ký tự)`);
    return content;
  } catch (error) {
    console.error(`[ImageAnalyzer] Lỗi phân tích ảnh: ${error.message}`);
    throw new Error(`Không thể phân tích hình ảnh: ${error.message}`);
  }
}

// ============================================================
// PHÂN TÍCH ĐA ẢNH
// ============================================================

/**
 * Phân tích nhiều hình ảnh cùng lúc trong một tin nhắn.
 * Tất cả ảnh được gửi trong cùng một request để AI có thể so sánh/tổng hợp.
 *
 * @param {Array<string>} imageUrls - Mảng URL của các hình ảnh
 * @param {string} [prompt='Describe these images in detail'] - Yêu cầu/câu hỏi về các ảnh
 *
 * @returns {Promise<string>} Mô tả/phân tích tổng hợp từ AI
 *
 * @example
 *   const analysis = await analyzeMultipleImages(
 *     ['https://...img1.png', 'https://...img2.jpg'],
 *     'So sánh hai bức ảnh này'
 *   );
 */
async function analyzeMultipleImages(imageUrls, prompt = 'Describe these images in detail') {
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('Cần ít nhất một URL ảnh để phân tích.');
  }

  console.info(`[ImageAnalyzer] Phân tích ${imageUrls.length} ảnh cùng lúc`);

  // Xây dựng content array: text prompt + tất cả ảnh
  const contentArray = [
    {
      type: 'text',
      text: prompt,
    },
  ];

  // Thêm từng ảnh vào content array
  for (const url of imageUrls) {
    contentArray.push({
      type: 'image_url',
      image_url: {
        url: url,
      },
    });
  }

  const messages = [
    {
      role: 'user',
      content: contentArray,
    },
  ];

  try {
    const response = await chat(messages, null, {
      maxTokens: 4096, // Cho phép response dài hơn khi phân tích nhiều ảnh
      temperature: 0.3,
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('AI không trả về nội dung phân tích ảnh.');
    }

    console.info(
      `[ImageAnalyzer] Hoàn thành phân tích ${imageUrls.length} ảnh (${content.length} ký tự)`
    );
    return content;
  } catch (error) {
    console.error(`[ImageAnalyzer] Lỗi phân tích đa ảnh: ${error.message}`);
    throw new Error(`Không thể phân tích hình ảnh: ${error.message}`);
  }
}

// ============================================================
// HÀM TƯƠNG THÍCH VỚI EVENT HANDLERS
// ============================================================

/**
 * Alias cho isImageAttachment — dùng bởi messageCreate.
 * @param {Object} attachment - Đối tượng file đính kèm Discord
 * @returns {boolean}
 */
function isImage(attachment) {
  return isImageAttachment(attachment);
}

/**
 * Xây dựng content array multi-modal cho tin nhắn có ảnh.
 * Chuyển text content + image attachments thành format OpenAI vision.
 *
 * @param {string} textContent - Nội dung text gốc
 * @param {Array} imageAttachments - Mảng Discord attachment objects
 * @returns {Array} Content array theo format OpenAI vision
 */
function buildImageContent(textContent, imageAttachments) {
  const content = [
    { type: 'text', text: textContent || 'Hãy phân tích hình ảnh này.' },
  ];

  for (const attachment of imageAttachments) {
    content.push({
      type: 'image_url',
      image_url: { url: attachment.url },
    });
  }

  return content;
}

/**
 * Tạo prompt mặc định cho phân tích ảnh.
 * @param {number} imageCount - Số lượng ảnh
 * @returns {string} Prompt phân tích ảnh
 */
function getImageAnalysisPrompt(imageCount) {
  if (imageCount === 1) {
    return 'Hãy mô tả và phân tích chi tiết hình ảnh này.';
  }
  return `Hãy mô tả và phân tích chi tiết ${imageCount} hình ảnh này.`;
}

// ============================================================
// XUẤT MODULE
// ============================================================

module.exports = {
  /** Phân tích một hình ảnh */
  analyzeImage,

  /** Phân tích nhiều hình ảnh cùng lúc */
  analyzeMultipleImages,

  /** Kiểm tra file đính kèm có phải ảnh hỗ trợ không */
  isImageAttachment,

  /** Danh sách định dạng ảnh được hỗ trợ */
  supportedFormats,

  /** Alias — dùng bởi event handlers */
  isImage,
  buildImageContent,
  getImageAnalysisPrompt,
};
