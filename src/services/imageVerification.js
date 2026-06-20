// src/services/imageVerification.js
// Kiểm chứng hình ảnh động bằng AI Vision (Gemini hoặc OpenRouter) trước khi gửi

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { chat } = require('./aiService');
const { config } = require('../config');
const logger = require('../utils/logger');

// Khởi tạo Gemini (sẽ null nếu không có key)
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * Kiểm chứng xem một ảnh có đúng nội dung/thể loại yêu cầu không
 * @param {string} imageUrl - URL của ảnh
 * @param {string} category - Thể loại yêu cầu (ví dụ: "luffy", "sleeping anime girl")
 * @returns {Promise<boolean>} true nếu khớp hoặc bị lỗi (safety fallback), false nếu không khớp
 */
async function verifyImageContent(imageUrl, category) {
  if (!imageUrl || !category) return true;
  
  const prompt = `You are an AI assistant that verifies if an image matches a search query/theme.
The user requested an anime image of: "${category}".
Does this image show the character, action, or theme of "${category}"?
Answer with exactly "YES" or "NO" (nothing else, no explanation).`;

  logger.info(`[ImageVerification] Đang xác thực ảnh với từ khóa "${category}": ${imageUrl.substring(0, 60)}...`);
  
  // 1. Thử dùng Google Gemini API nếu có key
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout cho việc tải ảnh
      
      const imgResponse = await fetch(imageUrl, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!imgResponse.ok) {
        throw new Error(`Không thể tải ảnh để kiểm chứng: HTTP ${imgResponse.status}`);
      }
      
      const arrayBuffer = await imgResponse.arrayBuffer();
      const imagePart = {
        inlineData: {
          data: Buffer.from(arrayBuffer).toString('base64'),
          mimeType: imgResponse.headers.get('content-type') || 'image/png'
        }
      };
      
      const result = await model.generateContent([prompt, imagePart]);
      const responseText = (await result.response).text().trim().toUpperCase();
      logger.debug(`[ImageVerification] Gemini phản hồi: "${responseText}"`);
      
      if (responseText.includes('YES')) {
        return true;
      }
      if (responseText.includes('NO')) {
        return false;
      }
      // Dự phòng nếu trả về khác YES/NO
      return true;
    } catch (err) {
      logger.warn(`[ImageVerification] Lỗi Gemini API: ${err.message}. Chuyển sang dự phòng OpenRouter.`);
    }
  }
  
  // 2. Dự phòng: dùng Vision Model của OpenRouter
  try {
    const imageContentParts = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: imageUrl } }
    ];
    
    const visionResponse = await chat(
      [{ role: 'user', content: imageContentParts }],
      null,
      { model: config.ai.visionModel, maxTokens: 10, temperature: 0.1 }
    );
    
    const responseText = (visionResponse.choices?.[0]?.message?.content || '').trim().toUpperCase();
    logger.debug(`[ImageVerification] OpenRouter Vision phản hồi: "${responseText}"`);
    
    if (responseText.includes('YES')) {
      return true;
    }
    if (responseText.includes('NO')) {
      return false;
    }
  } catch (err) {
    logger.error(`[ImageVerification] Lỗi OpenRouter Vision: ${err.message}`);
  }
  
  // Mặc định trả về true nếu gặp lỗi hệ thống để không làm nghẽn bot
  logger.warn(`[ImageVerification] Gặp lỗi xác thực ảnh, tự động thông qua (Safe Fallback).`);
  return true;
}

module.exports = {
  verifyImageContent
};
