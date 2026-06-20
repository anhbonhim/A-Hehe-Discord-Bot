// src/services/animeImage.js
// Lấy ảnh anime ngẫu nhiên từ API waifu.pics
// Hỗ trợ nhiều thể loại SFW (Safe For Work)

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { searchAnimeImages } = require('./webSearch');
const imageCache = require('./imageCache');
const imageHistory = require('./imageHistory');
const { verifyImageContent } = require('./imageVerification');

// ============================================================
// CẤU HÌNH
// ============================================================

/** URL gốc của API nekos.best */
const API_BASE = 'https://nekos.best/api/v2';

/**
 * Danh sách các thể loại SFW được hỗ trợ.
 * Chia thành 2 nhóm: ảnh nhân vật và ảnh hành động (reaction).
 */
const SFW_CATEGORIES = {
  // Ảnh nhân vật
  waifu: { emoji: '💖', label: 'Waifu' },
  neko: { emoji: '🐱', label: 'Neko' },
  shinobu: { emoji: '🦋', label: 'Shinobu' },
  megumin: { emoji: '💥', label: 'Megumin' },

  // Ảnh hành động / reaction
  bully: { emoji: '😈', label: 'Bully' },
  cuddle: { emoji: '🤗', label: 'Cuddle' },
  cry: { emoji: '😢', label: 'Cry' },
  hug: { emoji: '🫂', label: 'Hug' },
  awoo: { emoji: '🐺', label: 'Awoo' },
  kiss: { emoji: '😘', label: 'Kiss' },
  lick: { emoji: '👅', label: 'Lick' },
  pat: { emoji: '🤚', label: 'Pat' },
  smug: { emoji: '😏', label: 'Smug' },
  bonk: { emoji: '🔨', label: 'Bonk' },
  yeet: { emoji: '🏋️', label: 'Yeet' },
  blush: { emoji: '😊', label: 'Blush' },
  smile: { emoji: '😄', label: 'Smile' },
  wave: { emoji: '👋', label: 'Wave' },
  highfive: { emoji: '🙌', label: 'High Five' },
  handhold: { emoji: '🤝', label: 'Handhold' },
  nom: { emoji: '😋', label: 'Nom' },
  bite: { emoji: '🦷', label: 'Bite' },
  glomp: { emoji: '🤸', label: 'Glomp' },
  slap: { emoji: '👋', label: 'Slap' },
  happy: { emoji: '😃', label: 'Happy' },
  wink: { emoji: '😉', label: 'Wink' },
  poke: { emoji: '👉', label: 'Poke' },
  dance: { emoji: '💃', label: 'Dance' },
  cringe: { emoji: '😬', label: 'Cringe' },
  kick: { emoji: '🦶', label: 'Kick' },
};

/**
 * Danh sách các thể loại NSFW được hỗ trợ (qua Nekobot API)
 */
const NSFW_CATEGORIES = {
  xwaifu: { emoji: '🔞', label: 'NSFW Waifu', nekobotType: 'hentai' },
  xneko: { emoji: '🔞', label: 'NSFW Neko', nekobotType: 'hneko' },
  xtrap: { emoji: '🔞', label: 'NSFW Trap', nekobotType: 'hentai' },
  xgif: { emoji: '🔞', label: 'NSFW GIF', nekobotType: 'pgif' },
};

/**
 * Danh sách từ khóa trigger để kích hoạt tính năng random ảnh.
 * Key là từ khóa user có thể gõ, value là category tương ứng trên API.
 */
