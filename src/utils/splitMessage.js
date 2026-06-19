// src/utils/splitMessage.js
// Chia tin nhắn dài thành nhiều phần để phù hợp giới hạn 2000 ký tự của Discord
// Ưu tiên cắt tại ranh giới tự nhiên, bảo toàn code block

// ============================================================
// HẰNG SỐ
// ============================================================

/** Giới hạn ký tự mặc định (dành 100 ký tự cho code block fix + an toàn) */
const DEFAULT_MAX_LENGTH = 1900;

/** Regex tìm tất cả code block (``` ... ```) */
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;

// ============================================================
// HÀM CHÍNH: CHIA TIN NHẮN
// ============================================================

/**
 * Chia tin nhắn dài thành các đoạn nhỏ hơn giới hạn của Discord.
 *
 * Thứ tự ưu tiên điểm cắt:
 *   1. Ranh giới đoạn văn (\n\n)
 *   2. Ranh giới dòng (\n)
 *   3. Ranh giới câu (. )
 *   4. Cắt cứng tại maxLength
 *
 * Đặc biệt: Bảo toàn code block — không cắt giữa ``` ... ```
 *
 * @param {string} text - Văn bản cần chia
 * @param {number} [maxLength=1950] - Độ dài tối đa mỗi đoạn
 * @returns {Array<string>} Mảng các đoạn văn bản
 *
 * @example
 *   const chunks = splitMessage(longText);
 *   for (const chunk of chunks) {
 *     await channel.send(chunk);
 *   }
 */
function splitMessage(text, maxLength = DEFAULT_MAX_LENGTH) {
  // Trường hợp đặc biệt: text trống hoặc đủ ngắn
  if (!text) return [];
  if (text.length <= maxLength) return [text];

  // Tìm tất cả vị trí code block để tránh cắt bên trong
  const codeBlocks = findCodeBlockRanges(text);

  const chunks = [];
  let remaining = text;
  let offset = 0; // Vị trí hiện tại trong text gốc (để tra cứu code block)

  while (remaining.length > 0) {
    // Nếu phần còn lại vừa đủ, thêm và kết thúc
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Tìm điểm cắt tốt nhất
    const cutPoint = findBestCutPoint(remaining, maxLength, codeBlocks, offset);

    // Cắt và thêm vào mảng kết quả
    const chunk = remaining.substring(0, cutPoint).trimEnd();
    if (chunk.length > 0) {
      // Kiểm tra và sửa code block bị mở mà chưa đóng
      chunks.push(fixUnclosedCodeBlock(chunk));
    }

    // Cập nhật phần còn lại
    remaining = remaining.substring(cutPoint).trimStart();
    offset += cutPoint;

    // Nếu phần còn lại bắt đầu giữa code block, thêm ``` mở lại
    if (isInsideCodeBlock(offset, codeBlocks)) {
      // Tìm ngôn ngữ của code block hiện tại
      const lang = getCodeBlockLanguage(offset, codeBlocks, text);
      remaining = '```' + lang + '\n' + remaining;
    }
  }

  return chunks;
}

// ============================================================
// HÀM TÌM ĐIỂM CẮT TỐT NHẤT
// ============================================================

/**
 * Tìm điểm cắt tốt nhất trong phạm vi maxLength.
 * Tránh cắt bên trong code block.
 *
 * @param {string} text - Đoạn text cần tìm điểm cắt
 * @param {number} maxLength - Độ dài tối đa
 * @param {Array} codeBlocks - Mảng vị trí code block trong text gốc
 * @param {number} offset - Vị trí hiện tại trong text gốc
 * @returns {number} Vị trí cắt tốt nhất
 */
