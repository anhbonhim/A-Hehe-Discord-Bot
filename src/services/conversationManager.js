// src/services/conversationManager.js
// Quản lý lịch sử hội thoại cho từng kênh Discord
// Lưu trữ trong bộ nhớ (Map), tự động dọn dẹp kênh không hoạt động

// ============================================================
// HẰNG SỐ CẤU HÌNH
// ============================================================

/** Thời gian không hoạt động tối đa trước khi xóa (2 giờ, tính bằng ms) */
const INACTIVE_TIMEOUT_MS = 2 * 60 * 60 * 1000;

/** Chu kỳ kiểm tra và dọn dẹp kênh không hoạt động (15 phút) */
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

/** Ước lượng số ký tự trên mỗi token (dùng để tính token gần đúng) */
const CHARS_PER_TOKEN = 4;

/**
 * System prompt mặc định bằng tiếng Việt.
 * Mô tả vai trò và khả năng của AI assistant.
 */
const DEFAULT_SYSTEM_PROMPT = `Bạn là một trợ lý AI trò chuyện trên Discord, được thiết kế để tư duy rõ ràng, trung thực, và thực sự hữu ích — không phải để nghe có vẻ thông minh.

# Nguyên tắc cốt lõi

1. Trả lời đúng độ dài cần thiết, không hơn không kém. Câu hỏi đơn giản → trả lời ngắn (1-3 câu). Câu hỏi cần phân tích → trình bày đầy đủ, có cấu trúc, không cắt ngắn để "tỏ ra súc tích" khi việc đó làm mất thông tin quan trọng.
2. Không mở đầu bằng các câu sáo rỗng kiểu "Chắc chắn rồi!", "Tôi rất sẵn lòng giúp bạn...", "Đây là một câu hỏi thú vị". Đi thẳng vào nội dung.
3. Khi không chắc về một thông tin, nói rõ mức độ chắc chắn ("mình không chắc...", "theo hiểu biết của mình thì...") thay vì trình bày như chắc chắn 100%. Sai mà tự tin còn tệ hơn đúng mà khiêm tốn.
4. Khi câu hỏi mơ hồ hoặc có thể hiểu theo nhiều cách, hỏi lại một câu rõ ràng thay vì đoán và trả lời sai hướng — nhưng chỉ hỏi khi thực sự cần, không hỏi vụn vặt.
5. Với câu hỏi có nhiều góc nhìn hợp lý (ý kiến, đánh giá, tranh luận), trình bày các góc nhìn khác nhau trước khi đưa nhận định riêng, và nói rõ đâu là nhận định cá nhân.

# Cách lập luận

- Với vấn đề có nhiều bước hoặc nhiều yếu tố, chia nhỏ và trình bày tuần tự, không nhồi tất cả vào một đoạn dài.
- Khi so sánh (A vs B, phương án 1 vs phương án 2), nêu rõ tiêu chí so sánh trước, rồi mới đối chiếu — tránh so sánh tản mạn không có khung rõ ràng.
- Khi đưa ra kết luận hoặc khuyến nghị, nói rõ kết luận đó dựa trên giả định gì, và giả định đó có thể sai ở đâu.
- Tránh liệt kê ưu/nhược điểm một cách máy móc kiểu danh sách dài cho mọi câu hỏi — chỉ làm vậy khi việc so sánh thực sự cần cấu trúc đó.

# Định dạng

- Dùng markdown khi nó giúp dễ đọc hơn (code block cho code, bold cho từ khóa quan trọng), không dùng để trang trí.
- Hạn chế bullet point trong văn xuôi thường — chỉ dùng khi liệt kê các mục thực sự độc lập, rời rạc (ví dụ: danh sách bước, danh sách lựa chọn).
- Với đoạn văn giải thích/phân tích, viết liền mạch như đang nói chuyện với người hiểu chuyện, không chẻ thành các bullet rời rạc.
- Không dùng emoji trừ khi người dùng dùng trước hoặc yêu cầu.
- TUYỆT ĐỐI KHÔNG dùng bảng markdown (syntax | và ---) vì Discord không render được, sẽ hiển thị rất xấu. CŨNG KHÔNG dùng code block canh cột bằng dấu cách vì font trên mobile không đều. Khi cần so sánh hoặc liệt kê nhiều mục có thuộc tính, hãy trình bày như sau:

  **React**
  • Ngôn ngữ: JavaScript/TypeScript
  • Kiến trúc: Component-based, Virtual DOM
  • Học: Trung bình

  **Vue**
  • Ngôn ngữ: JavaScript/TypeScript
  • Kiến trúc: Component-based, Reactive
  • Học: Dễ

  Tức là dùng bold cho tên mỗi mục, bullet cho thuộc tính. Đây là cách duy nhất hiển thị đẹp trên Discord cả desktop lẫn mobile.

# Ngôn ngữ

- Trả lời bằng ngôn ngữ người dùng đang dùng. Nếu họ viết tiếng Việt, trả lời tiếng Việt tự nhiên (không phải bản dịch máy móc từ tiếng Anh) — dùng từ ngữ, cách diễn đạt người Việt thực sự nói.
- Thuật ngữ kỹ thuật phổ biến (API, token, framework...) giữ nguyên tiếng Anh nếu đó là cách người dùng tiếng Việt thường gọi.

# Khi không biết / không chắc

Nếu một câu hỏi nằm ngoài kiến thức của bạn hoặc cần thông tin mới (tin tức, sự kiện gần đây, dữ liệu thay đổi theo thời gian), nói rõ điều đó và dùng công cụ tìm kiếm web khi có sẵn, thay vì đoán hoặc bịa thông tin.`;

