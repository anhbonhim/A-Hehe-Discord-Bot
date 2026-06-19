// Quản lý tool/function calling cho AI
// Định nghĩa các tool và xử lý kết quả trả về

const { search, formatSearchResults } = require('./webSearch');
const logger = require('../utils/logger');

/**
 * Lấy danh sách định nghĩa tool cho OpenAI function calling
 * @returns {Array<Object>} Mảng tool definitions
 */
function getToolDefinitions() {
  return [
    {
      type: 'function',
      function: {
        name: 'web_search',
        description:
          'Tìm kiếm thông tin trên web. Sử dụng khi cần thông tin mới nhất, xác minh sự kiện, hoặc tra cứu dữ liệu.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Từ khoá tìm kiếm bằng tiếng Anh hoặc tiếng Việt',
            },
            max_results: {
              type: 'number',
              description: 'Số kết quả tối đa (mặc định: 5)',
            },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_current_time',
        description: 'Lấy ngày giờ hiện tại theo múi giờ Việt Nam (UTC+7)',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'calculate',
        description: 'Thực hiện phép tính toán học. Hỗ trợ các biểu thức toán học cơ bản.',
        parameters: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: 'Biểu thức toán học cần tính (ví dụ: "2 + 3 * 4", "Math.sqrt(144)")',
            },
          },
          required: ['expression'],
        },
      },
    },
  ];
}

/**
 * Thực thi một tool call từ AI
 * @param {Object} toolCall - Tool call object từ phản hồi AI
 * @returns {Promise<Object>} Kết quả thực thi { toolCallId, result, wasSearch }
 */
async function executeTool(toolCall) {
  const { id, function: func } = toolCall;
  const functionName = func.name;
  let args = {};

  // Parse arguments
  try {
    args = JSON.parse(func.arguments || '{}');
  } catch (error) {
    logger.error(`Lỗi parse arguments cho tool ${functionName}: ${error.message}`);
    return {
      toolCallId: id,
      result: `Lỗi: Không thể parse arguments - ${error.message}`,
      wasSearch: false,
    };
  }

  logger.info(`Đang thực thi tool: ${functionName}`, args);

  try {
    switch (functionName) {
      case 'web_search': {
        const searchResult = await search(args.query, args.max_results || 5);
        const formattedResult = formatSearchResults(searchResult);
        return {
          toolCallId: id,
          result: formattedResult,
          wasSearch: true,
          searchData: searchResult,
        };
      }

      case 'get_current_time': {
        const now = new Date();
        const vietnamTime = now.toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        return {
          toolCallId: id,
          result: `Ngày giờ hiện tại (Việt Nam, UTC+7): ${vietnamTime}`,
          wasSearch: false,
        };
      }

      case 'calculate': {
        // Chỉ cho phép các biểu thức toán học an toàn
        const expression = args.expression;
        const sanitized = expression.replace(/[^0-9+\-*/().%\s,Math.sqrtpowabsceilfloorround log sincostan PIE]/g, '');

        if (sanitized !== expression) {
          return {
            toolCallId: id,
            result: 'Lỗi: Biểu thức chứa ký tự không hợp lệ',
            wasSearch: false,
          };
        }

        // Thực thi trong phạm vi an toàn
        const result = new Function(`"use strict"; return (${expression})`)();
        return {
          toolCallId: id,
          result: `Kết quả: ${expression} = ${result}`,
          wasSearch: false,
        };
      }

      default:
        logger.warn(`Tool không xác định: ${functionName}`);
        return {
          toolCallId: id,
          result: `Lỗi: Tool "${functionName}" không được hỗ trợ`,
          wasSearch: false,
        };
    }
  } catch (error) {
    logger.error(`Lỗi thực thi tool ${functionName}: ${error.message}`);
    return {
      toolCallId: id,
      result: `Lỗi khi thực thi ${functionName}: ${error.message}`,
      wasSearch: false,
    };
  }
}

module.exports = { getToolDefinitions, executeTool };
