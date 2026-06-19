// Dịch vụ gọi AI thông qua OpenRouter API
// Sử dụng thư viện OpenAI SDK tương thích với OpenRouter

const OpenAI = require('openai');
const { config } = require('../config');
const logger = require('../utils/logger');

// Khởi tạo client OpenAI trỏ đến OpenRouter
// Dùng native fetch thay vì node-fetch để tránh lỗi "Premature close" trên Node v24+
const openai = new OpenAI({
  apiKey: config.openrouter.apiKey,
  baseURL: config.openrouter.baseUrl,
  fetch: globalThis.fetch,
  maxRetries: 3,
  timeout: 60000,
  defaultHeaders: {
    'HTTP-Referer': config.openrouter.referer,
    'X-Title': config.openrouter.title,
  },
});

/**
 * Gửi yêu cầu đến AI model qua OpenRouter
 * @param {Array<Object>} messages - Mảng tin nhắn theo định dạng OpenAI
 * @param {Array<Object>} [tools] - Danh sách tool definitions (tuỳ chọn)
 * @param {Object} [options] - Tuỳ chọn bổ sung
 * @returns {Promise<Object>} Phản hồi từ AI
 */
async function chat(messages, tools = null, options = {}) {
  try {
    const requestBody = {
      model: options.model || config.ai.model,
      messages,
      temperature: options.temperature ?? config.ai.temperature,
    };

    if (options.maxTokens) {
      requestBody.max_tokens = options.maxTokens;
    } else if (!options.model) {
      // Chỉ dùng maxResponseTokens từ config cho model chính
      requestBody.max_tokens = config.ai.maxResponseTokens;
    }

    // Thêm reasoning effort nếu model hỗ trợ
    // Chế độ 'auto': không gửi trường reasoning, để model tự quyết định
    const reasoningEffort = options.reasoningEffort !== undefined ? options.reasoningEffort : config.ai.reasoningEffort;
    if (reasoningEffort && reasoningEffort !== 'auto') {
      requestBody.reasoning = {
        effort: reasoningEffort,
      };
    }

    // Thêm tools nếu có
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    logger.debug(`Gửi yêu cầu đến model: ${requestBody.model}`);
    logger.debug(`Số tin nhắn: ${messages.length}`);

    const requestOptions = {};
    if (options.timeout !== undefined) requestOptions.timeout = options.timeout;
    if (options.maxRetries !== undefined) requestOptions.maxRetries = options.maxRetries;

    const response = await openai.chat.completions.create(requestBody, requestOptions);

    // Log thông tin sử dụng token
    if (response.usage) {
      logger.debug(
        `Token sử dụng - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}, Tổng: ${response.usage.total_tokens}`
      );
    }

    return response;
  } catch (error) {
    // Xử lý các lỗi cụ thể từ API
    if (error.status === 401) {
      logger.error('API key không hợp lệ. Vui lòng kiểm tra OPENROUTER_API_KEY');
    } else if (error.status === 429) {
      logger.error('Vượt quá giới hạn rate limit. Vui lòng thử lại sau.');
    } else if (error.status === 402) {
      logger.error('Không đủ credit. Vui lòng nạp thêm tại OpenRouter.');
    } else {
      logger.error(`Lỗi gọi AI: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Gửi yêu cầu đơn giản (không có tool) và trả về nội dung text
 * @param {string} prompt - Câu hỏi của người dùng
 * @param {string} [systemPrompt] - System prompt tuỳ chỉnh
 * @returns {Promise<string>} Nội dung phản hồi dạng text
 */
async function simpleChat(prompt, systemPrompt = null) {
  const messages = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  const response = await chat(messages);
  return response.choices[0]?.message?.content || 'Không có phản hồi từ AI.';
}

/**
 * Lấy thông tin model hiện tại
 * @returns {Object} Thông tin model
 */
function getModelInfo() {
  return {
    name: config.ai.model,
    maxContextTokens: config.ai.maxContextTokens,
    maxResponseTokens: config.ai.maxResponseTokens,
    temperature: config.ai.temperature,
    reasoningEffort: config.ai.reasoningEffort,
  };
}

/**
 * Thay đổi model AI đang sử dụng
 * @param {string} modelName - Tên model mới
 */
function setModel(modelName) {
  config.ai.model = modelName;
  logger.info(`Đã chuyển sang model: ${modelName}`);
}

/**
 * Thay đổi mức độ suy luận (reasoning effort)
 * @param {string} effort - Mức độ: 'auto', 'low', 'medium', 'high'
 */
function setReasoningEffort(effort) {
  const valid = ['auto', 'low', 'medium', 'high'];
  if (!valid.includes(effort)) {
    throw new Error(`Mức reasoning không hợp lệ: ${effort}. Chọn: ${valid.join(', ')}`);
  }
  config.ai.reasoningEffort = effort;
  logger.info(`Đã chuyển reasoning effort: ${effort}`);
}

module.exports = { chat, simpleChat, getModelInfo, setModel, setReasoningEffort };