// ============================================================
// LƯU TRỮ HỘI THOẠI
// ============================================================

/** Lấy đường dẫn file lưu trữ của kênh */
function getFilePath(channelId) {
  return path.join(DATA_DIR, `${channelId}.json`);
}

/** Lưu lịch sử của kênh xuống file JSON */
function saveToFile(channelId) {
  const conversation = conversations.get(channelId);
  if (!conversation) return;
  try {
    fs.writeFileSync(
      getFilePath(channelId),
      JSON.stringify(
        {
          messages: conversation.messages,
          systemPrompt: conversation.systemPrompt,
        },
        null,
        2
      ),
      'utf8'
    );
  } catch (err) {
    console.error(`[ConversationManager] Lỗi ghi file lịch sử cho kênh ${channelId}:`, err);
  }
}

/**
 * Map lưu trữ hội thoại tạm thời trên RAM để truy cập nhanh.
 * @type {Map<string, Object>}
 */
const conversations = new Map();

// ============================================================
// HÀM QUẢN LÝ HỘI THOẠI
// ============================================================

/**
 * Khởi tạo một cuộc hội thoại trống mới trong bộ nhớ
 */
function initializeNewConversation(channelId, systemPrompt = DEFAULT_SYSTEM_PROMPT) {
  conversations.set(channelId, {
    messages: [{ role: 'system', content: systemPrompt }],
    lastActivity: new Date(),
    systemPrompt: systemPrompt,
  });
}

/**
 * Lấy hoặc tạo mới entry hội thoại cho một kênh.
 * Ưu tiên khôi phục từ file JSON nếu có, giúp giữ lịch sử lâu dài.
 * @param {string} channelId - ID kênh Discord
 * @returns {Object} Entry hội thoại
 */
function getOrCreateConversation(channelId) {
  if (!conversations.has(channelId)) {
    const filePath = getFilePath(channelId);
    if (fs.existsSync(filePath)) {
      try {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        conversations.set(channelId, {
          messages: fileData.messages || [{ role: 'system', content: fileData.systemPrompt || DEFAULT_SYSTEM_PROMPT }],
          lastActivity: new Date(),
          systemPrompt: fileData.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        });
        console.info(`[ConversationManager] Đã khôi phục lịch sử từ file cho kênh: ${channelId}`);
      } catch (err) {
        console.error(`[ConversationManager] Lỗi đọc file lịch sử kênh ${channelId}:`, err);
        initializeNewConversation(channelId);
      }
    } else {
      initializeNewConversation(channelId);
    }
  }
  return conversations.get(channelId);
}

/**
 * Thêm một tin nhắn vào lịch sử hội thoại của kênh.
 * Tự động cập nhật thời gian hoạt động cuối cùng và lưu xuống file.
 *
 * @param {string} channelId - ID kênh Discord
 * @param {string} role - Vai trò: 'user', 'assistant', 'system', 'tool'
 * @param {string|Array} content - Nội dung tin nhắn (chuỗi hoặc mảng cho vision)
 */
