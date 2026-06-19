// src/utils/formatDiscord.js
// Chuyển đổi nội dung markdown cho phù hợp với Discord
// Discord không render bảng markdown → chuyển sang bold + bullet list

/**
 * Phát hiện và chuyển đổi bảng markdown thành dạng bold + bullet
 * hiển thị đẹp trên Discord cả desktop lẫn mobile.
 *
 * @param {string} text - Nội dung phản hồi từ AI
 * @returns {string} Nội dung đã chuyển đổi
 */
function formatTablesForDiscord(text) {
  if (!text) return text;

  // Regex tìm bảng markdown:
  //   - Dòng header: | xxx | xxx |
  //   - Dòng separator: |---|---| (có thể có : cho alignment)
  //   - Ít nhất 1 dòng dữ liệu
  const tableRegex = /((?:^|\n)\|[^\n]+\|\s*\n\|[\s:\-|]+\|\s*\n(?:\|[^\n]+\|\s*(?:\n|$))+)/g;

  return text.replace(tableRegex, (match) => {
    try {
      const converted = convertTableToBoldList(match.trim());
      if (converted) {
        return '\n' + converted + '\n';
      }
      return match;
    } catch {
      return match;
    }
  });
}

/**
 * Chuyển bảng markdown thành dạng bold + bullet list.
 *
 * Input:
 *   | Tên     | Giá  | Đánh giá |
 *   |---------|------|----------|
 *   | iPhone  | 999$ | 4.5/5    |
 *   | Samsung | 899$ | 4.3/5    |
 *
 * Output:
 *   **iPhone**
 *   • Giá: 999$
 *   • Đánh giá: 4.5/5
 *
 *   **Samsung**
 *   • Giá: 899$
 *   • Đánh giá: 4.3/5
 *
 * @param {string} tableStr - Chuỗi bảng markdown
 * @returns {string|null} Kết quả hoặc null nếu parse lỗi
 */
function convertTableToBoldList(tableStr) {
  const lines = tableStr.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 3) return null;

  // Parse header
  const headers = parseLine(lines[0]);
  if (!headers || headers.length < 2) return null;

  // Dòng 2 phải là separator
  if (!/^\|[\s:\-|]+\|$/.test(lines[1].trim())) return null;

  // Parse data rows
  const dataRows = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    if (cells) dataRows.push(cells);
  }
  if (dataRows.length === 0) return null;

  // Xây dựng output
  const output = [];

  for (const row of dataRows) {
    // Cột đầu tiên là tiêu đề (bold)
    const title = row[0] || '—';
    output.push(`**${title}**`);

    // Các cột còn lại là thuộc tính (bullet với tên header)
    for (let c = 1; c < headers.length; c++) {
      const header = headers[c] || '';
      const value = row[c] || '—';
      output.push(`• ${header}: ${value}`);
    }

    output.push(''); // Dòng trống giữa các mục
  }

  // Bỏ dòng trống cuối cùng
  while (output.length > 0 && output[output.length - 1] === '') {
    output.pop();
  }

  return output.join('\n');
}

/**
 * Parse một dòng bảng markdown thành mảng cell.
 * "| Tên | Giá |" → ["Tên", "Giá"]
 *
 * @param {string} line - Dòng cần parse
 * @returns {string[]|null} Mảng cell hoặc null
 */
function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  const inner = trimmed.slice(1, -1);
  return inner.split('|').map(c => c.trim());
}

module.exports = {
  formatTablesForDiscord,
  convertTableToBoldList,
};
