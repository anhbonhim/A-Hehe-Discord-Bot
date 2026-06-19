// Sự kiện ready - Khi bot đã kết nối thành công với Discord
// Hiển thị credit còn lại trong trạng thái hoạt động

const { ActivityType } = require('discord.js');
const { config } = require('../config');
const logger = require('../utils/logger');
const conversationManager = require('../services/conversationManager');
const { getModelInfo } = require('../services/aiService');

// Chu kỳ cập nhật trạng thái (5 phút)
const UPDATE_INTERVAL_MS = 5 * 60 * 1000;

// Lưu trữ ID kênh hoạt động gần nhất toàn cục trong module
let lastActiveChannelId = null;

/**
 * Lấy thông tin credit còn lại từ OpenRouter API
 * @returns {Promise<{limit: number|null, usage: number, remaining: number|null}>}
 */
async function fetchCredits() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        Authorization: `Bearer ${config.openrouter.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const info = data.data;

    // OpenRouter trả về usage và limit (tính bằng USD)
    // limit = null nghĩa là không giới hạn (pay-as-you-go)
    const usage = info.usage ?? 0;
    const limit = info.limit ?? null;
    const remaining = limit !== null ? limit - usage : null;

    return { limit, usage, remaining };
  } catch (error) {
    logger.debug(`Không thể lấy thông tin credit: ${error.message}`);
    return null;
  }
}

/**
 * Format số tiền USD cho gọn
 * @param {number} amount
 * @returns {string}
 */
function formatUSD(amount) {
  if (amount >= 1) {
    return `$${amount.toFixed(2)}`;
  }
  // Dưới $1 thì hiện nhiều số hơn
  return `$${amount.toFixed(4)}`;
}

/**
 * Cập nhật trạng thái bot với thông tin model, token sử dụng của kênh, và credit
 * @param {import('discord.js').Client} client
 * @param {string} [channelId] - ID kênh Discord để lấy token sử dụng
 */
async function updatePresence(client, channelId = null) {
  if (channelId) {
    lastActiveChannelId = channelId;
  }

  const modelInfo = getModelInfo();
  // Lấy tên model ngắn (bỏ prefix tên hãng)
  const shortModelName = modelInfo.name.split('/').pop();

  let tokenStatus = '';
  if (lastActiveChannelId) {
    const stats = conversationManager.getStats(lastActiveChannelId);
    if (stats && stats.estimatedTokens !== undefined) {
      tokenStatus = ` | ${stats.estimatedTokens.toLocaleString()}/${modelInfo.maxContextTokens.toLocaleString()} ctx`;
    }
  } else {
    tokenStatus = ` | 0/${modelInfo.maxContextTokens.toLocaleString()} ctx`;
  }

  const credits = await fetchCredits();
  let creditStatus = '';

  if (credits && credits.remaining !== null) {
    // Có giới hạn credit
    creditStatus = ` | ${formatUSD(credits.remaining)} rem`;
  } else if (credits && credits.remaining === null) {
    // Pay-as-you-go, hiện usage
    creditStatus = ` | ${formatUSD(credits.usage)} usd`;
  }

  const statusText = `${shortModelName}${tokenStatus}${creditStatus}`;

  try {
    client.user.setPresence({
      status: 'online',
      activities: [
        {
          name: statusText.substring(0, 127),
          type: ActivityType.Custom,
        },
      ],
    });
  } catch (err) {
    logger.debug(`Lỗi setPresence: ${err.message}`);
  }
}

module.exports = {
  name: 'ready',
  once: true,
  updatePresence,

  /**
   * Xử lý khi bot sẵn sàng
   * @param {import('discord.js').Client} client - Discord client
   */
  async execute(client) {
    // Log thông tin bot
    logger.success(`Bot đã đăng nhập thành công: ${client.user.tag}`);
    logger.info(`Đang phục vụ ${client.guilds.cache.size} server(s)`);
    logger.info(`ID: ${client.user.id}`);

    // Cập nhật trạng thái lần đầu
    await updatePresence(client);
    logger.success('Trạng thái bot đã được thiết lập');

    // Cập nhật định kỳ mỗi 5 phút
    const timer = setInterval(() => updatePresence(client), UPDATE_INTERVAL_MS);
    if (timer.unref) timer.unref();
  },
};