function addMessage(channelId, role, content) {
  const conversation = getOrCreateConversation(channelId);
  conversation.messages.push({ role, content });
  conversation.lastActivity = new Date();
  saveToFile(channelId);
}

/**
 * Lấy toàn bộ lịch sử tin nhắn của một kênh.
 * @param {string} channelId - ID kênh Discord
 * @returns {Array} Mảng tin nhắn (bao gồm system prompt)
 */
function getHistory(channelId) {
  const conversation = getOrCreateConversation(channelId);
  // Cập nhật thời gian hoạt động khi truy cập
  conversation.lastActivity = new Date();
  return conversation.messages;
}

/**
 * Xóa toàn bộ lịch sử hội thoại của một kênh.
 * Tạo lại với system prompt mặc định.
 * @param {string} channelId - ID kênh Discord
 * @returns {boolean} true nếu có lịch sử đã bị xóa
 */
function clearHistory(channelId) {
  const hadHistory = conversations.has(channelId) &&
    conversations.get(channelId).messages.length > 1;
  const conversation = getOrCreateConversation(channelId);
  // Giữ lại system prompt, xóa hết tin nhắn khác
  conversation.messages = [
    { role: 'system', content: conversation.systemPrompt },
  ];
  conversation.lastActivity = new Date();
  saveToFile(channelId);
  return hadHistory;
}

/**
 * Cắt bớt lịch sử hội thoại khi vượt quá giới hạn token.
 * Sử dụng ước lượng thô: 1 token ≈ 4 ký tự.
 * Giữ nguyên system prompt, xóa các tin nhắn cũ nhất.
 *
 * @param {string} channelId - ID kênh Discord
 * @param {number} maxTokens - Giới hạn token tối đa (mặc định: 120000 để dành chỗ cho response)
 */
function trimHistory(channelId, maxTokens = 120000) {
  const conversation = getOrCreateConversation(channelId);
  const messages = conversation.messages;

  // Tính tổng số token ước lượng
  let totalChars = 0;
  for (const msg of messages) {
    // Xử lý content dạng chuỗi hoặc mảng (vision)
    if (typeof msg.content === 'string') {
      totalChars += msg.content.length;
    } else if (Array.isArray(msg.content)) {
      // Với content dạng mảng, chỉ đếm phần text
      for (const part of msg.content) {
        if (part.type === 'text' && part.text) {
          totalChars += part.text.length;
        }
      }
    }
  }

  let estimatedTokens = Math.ceil(totalChars / CHARS_PER_TOKEN);

  // Nếu chưa vượt giới hạn, không cần cắt
  if (estimatedTokens <= maxTokens) {
    return;
  }

  // Tìm system prompt (luôn là tin nhắn đầu tiên)
  const systemMessage = messages[0]?.role === 'system' ? messages[0] : null;

  // Xóa tin nhắn cũ nhất (bỏ qua system prompt) cho đến khi dưới giới hạn
  let startIndex = systemMessage ? 1 : 0;

  while (estimatedTokens > maxTokens && startIndex < messages.length) {
    const removed = messages[startIndex];
    let removedChars = 0;

    if (typeof removed.content === 'string') {
      removedChars = removed.content.length;
    } else if (Array.isArray(removed.content)) {
      for (const part of removed.content) {
        if (part.type === 'text' && part.text) {
          removedChars += part.text.length;
        }
      }
    }

    // Xóa tin nhắn khỏi mảng
    messages.splice(startIndex, 1);
    estimatedTokens -= Math.ceil(removedChars / CHARS_PER_TOKEN);
  }

  console.info(
    `[ConversationManager] Đã cắt lịch sử kênh ${channelId}, ` +
    `còn ${messages.length} tin nhắn (~${estimatedTokens} tokens)`
  );
  saveToFile(channelId);
}

/**
 * Đặt system prompt tùy chỉnh cho một kênh.
 * @param {string} channelId - ID kênh Discord
 * @param {string} prompt - System prompt mới
 */
function setSystemPrompt(channelId, prompt) {
  const conversation = getOrCreateConversation(channelId);
  conversation.systemPrompt = prompt;

  // Cập nhật system message trong lịch sử
  if (conversation.messages[0]?.role === 'system') {
    conversation.messages[0].content = prompt;
  } else {
    // Thêm system message vào đầu nếu chưa có
    conversation.messages.unshift({ role: 'system', content: prompt });
  }
  saveToFile(channelId);
}

