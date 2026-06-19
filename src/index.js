// Điểm khởi đầu chính của Discord AI Bot
// Khởi tạo client, tải events và commands, đăng nhập

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { config, validateConfig } = require('./config');
const logger = require('./utils/logger');
const conversationManager = require('./services/conversationManager');

// Xác thực cấu hình trước khi khởi động
validateConfig();

// Khởi tạo Discord client với các intents cần thiết
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
  ],
  partials: [
    Partials.Channel,  // Cần thiết để nhận DM
    Partials.Message,
  ],
});

/**
 * Tải tất cả event handlers từ thư mục src/events/
 */
function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');

  // Kiểm tra thư mục events có tồn tại không
  if (!fs.existsSync(eventsPath)) {
    logger.warn('Thư mục events không tồn tại');
    return;
  }

  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    try {
      const event = require(path.join(eventsPath, file));

      if (!event.name) {
        logger.warn(`Event file ${file} thiếu thuộc tính "name", bỏ qua`);
        continue;
      }

      // Đăng ký event với client
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      logger.info(`Đã tải event: ${event.name} (${file})`);
    } catch (error) {
      logger.error(`Lỗi tải event ${file}: ${error.message}`);
    }
  }
}


/**
 * Xử lý tắt bot một cách an toàn
 * @param {string} signal - Tín hiệu nhận được
 */
async function gracefulShutdown(signal) {
  logger.info(`Nhận tín hiệu ${signal}. Đang tắt bot...`);

  try {
    // Dọn dẹp bộ nhớ hội thoại
    conversationManager.shutdown();

    // Ngắt kết nối Discord
    client.destroy();
    logger.success('Bot đã tắt an toàn');
  } catch (error) {
    logger.error(`Lỗi khi tắt bot: ${error.message}`);
  }

  process.exit(0);
}

// Đăng ký xử lý tín hiệu tắt
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Xử lý lỗi không mong muốn
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled promise rejection: ${error.message}`);
  logger.debug(error.stack);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  logger.debug(error.stack);
  process.exit(1);
});

// Khởi động bot
async function start() {
  logger.info('Dang khoi dong Discord AI Bot...');
  logger.info(`Model: ${config.ai.model}`);
  logger.info(`Reasoning: ${config.ai.reasoningEffort}`);

  // Tải events
  loadEvents();

  // Đăng nhập vào Discord
  try {
    await client.login(config.discord.token);
  } catch (error) {
    logger.error(`Không thể đăng nhập: ${error.message}`);
    logger.error('Vui lòng kiểm tra DISCORD_TOKEN trong file .env');
    process.exit(1);
  }
}

start();