const TRIGGER_KEYWORDS = new Map([
  // Từ khóa tiếng Việt và tiếng Anh
  ['waifu', 'waifu'],
  ['neko', 'neko'],
  ['shinobu', 'shinobu'],
  ['megumin', 'megumin'],
  ['hug', 'hug'],
  ['ôm', 'hug'],
  ['kiss', 'kiss'],
  ['hôn', 'kiss'],
  ['pat', 'pat'],
  ['xoa đầu', 'pat'],
  ['vuốt đầu', 'pat'],
  ['slap', 'slap'],
  ['tát', 'slap'],
  ['cry', 'cry'],
  ['khóc', 'cry'],
  ['smile', 'smile'],
  ['cười', 'smile'],
  ['dance', 'dance'],
  ['nhảy', 'dance'],
  ['blush', 'blush'],
  ['bonk', 'bonk'],
  ['bite', 'bite'],
  ['cắn', 'bite'],
  ['wave', 'wave'],
  ['vẫy', 'wave'],
  ['wink', 'wink'],
  ['nháy mắt', 'wink'],
  ['happy', 'happy'],
  ['vui', 'happy'],
  ['cuddle', 'cuddle'],
  ['ôm ấp', 'cuddle'],
  ['poke', 'poke'],
  ['chọc', 'poke'],
  ['kick', 'kick'],
  ['đá', 'kick'],
  ['highfive', 'highfive'],
  ['high five', 'highfive'],
  ['handhold', 'handhold'],
  ['nắm tay', 'handhold'],
  ['yeet', 'yeet'],
  ['smug', 'smug'],
  ['bully', 'bully'],
  ['awoo', 'awoo'],
  ['lick', 'lick'],
  ['liếm', 'lick'],
  ['nom', 'nom'],
  ['glomp', 'glomp'],
  ['cringe', 'cringe'],
  
  // Các lệnh NSFW (18+)
  ['xwaifu', 'xwaifu'],
  ['xneko', 'xneko'],
  ['xtrap', 'xtrap'],
  ['xgif', 'xgif'],
]);

/**
 * Màu ngẫu nhiên cho embed, tạo cảm giác tươi sáng.
 */
const EMBED_COLORS = [
  0xFF6B9D, // Hồng
  0xC084FC, // Tím nhạt
  0x60A5FA, // Xanh dương
  0x34D399, // Xanh lá
  0xFBBF24, // Vàng
  0xF87171, // Đỏ nhạt
  0xA78BFA, // Tím
  0x38BDF8, // Xanh trời
  0xFB923C, // Cam
  0xE879F9, // Magenta
];

// ============================================================
// HÀM GỌI API
// ============================================================

/**
 * Ánh xạ các danh mục của waifu.pics sang nekos.best do nekos.best thiếu một số danh mục
 * @param {string} category 
 * @returns {string} Danh mục tương ứng trên nekos.best
 */
function mapCategoryToNekosBest(category) {
  const mapping = {
    shinobu: 'waifu',
    megumin: 'waifu',
    bully: 'slap',
    awoo: 'nyan',
    lick: 'nom', // liếm -> măm măm/ăn
    glomp: 'cuddle', // glomp -> ôm ấp
  };
  return mapping[category] || category;
}

/**
 * Lấy URL ảnh anime 18+ từ Nekobot API.
 * @param {string} type - Thể loại ảnh trên Nekobot (hentai, hneko, pgif)
 * @returns {Promise<string>} URL ảnh
 */