/**
 * Lấy thông tin thống kê về hội thoại của một kênh.
 * @param {string} channelId - ID kênh Discord
 * @returns {Object} { messageCount, estimatedTokens, lastActivity }
 */
function getStats(channelId) {
  if (!conversations.has(channelId)) {
    return { messageCount: 0, estimatedTokens: 0, lastActivity: null };
  }

  const conversation = conversations.get(channelId);
  let totalChars = 0;

  for (const msg of conversation.messages) {
    if (typeof msg.content === 'string') {
      totalChars += msg.content.length;
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'text' && part.text) {
          totalChars += part.text.length;
        }
      }
    }
  }

  return {
    messageCount: conversation.messages.length,
    estimatedTokens: Math.ceil(totalChars / CHARS_PER_TOKEN),
    lastActivity: conversation.lastActivity,
  };
}

// ============================================================
// TỰ ĐỘNG DỌN DẸP KÊNH KHÔNG HOẠT ĐỘNG
// ============================================================

/**
 * Dọn dẹp các kênh không hoạt động quá 2 giờ.
 * Chạy định kỳ theo CLEANUP_INTERVAL_MS.
 */
function cleanupInactiveConversations() {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [channelId, conversation] of conversations) {
    const inactiveDuration = now - conversation.lastActivity.getTime();

    if (inactiveDuration > INACTIVE_TIMEOUT_MS) {
      conversations.delete(channelId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.info(
      `[ConversationManager] Đã dọn dẹp ${cleanedCount} kênh không hoạt động. ` +
      `Còn lại: ${conversations.size} kênh.`
    );
  }
}

// Khởi động bộ dọn dẹp tự động
const cleanupTimer = setInterval(cleanupInactiveConversations, CLEANUP_INTERVAL_MS);

// Đảm bảo timer không ngăn process thoát
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

console.info('[ConversationManager] Khởi tạo thành công. Dọn dẹp tự động mỗi 15 phút.');

/**
 * Xây dựng mảng messages cho AI từ lịch sử hội thoại + tin nhắn mới.
 * @param {string} channelId - ID kênh Discord
 * @param {string} userContent - Nội dung tin nhắn mới từ user
 * @returns {Array} Mảng messages theo format OpenAI
 */
function buildMessages(channelId, userContent) {
  const conversation = getOrCreateConversation(channelId);
  // Trim trước khi build để đảm bảo không vượt context
  trimHistory(channelId);
  // Clone messages hiện tại và thêm tin nhắn mới
  const messages = [...conversation.messages];
  messages.push({ role: 'user', content: userContent });
  return messages;
}

/**
 * Lưu cặp tin nhắn user-assistant vào lịch sử.
 * @param {string} channelId - ID kênh Discord
 * @param {string} userContent - Nội dung tin nhắn user
 * @param {string} assistantContent - Nội dung phản hồi AI
 */
function saveMessages(channelId, userContent, assistantContent) {
  addMessage(channelId, 'user', userContent);
  addMessage(channelId, 'assistant', assistantContent);
}

/**
 * Tắt conversation manager — dọn dẹp timer.
 */
function shutdown() {
  clearInterval(cleanupTimer);
  conversations.clear();
  console.info('[ConversationManager] Đã tắt và dọn dẹp bộ nhớ.');
}

/**
 * Lấy thống kê tổng quan (không cần channelId).
 * @param {string} [channelId] - ID kênh (tuỳ chọn)
 * @returns {Object} Thống kê
 */
function getGlobalStats(channelId) {
  if (channelId) {
    return getStats(channelId);
  }
  // Thống kê toàn cục
  let totalMessages = 0;
  for (const [, conv] of conversations) {
    totalMessages += conv.messages.length;
  }
  return {
    activeConversations: conversations.size,
    totalMessages,
  };
}

// ============================================================
// XUẤT MODULE
// ============================================================

/**
 * Đối tượng quản lý hội thoại — xuất tất cả các phương thức.
 */
module.exports = {
  addMessage,
  getHistory,
  clearHistory,
  trimHistory,
  setSystemPrompt,
  getStats: getGlobalStats,
  cleanupInactiveConversations,
  buildMessages,
  saveMessages,
  shutdown,

  /** Hằng số để module khác tham chiếu */
  DEFAULT_SYSTEM_PROMPT,
  INACTIVE_TIMEOUT_MS,
};

