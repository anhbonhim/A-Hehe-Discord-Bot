const { EmbedBuilder } = require('discord.js');

/**
 * Tạo embed hướng dẫn sử dụng bot
 * @param {import('discord.js').Client} client 
 * @returns {EmbedBuilder}
 */
function getBotHelpEmbed(client) {
  return new EmbedBuilder()
    .setColor(0x00AE86)
    .setTitle('📖 Hướng dẫn sử dụng Discord AI Bot')
    .setDescription(
      `Chào bạn! Tôi là một trợ lý AI thông minh chạy trên nền tảng **GPT-OSS 120B** kết hợp cùng **Google Gemini Vision**.\n` +
      `Dưới đây là chi tiết các tính năng và cách sử dụng tôi:`
    )
    .addFields(
      {
        name: '💬 Cách trò chuyện với tôi',
        value: 
          `• **Kênh chung:** Tag tôi \`@hehe <câu hỏi>\` hoặc **Reply** trực tiếp vào bất kỳ tin nhắn nào của tôi.\n` +
          `• **Reply chéo:** Bạn có thể tag tôi \`@hehe\` trong một tin nhắn reply để tôi đọc và phân tích tin nhắn gốc đó.`
      },
      {
        name: '🖼️ Phân tích hình ảnh (Vision)',
        value: 
          `• Gửi ảnh kèm câu hỏi (ví dụ: *"đây là game gì?"*).\n` +
          `• Hệ thống sử dụng **Google Gemini API** (hoặc tự động dự phòng qua **OpenRouter Vision**) để đọc hiểu hình ảnh, đọc chữ (OCR) cực kỳ chính xác.`
      },
      {
        name: '📄 Đọc tài liệu',
        value: `• Gửi các file tài liệu dạng **PDF, DOCX, TXT, CSV, JSON** kèm yêu cầu (ví dụ: *"tóm tắt file này cho mình"*).`
      },
      {
        name: '🔍 Tìm kiếm Web thời gian thực',
        value: `• Tôi sẽ tự động tìm kiếm Google/Tavily khi bạn hỏi về tin tức mới nhất hoặc thông tin ngoài tầm hiểu biết.`
      },
      {
        name: '🌸 Ảnh Anime & Tương tác',
        value: `• Gõ \`anime list\` hoặc tag tôi kèm các từ khóa như: \`waifu\`, \`neko\`, \`hug\` (ôm), \`pat\` (xoa đầu), \`kiss\` (hôn), \`slap\` (tát)... để nhận ảnh Anime ngẫu nhiên.`
      },
      {
        name: '⚡ Lệnh Chat trực tiếp (Không cần slash /)',
        value: 
          `• \`clear\` hoặc \`xóa lịch sử\` — Xóa lịch sử trò chuyện của kênh.\n` +
          `• \`model\` hoặc \`xem mô hình\` — Xem thông số model AI đang chạy.\n` +
          `• \`đổi model <tên>\` — Chuyển đổi model chính trên OpenRouter.\n` +
          `• \`đổi reasoning <auto|low|medium|high>\` — Thay đổi mức độ suy luận.\n` +
          `• \`tìm kiếm <nội dung>\` — Tra cứu Google/Tavily trực tiếp.`
      }
    )
    .setFooter({ text: 'Chúc bạn có một trải nghiệm thú vị!' })
    .setTimestamp();
}

module.exports = { getBotHelpEmbed };