async function fetchNekobotImage(type) {
  const url = `https://nekobot.xyz/api/image?type=${type}`;
  logger.debug(`[AnimeImage] Gọi Nekobot API: ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    });

    if (!response.ok) {
      throw new Error(`API Nekobot trả về HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.message) {
      throw new Error('API Nekobot không trả về kết quả ảnh');
    }

    return data.message;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Lấy URL ảnh anime ngẫu nhiên từ nekos.best hoặc nekobot API.
 *
 * @param {string} category - Thể loại ảnh (ví dụ: 'waifu', 'xwaifu')
 * @returns {Promise<string>} URL của ảnh
 * @throws {Error} Khi API trả về lỗi
 */
async function fetchRandomImage(category) {
  // Nếu là danh mục NSFW, gọi Nekobot API
  if (NSFW_CATEGORIES[category]) {
    return fetchNekobotImage(NSFW_CATEGORIES[category].nekobotType);
  }

  const bestCategory = mapCategoryToNekosBest(category);
  const url = `${API_BASE}/${bestCategory}`;
  logger.debug(`[AnimeImage] Gọi API: ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Discord-AI-Bot/1.0 (https://github.com/niyakipham/anime-bot)' },
    });

    if (!response.ok) {
      throw new Error(`API nekos.best trả về HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0 || !data.results[0].url) {
      throw new Error('API không trả về kết quả ảnh hợp lệ');
    }

    const imageUrl = data.results[0].url;
    logger.debug(`[AnimeImage] Nhận ảnh: ${imageUrl.substring(0, 60)}...`);
    return imageUrl;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// HÀM XỬ LÝ TIN NHẮN
// ============================================================

/**
 * Kiểm tra xem nội dung tin nhắn có khớp với từ khóa random ảnh không.
 * Trả về category nếu khớp, null nếu không.
 *
 * @param {string} content - Nội dung tin nhắn (đã strip mention)
 * @returns {string|null} Category API hoặc null
 */
function detectAnimeKeyword(content) {
  if (!content) return null;

  const normalized = content.toLowerCase().trim();

  // Sắp xếp các từ khóa theo độ dài giảm dần để tránh nhận diện trùng từ ngắn (ví dụ "ôm" nằm trong "ôm ấp")
  const sortedKeywords = Array.from(TRIGGER_KEYWORDS.entries()).sort((a, b) => b[0].length - a[0].length);
  
  for (const [keyword, category] of sortedKeywords) {
    if (normalized.includes(keyword)) {
      return category;
    }
  }

  // Dự phòng: Kiểm tra "anime/random" + tên category trực tiếp
  const animeMatch = normalized.match(/^(anime|random)\s+(.+)$/);
  if (animeMatch) {
    const sub = animeMatch[2].trim();
    if (SFW_CATEGORIES[sub]) {
      return sub;
    }
    if (NSFW_CATEGORIES[sub]) {
      return sub;
    }
  }

  return null;
}

/**
 * Xử lý và gửi ảnh anime random khi phát hiện từ khóa.
 * Trả về true nếu đã xử lý (đã gửi ảnh), false nếu không phải từ khóa anime.
 *
 * @param {import('discord.js').Message} message - Tin nhắn Discord
 * @param {string} content - Nội dung tin nhắn (đã strip mention)
 * @returns {Promise<boolean>} true nếu đã gửi ảnh anime
 */
async function handleAnimeImage(message, content) {
  const category = detectAnimeKeyword(content);
  if (!category) return false;

  const isNSFWCategory = !!NSFW_CATEGORIES[category];
  const isNSFWChannel = message.channel.nsfw || !message.guild;

  // Kiểm tra phân quyền kênh nếu yêu cầu NSFW
  if (isNSFWCategory && !isNSFWChannel) {
    await message.reply('❌ Cảnh báo: Lệnh này chứa nội dung nhạy cảm (NSFW) và chỉ có thể sử dụng trong kênh được gắn nhãn NSFW!');
    return true;
  }

  try {
    const imageUrl = await fetchRandomImage(category);
    const catInfo = SFW_CATEGORIES[category] || NSFW_CATEGORIES[category] || { emoji: '🎴', label: category };
    const randomColor = isNSFWCategory ? 0xFF0000 : EMBED_COLORS[Math.floor(Math.random() * EMBED_COLORS.length)];

    const embed = new EmbedBuilder()
      .setColor(randomColor)
      .setTitle(`${catInfo.emoji} ${catInfo.label}`)
      .setImage(imageUrl)
      .setFooter({
        text: `Yêu cầu bởi ${message.author.username} • ${isNSFWCategory ? 'nekobot.xyz' : 'nekos.best'}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    logger.discord(
      `${message.author.tag} yêu cầu ảnh anime: ${category} (${isNSFWCategory ? 'NSFW' : 'SFW'})`
    );

    return true;
  } catch (error) {
    logger.error(`[AnimeImage] Lỗi lấy ảnh ${category}: ${error.message}`);

    await message.reply(`❌ Không thể lấy ảnh **${category}**. Thử lại sau nhé!`);
    return true; // Vẫn trả true vì đã nhận diện là lệnh anime
  }
}

/**
 * Lấy danh sách tất cả categories có sẵn, format đẹp.
 * @param {import('discord.js').TextChannel} [channel] - Kênh Discord để kiểm tra quyền NSFW
 * @returns {string} Chuỗi danh sách categories
 */
function getCategoryList(channel = null) {
  const sfwEntries = Object.entries(SFW_CATEGORIES);
  let list = '**Ảnh SFW:**\n' + sfwEntries
    .map(([key, info]) => `${info.emoji} \`${key}\``)
    .join('  ');

  const isNSFW = channel ? (channel.nsfw || !channel.guild) : false;
  if (isNSFW) {
    const nsfwEntries = Object.entries(NSFW_CATEGORIES);
    list += '\n\n**Ảnh NSFW (18+):**\n' + nsfwEntries
      .map(([key, info]) => `${info.emoji} \`${key}\``)
      .join('  ');
  }
  return list;
}

/**
 * Gửi trực tiếp ảnh anime hoặc danh mục dựa trên category được cung cấp bởi AI Router
 * @param {import('discord.js').Message} message 
 * @param {string} category 
 * @param {boolean} isNSFW 
 * @returns {Promise<boolean>}
 */
async function sendAnimeImage(message, category, isNSFW = false) {
  if (category === 'list') {
    const listEmbed = new EmbedBuilder()
      .setColor(0xE879F9)
      .setTitle('🎴 Danh sách ảnh Anime')
      .setDescription(
        'Tag tôi kèm một trong các từ khóa sau để nhận ảnh anime ngẫu nhiên:\n\n' +
        getCategoryList(message.channel) +
        '\n\n**Bạn cũng có thể yêu cầu ảnh động bất kỳ:** `@bot gửi ảnh luffy`, `@bot ảnh mèo ngủ`, `@bot rem`...'
      )
      .setFooter({ text: 'Nguồn: nekos.best API & Web Search' })
      .setTimestamp();
    await message.reply({ embeds: [listEmbed] });
    return true;
  }

  // Cờ kiểm tra xem là danh mục tĩnh (SFW/NSFW có sẵn) hay danh mục động
  const isStaticSFW = !!SFW_CATEGORIES[category];
  const isStaticNSFW = !!NSFW_CATEGORIES[category];
  const isStatic = isStaticSFW || isStaticNSFW;
  
  // Xác định cờ NSFW tổng hợp
  const effectiveIsNSFW = isStaticNSFW || isNSFW;
  const isNSFWChannel = message.channel.nsfw || !message.guild;

  // Kiểm tra quyền NSFW
  if (effectiveIsNSFW && !isNSFWChannel) {
    await message.reply('❌ Cảnh báo: Từ khóa này có thể chứa nội dung nhạy cảm (NSFW) và chỉ được phép sử dụng trong kênh được gắn nhãn NSFW!');
    return true;
  }

  try {
    let imageUrl = null;
    let sourceText = '';

    if (isStatic) {
      // 1. LUỒNG DANH MỤC TĨNH (Nekos.best / Nekobot)
      imageUrl = await fetchRandomImage(category);
      sourceText = isStaticNSFW ? 'nekobot.xyz' : 'nekos.best';
    } else {
      // 2. LUỒNG DANH MỤC ĐỘNG (Cache -> Web Search -> History -> Random)
      sourceText = 'Web Search';
      
      // Kiểm tra Cache
      const cached = imageCache.getCache(category);
      let validImages = [];
      
      if (cached) {
        validImages = cached.images;
        // Soft refresh
        if (cached.needsRefresh) {
          searchAnimeImages(category, effectiveIsNSFW).then(newImages => {
            if (newImages.length > 0) imageCache.setCache(category, newImages);
          }).catch(err => logger.error(`Lỗi background refresh cho ${category}: ${err.message}`));
        }
      } else {
        // Query mới nếu chưa có Cache
        await message.channel.sendTyping();
        validImages = await searchAnimeImages(category, effectiveIsNSFW);
        if (validImages.length > 0) {
          imageCache.setCache(category, validImages);
        }
      }
      
      if (validImages.length === 0) {
        await message.reply(`❌ Xin lỗi, tôi không tìm thấy ảnh nào hợp lệ cho "**${category}**". Bạn thử từ khóa khác nhé!`);
        return true;
      }
      
      // Lọc qua History (Chống lặp)
      // Tỷ lệ lặp tự nhiên: 1/25 bỏ qua history filter
      const shouldBypassHistory = Math.random() < (1 / 25);
      let candidateImages = [...validImages];
      
      if (!shouldBypassHistory) {
        candidateImages = validImages.filter(url => !imageHistory.isRecent(category, url));
        // Nếu tất cả ảnh đều đã nằm trong lịch sử, đành lấy lại toàn bộ danh sách để tránh lỗi
        if (candidateImages.length === 0) {
          candidateImages = [...validImages];
        }
      }
      
      let verifiedUrl = null;
      let lastCheckedUrl = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (candidateImages.length > 0 && attempts < maxAttempts) {
        attempts++;
        const randomIndex = Math.floor(Math.random() * candidateImages.length);
        const selectedUrl = candidateImages[randomIndex];
        lastCheckedUrl = selectedUrl;
        
        // Loại bỏ khỏi candidate để không chọn lại trong vòng lặp này
        candidateImages.splice(randomIndex, 1);
        
        // Thực hiện kiểm chứng AI Vision
        const isValid = await verifyImageContent(selectedUrl, category);
        if (isValid) {
          verifiedUrl = selectedUrl;
          break;
        } else {
          logger.warn(`[AnimeImage] Vision check FAILED for: ${selectedUrl}. Removing from cache.`);
          // Xóa ảnh sai khỏi danh sách cache chung (validImages)
          const indexInValid = validImages.indexOf(selectedUrl);
          if (indexInValid !== -1) {
            validImages.splice(indexInValid, 1);
            if (validImages.length > 0) {
              imageCache.setCache(category, validImages);
            } else {
              imageCache.clearCache(category);
            }
          }
        }
      }
      
      // Nếu không tìm được ảnh nào vượt qua kiểm chứng, lấy ảnh cuối cùng được check (Best Effort)
      imageUrl = verifiedUrl || lastCheckedUrl;
      
      if (!imageUrl) {
        await message.reply(`❌ Xin lỗi, tôi không tìm thấy ảnh nào hợp lệ cho "**${category}**". Bạn thử từ khóa khác nhé!`);
        return true;
      }
      
      // Thêm ảnh vừa gửi vào History
      imageHistory.addHistory(category, imageUrl);
    }

    const catInfo = SFW_CATEGORIES[category] || NSFW_CATEGORIES[category] || { emoji: '🔍', label: category.charAt(0).toUpperCase() + category.slice(1) };
    const randomColor = effectiveIsNSFW ? 0xFF0000 : EMBED_COLORS[Math.floor(Math.random() * EMBED_COLORS.length)];

    const embed = new EmbedBuilder()
      .setColor(randomColor)
      .setTitle(`${catInfo.emoji} ${catInfo.label}`)
      .setImage(imageUrl)
      .setFooter({
        text: `Yêu cầu bởi ${message.author.username} • Nguồn: ${sourceText}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    logger.discord(
      `${message.author.tag} yêu cầu ảnh: ${category} (${effectiveIsNSFW ? 'NSFW' : 'SFW'})`
    );

    return true;
  } catch (error) {
    logger.error(`[AnimeImage] Lỗi lấy ảnh ${category}: ${error.message}`);
    await message.reply(`❌ Không thể lấy ảnh **${category}**. Thử lại sau nhé!`);
    return true;
  }
}

// ============================================================
// XUẤT MODULE
// ============================================================

module.exports = {
  fetchRandomImage,
  detectAnimeKeyword,
  handleAnimeImage,
  sendAnimeImage,
  getCategoryList,
  SFW_CATEGORIES,
  NSFW_CATEGORIES,
  TRIGGER_KEYWORDS,
};
