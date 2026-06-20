// Quản lý tool/function calling cho AI
// Định nghĩa các tool và xử lý kết quả trả về

const { search, formatSearchResults } = require('./webSearch');
const logger = require('../utils/logger');

const ROUTER_SYSTEM_PROMPT = `Bạn là bộ phân loại ý định (intent classifier) cực nhanh cho một Discord bot tiếng Việt. Nhiệm vụ DUY NHẤT: xác định tin nhắn có phải LỆNH HỆ THỐNG rõ ràng không, nếu có thì gọi đúng tool.

QUY TẮC QUAN TRỌNG NHẤT:
- Chỉ gọi tool khi người dùng đang RA LỆNH cho bot làm gì đó NGAY BÂY GIỜ.
- KHÔNG gọi tool nếu người dùng: kể chuyện, tường thuật việc đã xảy ra, nói về người/vật khác, hỏi thông thường, than phiền, hoặc nhắc từ khóa lệnh trong ngữ cảnh không liên quan.
- Nếu độ chắc chắn dưới 80%, KHÔNG gọi tool nào — để hệ thống fallback xử lý.
- Chính tả sai, viết tắt, ngụ ý gián tiếp NHƯNG rõ ràng đang yêu cầu bot thì vẫn phải nhận diện đúng.

DANH SÁCH TOOL:
1. cmd_clear_history — xoá lịch sử trò chuyện kênh hiện tại
2. cmd_model_info — xem thông tin model AI đang chạy
3. cmd_change_reasoning — đổi mức suy luận (auto/low/medium/high)
4. cmd_bot_help — xem tài liệu hướng dẫn sử dụng bot, các tính năng và danh sách lệnh
5. cmd_anime_image — hiển thị ảnh/gif anime ngẫu nhiên hoặc theo một từ khóa bất kỳ (waifu, ôm, luffy, rem, maid, fox girl, sleeping anime girl, ahegao, ...).
  - Chú ý: Trích xuất từ khóa anime gần nhất với yêu cầu người dùng, không tự mở rộng ý nghĩa, không thêm mô tả mới, không dịch từ khóa. Giữ nguyên từ khóa người dùng cung cấp nếu có thể.
  - AI phải tự quyết định xem từ khóa có chứa nội dung nhạy cảm/NSFW không (ví dụ: hentai, ecchi, ahegao, succubus, r18...) để set cờ \`isNSFW=true\`.

VÍ DỤ ĐÚNG (PHẢI gọi tool):
- "xoá lịch sử đi" → cmd_clear_history
- "xoá giùm tui lịch sử hôm nay nha bot" → cmd_clear_history
- "clr hist" → cmd_clear_history
- "quên hết đi bot ơi" → cmd_clear_history
- "mày đang chạy model gì vậy" → cmd_model_info
- "xem mô hình" → cmd_model_info
- "đổi reasoning lên cao đi" → cmd_change_reasoning(level=high)
- "để chế độ suy nghĩ thấp thôi" → cmd_change_reasoning(level=low)
- "hướng dẫn sử dụng" → cmd_bot_help
- "bot này dùng thế nào" → cmd_bot_help
- "help" → cmd_bot_help
- "các lệnh của bot" → cmd_bot_help
- "cứu tôi" → cmd_bot_help
- "gửi ảnh waifu đi" → cmd_anime_image(category="waifu", isNSFW=false)
- "danh sách anime" → cmd_anime_image(category="list", isNSFW=false)
- "gửi ảnh luffy" → cmd_anime_image(category="luffy", isNSFW=false)
- "ảnh rem" → cmd_anime_image(category="rem", isNSFW=false)
- "gửi ảnh fox girl" → cmd_anime_image(category="fox girl", isNSFW=false)
- "ảnh hentai rem" → cmd_anime_image(category="hentai rem", isNSFW=true)
- "succubus" → cmd_anime_image(category="succubus", isNSFW=true)
- "xwaifu" → cmd_anime_image(category="xwaifu", isNSFW=true)
- "xneko" → cmd_anime_image(category="xneko", isNSFW=true)
- "xgif" → cmd_anime_image(category="xgif", isNSFW=true)

VÍ DỤ SAI (KHÔNG gọi tool nào):
- "tôi mới xoá lịch sử chat với con gà" → câu kể chuyện về người/vật khác, không phải lệnh
- "lịch sử chat của tao toàn tin nhắn vô bổ" → đang than phiền, không ra lệnh
- "hôm qua tao đổi reasoning xong bị lỗi" → kể chuyện quá khứ
- "model gì mà ngu vậy" → đang chê, không hỏi thông tin
- "xoá giùm tao cái tin nhắn kia đi" → xoá 1 tin nhắn cụ thể, không phải xoá lịch sử
- "tôi đâu có hỏi help đâu" → câu kể chuyện/đính chính, không yêu cầu xem hướng dẫn sử dụng
- "bảo tôi cần trợ giúp không" → câu hỏi vẩn vơ, không yêu cầu xem hướng dẫn
- "tao ghét xem anime" → đang bày tỏ quan điểm, không yêu cầu ảnh anime
- "lắm tay" → từ gõ sai/vô nghĩa, không chắc chắn ý định nên không gọi tool

Nếu không khớp rõ ràng với case nào ở trên, KHÔNG gọi tool nào cả.`;

/**
 * Lấy định nghĩa tool và system prompt cho model Router (Stage 1)
 * @returns {Object} { systemPrompt, tools }
 */
function getRouterToolDefinitions() {
  return {
    systemPrompt: ROUTER_SYSTEM_PROMPT,
    tools: [
      {
        type: 'function',
        function: {
          name: 'cmd_clear_history',
          description: 'Lệnh xóa lịch sử trò chuyện. Người dùng yêu cầu dọn dẹp, xóa sạch, reset lịch sử chat.',
          parameters: { type: 'object', properties: {}, required: [] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'cmd_model_info',
          description: 'Lệnh xem thông tin model AI đang sử dụng. Người dùng hỏi model gì, xem thông số model.',
          parameters: { type: 'object', properties: {}, required: [] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'cmd_change_reasoning',
          description: 'Lệnh thay đổi mức độ suy luận (reasoning effort). Người dùng yêu cầu đổi reasoning sang tự động (auto), thấp (low), trung bình (medium) hoặc cao (high).',
          parameters: {
            type: 'object',
            properties: {
              level: {
                type: 'string',
                enum: ['auto', 'low', 'medium', 'high'],
                description: 'Mức độ reasoning muốn đổi sang.',
              },
            },
            required: ['level'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'cmd_bot_help',
          description: 'Lệnh xem tài liệu hướng dẫn sử dụng, trợ giúp, các lệnh của bot, cách dùng bot.',
          parameters: { type: 'object', properties: {}, required: [] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'cmd_anime_image',
          description: 'Lệnh hiển thị ảnh/gif anime ngẫu nhiên hoặc theo từ khóa động do người dùng yêu cầu (luffy, waifu, rem, fox girl, ahegao...).',
          parameters: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Từ khóa hoặc thể loại ảnh muốn lấy (ví dụ: "waifu", "luffy", "rem", "hentai", "list"...). Giữ nguyên từ khóa người dùng nhập.',
              },
              isNSFW: {
                type: 'boolean',
                description: 'Xác định xem từ khóa/yêu cầu có chứa nội dung người lớn, nhạy cảm (NSFW) hay không (ví dụ: hentai, ecchi, ahegao, r18... thì true, còn lại false).',
              }
            },
            required: ['category', 'isNSFW']
          },
        },
      },
    ]
  };
}

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

module.exports = { getToolDefinitions, getRouterToolDefinitions, executeTool };
