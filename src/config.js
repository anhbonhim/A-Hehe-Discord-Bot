// Cấu hình tập trung cho Discord AI Bot
// Tải biến môi trường từ file .env

const dotenv = require('dotenv');
const path = require('path');

// Tải file .env từ thư mục gốc dự án
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const config = {
  // Cấu hình Discord
  discord: {
    token: process.env.DISCORD_TOKEN,
  },

  // Cấu hình AI model
  ai: {
    model: process.env.AI_MODEL || 'openai/gpt-oss-120b',
    visionModel: process.env.VISION_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free',
    reasoningEffort: process.env.REASONING_EFFORT || 'auto',
    maxContextTokens: 131072,
    maxResponseTokens: 16384,
    temperature: 0.7,
  },

  // Cấu hình OpenRouter API
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseUrl: 'https://openrouter.ai/api/v1',
    referer: 'https://github.com/discord-ai-bot',
    title: 'Discord AI Bot',
  },

  // Cấu hình Tavily cho tìm kiếm web
  tavily: {
    apiKey: process.env.TAVILY_API_KEY || null,
  },

  // Cấu hình quản lý hội thoại
  conversation: {
    maxHistory: 50,                // Số tin nhắn tối đa lưu trong lịch sử
    inactivityTimeout: 7200000,    // Thời gian hết hạn do không hoạt động (2 giờ)
  },
};

// Kiểm tra các biến môi trường bắt buộc
function validateConfig() {
  const errors = [];

  if (!config.discord.token) {
    errors.push('DISCORD_TOKEN chưa được cấu hình');
  }
  if (!config.openrouter.apiKey) {
    errors.push('OPENROUTER_API_KEY chưa được cấu hình');
  }

  if (errors.length > 0) {
    console.error('❌ Lỗi cấu hình:');
    errors.forEach((err) => console.error(`   - ${err}`));
    console.error('   Vui lòng kiểm tra file .env');
    process.exit(1);
  }
}

module.exports = { config, validateConfig };
