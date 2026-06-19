// src/services/geminiVision.js
// Xử lý hình ảnh bằng API chính thức của Google Gemini (độ chính xác cao hơn OpenRouter free)

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const { config } = require('../config');

// Khởi tạo Gemini (sẽ null nếu không có key)
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * Phân tích danh sách ảnh bằng Google Gemini
 * @param {Array<Object>} attachments - Danh sách file đính kèm từ Discord
 * @param {string} prompt - Yêu cầu mô tả
 * @returns {Promise<string>} Mô tả ảnh
 */
async function analyzeImagesWithGemini(attachments, prompt) {
  if (!genAI) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Tải toàn bộ ảnh dưới dạng buffer
    const imageParts = await Promise.all(
      attachments.map(async (attachment) => {
        const response = await fetch(attachment.url);
        if (!response.ok) throw new Error(`Lỗi tải ảnh: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        return {
          inlineData: {
            data: Buffer.from(arrayBuffer).toString('base64'),
            mimeType: attachment.contentType || 'image/png',
          },
        };
      })
    );

    logger.info(`Đang gọi Gemini API để phân tích ${attachments.length} ảnh...`);
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    logger.error(`Lỗi Gemini Vision: ${error.message}`);
    throw error;
  }
}

module.exports = {
  hasGeminiKey: !!process.env.GEMINI_API_KEY,
  analyzeImagesWithGemini,
};
