// src/services/webSearch.js
// Dịch vụ tìm kiếm web để xác minh thông tin và lấy dữ liệu thời gian thực
// Ưu tiên: Tavily API (nếu có key) → Fallback: DuckDuckGo HTML scraping

const cheerio = require('cheerio');

// ============================================================
// CẤU HÌNH
// ============================================================

/** API key cho Tavily (tùy chọn, lấy từ biến môi trường) */
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || null;

/** URL endpoint của Tavily API */
const TAVILY_API_URL = 'https://api.tavily.com/search';

/** URL endpoint DuckDuckGo HTML (không cần API key) */
const DUCKDUCKGO_HTML_URL = 'https://html.duckduckgo.com/html/';

/** Số kết quả tối đa trả về */
const MAX_RESULTS = 5;

/** Timeout cho mỗi request tìm kiếm (ms) */
const SEARCH_TIMEOUT_MS = 15000;

// ============================================================
// TÌM KIẾM QUA TAVILY API (ƯU TIÊN)
// ============================================================

/**
 * Tìm kiếm web qua Tavily API — dịch vụ chất lượng cao.
 * Yêu cầu TAVILY_API_KEY trong biến môi trường.
 *
 * @param {string} query - Truy vấn tìm kiếm
 * @returns {Promise<Object>} { answer: string|null, results: Array<{ title, url, snippet }> }
 */
async function searchWithTavily(query) {
  console.info(`[WebSearch] Tìm kiếm qua Tavily: "${query}"`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        include_answer: true,
        max_results: MAX_RESULTS,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Tavily API trả về status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Chuyển đổi kết quả về format chuẩn
    const results = (data.results || []).map((r) => ({
      title: r.title || 'Không có tiêu đề',
      url: r.url || '',
      snippet: r.content || r.snippet || 'Không có mô tả',
    }));

    return {
      answer: data.answer || null,
      results: results.slice(0, MAX_RESULTS),
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// TÌM KIẾM QUA DUCKDUCKGO HTML (FALLBACK)
// ============================================================

/**
 * Tìm kiếm web qua DuckDuckGo HTML — phương án dự phòng.
 * Không cần API key, scrape kết quả từ trang HTML.
 *
 * @param {string} query - Truy vấn tìm kiếm
 * @returns {Promise<Object>} { answer: null, results: Array<{ title, url, snippet }> }
 */
async function searchWithDuckDuckGo(query) {
  console.info(`[WebSearch] Tìm kiếm qua DuckDuckGo: "${query}"`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    // Gửi request dạng form POST đến DuckDuckGo HTML
    const params = new URLSearchParams({ q: query });
    const response = await fetch(`${DUCKDUCKGO_HTML_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        // Giả lập trình duyệt để tránh bị chặn
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo trả về status ${response.status}`);
    }

    const html = await response.text();

    // Phân tích HTML bằng cheerio
    const $ = cheerio.load(html);
    const results = [];

    // Trích xuất kết quả từ các phần tử .result__body
    $('.result__body').each((index, element) => {
      if (results.length >= MAX_RESULTS) return false; // Dừng khi đủ kết quả

      const $el = $(element);

      // Lấy tiêu đề từ link
      const $title = $el.find('.result__a');
      const title = $title.text().trim();

      // Lấy URL — DuckDuckGo dùng redirect link, cần parse
      let url = $title.attr('href') || '';
      // Xử lý URL redirect của DuckDuckGo (//duckduckgo.com/l/?uddg=...)
      if (url.includes('uddg=')) {
        try {
          const urlParams = new URLSearchParams(url.split('?')[1]);
          url = decodeURIComponent(urlParams.get('uddg') || url);
        } catch {
          // Giữ nguyên URL nếu không parse được
        }
      }

      // Lấy snippet mô tả
      const $snippet = $el.find('.result__snippet');
      const snippet = $snippet.text().trim();

      // Chỉ thêm kết quả có ít nhất tiêu đề
      if (title) {
        results.push({
          title,
          url,
          snippet: snippet || 'Không có mô tả',
        });
      }
    });

    return {
      answer: null, // DuckDuckGo HTML không cung cấp câu trả lời tổng hợp
      results,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// HÀM CHÍNH: TÌM KIẾM WEB (TỰ ĐỘNG CHỌN PHƯƠNG THỨC)
// ============================================================

/**
 * Tìm kiếm web — tự động chọn Tavily (nếu có key) hoặc DuckDuckGo.
 * Nếu Tavily thất bại, tự động fallback sang DuckDuckGo.
 *
 * @param {string} query - Truy vấn tìm kiếm
 * @returns {Promise<Object>} { answer: string|null, results: Array<{ title, url, snippet }> }
 */
async function searchWeb(query) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    console.warn('[WebSearch] Truy vấn tìm kiếm trống hoặc không hợp lệ.');
    return { answer: null, results: [] };
  }

  const trimmedQuery = query.trim();

  // Thử Tavily trước nếu có API key
  if (TAVILY_API_KEY) {
    try {
      const tavilyResults = await searchWithTavily(trimmedQuery);
      console.info(`[WebSearch] Tavily trả về ${tavilyResults.results.length} kết quả.`);
      return tavilyResults;
    } catch (error) {
      console.warn(`[WebSearch] Tavily thất bại: ${error.message}. Chuyển sang DuckDuckGo.`);
      // Tiếp tục fallback sang DuckDuckGo bên dưới
    }
  }

  // Fallback: DuckDuckGo
  try {
    const ddgResults = await searchWithDuckDuckGo(trimmedQuery);
    console.info(`[WebSearch] DuckDuckGo trả về ${ddgResults.results.length} kết quả.`);
    return ddgResults;
  } catch (error) {
    console.error(`[WebSearch] DuckDuckGo cũng thất bại: ${error.message}`);
    // Trả về kết quả trống thay vì ném lỗi
    return {
      answer: null,
      results: [],
    };
  }
}

// ============================================================
// HÀM TIỆN ÍCH
// ============================================================

/**
 * Kiểm tra xem dịch vụ tìm kiếm có khả dụng không.
 * Luôn trả về true vì DuckDuckGo không cần API key.
 * @returns {boolean}
 */
function isSearchAvailable() {
  // Luôn khả dụng nhờ DuckDuckGo fallback
  // Trả thêm thông tin về phương thức khả dụng
  return true;
}

// ============================================================
// XUẤT MODULE
// ============================================================

/**
 * Format kết quả tìm kiếm thành chuỗi dễ đọc cho AI.
 * @param {Object} searchResult - Kết quả từ searchWeb
 * @returns {string} Chuỗi đã format
 */
function formatSearchResults(searchResult) {
  let formatted = '';

  if (searchResult.answer) {
    formatted += `Câu trả lời tổng hợp: ${searchResult.answer}\n\n`;
  }

  if (searchResult.results && searchResult.results.length > 0) {
    formatted += 'Kết quả tìm kiếm:\n';
    searchResult.results.forEach((result, index) => {
      formatted += `\n${index + 1}. ${result.title}\n`;
      formatted += `   URL: ${result.url}\n`;
      formatted += `   Mô tả: ${result.snippet}\n`;
    });
  } else {
    formatted = 'Không tìm thấy kết quả nào.';
  }

  return formatted;
}

module.exports = {
  /** Tìm kiếm web (tự động chọn phương thức tốt nhất) */
  searchWeb,

  /** Alias cho searchWeb — dùng bởi các command */
  search: searchWeb,

  /** Format kết quả tìm kiếm thành text */
  formatSearchResults,

  /** Kiểm tra tính khả dụng của dịch vụ tìm kiếm */
  isSearchAvailable,
};