function findBestCutPoint(text, maxLength, codeBlocks, offset) {
  // Ngưỡng tối thiểu — không cắt quá ngắn (ít nhất 30% maxLength)
  const minCutPoint = Math.floor(maxLength * 0.3);

  // Kiểm tra xem vị trí cắt có nằm trong code block không
  const cutInCodeBlock = isInsideCodeBlock(offset + maxLength, codeBlocks);

  if (cutInCodeBlock) {
    // Nếu cắt giữa code block, tìm điểm kết thúc code block gần nhất
    // trước vị trí maxLength
    const safePoint = findSafePointBeforeCodeBlock(offset + maxLength, codeBlocks, offset);
    if (safePoint !== null && safePoint - offset > minCutPoint) {
      return safePoint - offset;
    }

    // Hoặc tìm điểm kết thúc code block sau maxLength
    const endOfBlock = findCodeBlockEnd(offset + maxLength, codeBlocks);
    if (endOfBlock !== null) {
      const adjustedEnd = endOfBlock - offset;
      // Nếu code block kết thúc không quá xa (thêm 500 ký tự), cho phép vượt giới hạn
      if (adjustedEnd <= maxLength + 500) {
        return adjustedEnd;
      }
    }
  }

  // Ưu tiên 1: Cắt tại ranh giới đoạn văn (\n\n)
  const paragraphBreak = text.lastIndexOf('\n\n', maxLength);
  if (paragraphBreak > minCutPoint) {
    return paragraphBreak + 2; // Bao gồm cả \n\n
  }

  // Ưu tiên 2: Cắt tại ranh giới dòng (\n)
  const lineBreak = text.lastIndexOf('\n', maxLength);
  if (lineBreak > minCutPoint) {
    return lineBreak + 1;
  }

  // Ưu tiên 3: Cắt tại ranh giới câu (. hoặc .  hoặc .\n)
  const sentenceBreak = text.lastIndexOf('. ', maxLength);
  if (sentenceBreak > minCutPoint) {
    return sentenceBreak + 2;
  }

  // Ưu tiên 4: Cắt cứng tại maxLength
  return maxLength;
}

// ============================================================
// HÀM XỬ LÝ CODE BLOCK
// ============================================================

/**
 * Tìm tất cả vị trí code block trong text.
 * @param {string} text - Toàn bộ text gốc
 * @returns {Array<Object>} Mảng { start, end } cho mỗi code block
 */
function findCodeBlockRanges(text) {
  const ranges = [];
  let match;

  // Reset regex lastIndex
  CODE_BLOCK_REGEX.lastIndex = 0;

  while ((match = CODE_BLOCK_REGEX.exec(text)) !== null) {
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0],
    });
  }

  return ranges;
}

/**
 * Kiểm tra xem một vị trí có nằm bên trong code block không.
 * @param {number} position - Vị trí cần kiểm tra (trong text gốc)
 * @param {Array} codeBlocks - Mảng vị trí code block
 * @returns {boolean}
 */
function isInsideCodeBlock(position, codeBlocks) {
  return codeBlocks.some(
    (block) => position > block.start && position < block.end
  );
}

/**
 * Tìm điểm an toàn (bên ngoài code block) trước vị trí cho trước.
 * @param {number} position - Vị trí tham chiếu
 * @param {Array} codeBlocks - Mảng vị trí code block
 * @param {number} minPosition - Vị trí tối thiểu
 * @returns {number|null}
 */
function findSafePointBeforeCodeBlock(position, codeBlocks, minPosition) {
  for (const block of codeBlocks) {
    if (position > block.start && position < block.end) {
      // Vị trí nằm trong block này — trả về điểm bắt đầu block
      if (block.start > minPosition) {
        return block.start;
      }
    }
  }
  return null;
}

/**
 * Tìm điểm kết thúc code block chứa vị trí cho trước.
 * @param {number} position - Vị trí bên trong code block
 * @param {Array} codeBlocks - Mảng vị trí code block
 * @returns {number|null}
 */
function findCodeBlockEnd(position, codeBlocks) {
  for (const block of codeBlocks) {
    if (position >= block.start && position < block.end) {
      return block.end;
    }
  }
  return null;
}

/**
 * Lấy ngôn ngữ (language tag) của code block chứa vị trí.
 * @param {number} position - Vị trí bên trong code block
 * @param {Array} codeBlocks - Mảng vị trí code block
 * @param {string} text - Text gốc
 * @returns {string} Tên ngôn ngữ hoặc chuỗi rỗng
 */
function getCodeBlockLanguage(position, codeBlocks, text) {
  for (const block of codeBlocks) {
    if (position >= block.start && position < block.end) {
      // Trích xuất dòng đầu tiên của code block (sau ```)
      const blockStart = block.content.substring(3); // Bỏ ```
      const firstNewline = blockStart.indexOf('\n');
      if (firstNewline > 0) {
        return blockStart.substring(0, firstNewline).trim();
      }
    }
  }
  return '';
}

/**
 * Kiểm tra và sửa code block bị mở mà chưa đóng.
 * Đếm số lượng ``` — nếu lẻ, thêm ``` đóng vào cuối.
 *
 * @param {string} text - Đoạn text cần kiểm tra
 * @returns {string} Text đã sửa (nếu cần)
 */
function fixUnclosedCodeBlock(text) {
  // Đếm số lần xuất hiện của ```
  const matches = text.match(/```/g);
  const count = matches ? matches.length : 0;

  // Nếu số lượng ``` lẻ, nghĩa là có code block chưa đóng
  if (count % 2 !== 0) {
    return text + '\n```';
  }

  return text;
}

// ============================================================
// XUẤT MODULE
// ============================================================

module.exports = splitMessage;
