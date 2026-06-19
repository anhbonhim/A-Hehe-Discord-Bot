// Sự kiện messageCreate - Xử lý tin nhắn từ người dùng
// Đây là file quan trọng nhất - xử lý toàn bộ luồng hội thoại AI

const { EmbedBuilder } = require('discord.js');
const { chat } = require('../services/aiService');
const { config } = require('../config');
const conversationManager = require('../services/conversationManager');
const { getToolDefinitions, executeTool } = require('../services/toolManager');
const { isImage, buildImageContent, getImageAnalysisPrompt } = require('../services/imageAnalyzer');
const { isDocument, extractContent } = require('../services/documentParser');
const splitMessage = require('../utils/splitMessage');
const logger = require('../utils/logger');
const { handleAnimeImage, getCategoryList } = require('../services/animeImage');
const { formatTablesForDiscord } = require('../utils/formatDiscord');
const { hasGeminiKey, analyzeImagesWithGemini } = require('../services/geminiVision');
const { getBotHelpEmbed } = require('../utils/helpEmbed');

// Số vòng lặp tool call tối đa để tránh vòng lặp vô hạn
const MAX_TOOL_ITERATIONS = 5;

module.exports = {
  name: 'messageCreate',

  /**
   * Xử lý tin nhắn mới
   * @param {import('discord.js').Message} message - Tin nhắn Discord
   * @param {import('discord.js').Client} client - Discord client
   */
  async execute(message, client) {
    // Bỏ qua tin nhắn từ bot
    if (message.author.bot) return;

    // Kiểm tra tin nhắn riêng (DM)
    const isDM = !message.guild;

    // Kiểm tra mention
    const isMentioned = message.mentions.has(client.user.id);

    // Kiểm tra reply và tin nhắn gốc
    let isReplyToBot = false;
    let referencedMessage = null;
    if (message.reference && !isDM) {
      try {
        referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
        isReplyToBot = referencedMessage?.author?.id === client.user.id;
      } catch (err) {
        logger.debug(`Không fetch được tin nhắn gốc: ${err.message}`);
      }
    }

    // Kích hoạt khi: DM | mention | reply vào bot
    if (!isDM && !isMentioned && !isReplyToBot) return;

    // Lấy nội dung tin nhắn (loại bỏ mention nếu có)
    let userContent = message.content;

    if (isMentioned) {
      userContent = userContent.replace(/<@!?\d+>/g, '').trim();
    }

    // Nếu tin nhắn trống VÀ không reply tin nhắn nào, hiện hướng dẫn ngắn
    if (!userContent && message.attachments.size === 0 && !referencedMessage) {
      const helpDescription = isDM
        ? `Nhắn gì cũng được, tôi sẽ trả lời. Gửi ảnh hoặc file kèm câu hỏi cũng được.`
        : `Tag tôi kèm câu hỏi, reply vào tin nhắn của tôi, hoặc nhắn riêng (DM).` +
          `\nGửi ảnh hoặc file kèm câu hỏi cũng được.`;

      return message.reply(helpDescription);
    }

    // Kiểm tra từ khóa hỏi về hướng dẫn sử dụng bot
    if (userContent) {
      const normalizedContent = userContent.toLowerCase().trim();
      const helpKeywords = [
        'hướng dẫn sử dụng', 'huong dan su dung',
        'cách dùng bot', 'cach dung bot',
        'tính năng của bot', 'tinh nang cua bot',
        'bot có tính năng gì', 'bot co tinh nang gi',
        'lệnh bot', 'lenh bot',
        'hướng dẫn bot', 'huong dan bot'
      ];
      
      const isAskingForHelp = helpKeywords.some(keyword => normalizedContent.includes(keyword)) || 
                             normalizedContent === 'help' || 
                             normalizedContent === 'bot';
                             
      if (isAskingForHelp) {
        return message.reply({ embeds: [getBotHelpEmbed(client)] });
      }

      // 1. Lệnh Xóa lịch sử (clear)
      const isClear = /^(clear|reset|xoá lịch sử|xóa lịch sử|xoá chat|xóa chat|xoá|xóa|clear history|clear chat|reset chat|reset history|dọn dẹp|don dep)$/i.test(normalizedContent);
      if (isClear) {
        const hadHistory = conversationManager.clearHistory(message.channel.id);
        const stats = conversationManager.getStats();
        
        const embed = new EmbedBuilder()
          .setColor(hadHistory ? 0x57f287 : 0xfee75c)
          .setTitle(hadHistory ? '🗑️ Đã xoá lịch sử hội thoại' : 'ℹ️ Không có lịch sử')
          .setDescription(
            hadHistory
              ? 'Lịch sử hội thoại của kênh này đã được xoá. Cuộc trò chuyện mới sẽ bắt đầu từ đầu.'
              : 'Kênh này chưa có lịch sử hội thoại nào.'
          )
          .addFields({
            name: '📊 Thống kê',
            value: `Hội thoại đang hoạt động: **${stats.activeConversations}** kênh\nTổng tin nhắn trong bộ nhớ: **${stats.totalMessages}**`,
          })
          .setTimestamp()
          .setFooter({ text: `Thực hiện bởi ${message.author.tag}` });

        await message.reply({ embeds: [embed] });
        
        try {
          const { updatePresence } = require('./ready');
          await updatePresence(client, message.channel.id);
        } catch (err) {
          logger.debug(`Lỗi cập nhật status bot sau khi clear: ${err.message}`);
        }
        return;
      }

      // 2. Lệnh Xem thông tin model hiện tại (model info)
      const isModelInfo = /^(model|mô hình|mo hinh|xem model|xem mô hình|xem mo hinh|thông tin model|thong tin model|thông tin mô hình|check model)$/i.test(normalizedContent);
      if (isModelInfo) {
        const { getModelInfo } = require('../services/aiService');
        const info = getModelInfo();
        const REASONING_LABELS = {
          auto: 'Tự động (model tự quyết định)',
          low: 'Thấp — tốc độ nhanh, tiết kiệm',
          medium: 'Trung bình',
          high: 'Cao — suy luận sâu sắc',
        };
        const reasoningLabel = REASONING_LABELS[info.reasoningEffort] || info.reasoningEffort;

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('Thông tin Model AI')
          .addFields(
            { name: 'Model', value: `\`${info.name}\``, inline: false },
            {
              name: 'Thông số',
              value:
                `Context window: **${info.maxContextTokens.toLocaleString()}** tokens\n` +
                `Max response: **${info.maxResponseTokens.toLocaleString()}** tokens\n` +
                `Temperature: **${info.temperature}**\n` +
                `Reasoning: **${reasoningLabel}**`,
            },
            {
              name: 'Cách thay đổi',
              value:
                'Nhắn tin theo cú pháp:\n' +
                '• `đổi model <tên_model>` (ví dụ: `đổi model google/gemini-2.5-pro`)\n' +
                '• `đổi reasoning <auto|low|medium|high>`\n' +
                'Danh sách model tại: https://openrouter.ai/models',
            }
          )
          .setTimestamp();

        return message.reply({ embeds: [embed] });
      }

      // 3. Lệnh Đổi model (change model)
      const changeModelMatch = userContent.match(/\b(đổi|doi|chuyển|chuyen|sử dụng|su dung|set|use|change)\s+(sang\s+|thành\s+|thanh\s+|to\s+)?(model|mô hình|mo hinh)\s+([a-zA-Z0-9_\-\/:\.]+)/i);
      if (changeModelMatch) {
        const newModelName = changeModelMatch[4].trim().replace(/[\.\s]+$/, '');
        const { getModelInfo, setModel } = require('../services/aiService');
        const oldInfo = getModelInfo();
        
        try {
          setModel(newModelName);
          
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('Đã cập nhật cấu hình AI')
            .addFields(
              {
                name: 'Thay đổi',
                value: `Model: \`${oldInfo.name}\` → \`${newModelName}\``,
              },
              {
                name: 'Cấu hình hiện tại',
                value:
                  `Model: \`${newModelName}\`\n` +
                  `Context: ${oldInfo.maxContextTokens.toLocaleString()} tokens\n` +
                  `Max response: ${oldInfo.maxResponseTokens.toLocaleString()} tokens\n` +
                  `Temperature: ${oldInfo.temperature}\n` +
                  `Reasoning: **${oldInfo.reasoningEffort}**`,
              }
            )
            .setTimestamp()
            .setFooter({ text: `Thay đổi bởi ${message.author.tag}` });

          return message.reply({ embeds: [embed] });
        } catch (err) {
          return message.reply(`❌ Lỗi khi đổi model: ${err.message}`);
        }
      }

      // 4. Lệnh Đổi mức suy luận (change reasoning effort)
      const changeReasoningMatch = userContent.match(/\b(đổi|doi|chuyển|chuyen|set|use|change)\s+(sang\s+|thành\s+|thanh\s+|to\s+)?(reasoning|suy luận|suy luan)\s+(auto|low|medium|high)/i);
      if (changeReasoningMatch) {
        const newReasoning = changeReasoningMatch[4].trim().toLowerCase();
        const { getModelInfo, setReasoningEffort } = require('../services/aiService');
        const oldInfo = getModelInfo();
        
        try {
          setReasoningEffort(newReasoning);
          
          const REASONING_LABELS = {
            auto: 'Tự động (model tự quyết định)',
            low: 'Thấp — tốc độ nhanh, tiết kiệm',
            medium: 'Trung bình',
            high: 'Cao — suy luận sâu sắc',
          };
          const oldLabel = REASONING_LABELS[oldInfo.reasoningEffort] || oldInfo.reasoningEffort;
          const newLabel = REASONING_LABELS[newReasoning];
          
          const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('Đã cập nhật cấu hình AI')
            .addFields(
              {
                name: 'Thay đổi',
                value: `Reasoning: ${oldLabel} → **${newLabel}**`,
              },
              {
                name: 'Cấu hình hiện tại',
                value:
                  `Model: \`${oldInfo.name}\`\n` +
                  `Context: ${oldInfo.maxContextTokens.toLocaleString()} tokens\n` +
                  `Max response: ${oldInfo.maxResponseTokens.toLocaleString()} tokens\n` +
                  `Temperature: ${oldInfo.temperature}\n` +
                  `Reasoning: **${newLabel}**`,
              }
            )
            .setTimestamp()
            .setFooter({ text: `Thay đổi bởi ${message.author.tag}` });

          return message.reply({ embeds: [embed] });
        } catch (err) {
          return message.reply(`❌ Lỗi: ${err.message}`);
        }
      }

      // 5. Lệnh Tìm kiếm trực tiếp (direct search)
      const searchMatch = userContent.match(/^(tìm kiếm|tim kiem|search|tra cứu|tra cuu)\s+(.+)$/i);
      if (searchMatch) {
        const query = searchMatch[2].trim();
        await message.channel.sendTyping();
        try {
          const { search } = require('../services/webSearch');
          const searchResult = await search(query, 5);
          
          const embed = new EmbedBuilder()
            .setColor(0x00ae86)
            .setTitle(`🔍 Kết quả tìm kiếm: "${query}"`)
            .setTimestamp()
            .setFooter({ text: `Yêu cầu bởi ${message.author.tag}` });

          if (searchResult.answer) {
            embed.setDescription(
              searchResult.answer.length > 400
                ? searchResult.answer.substring(0, 400) + '...'
                : searchResult.answer
            );
          }

          if (searchResult.results.length > 0) {
            const resultsText = searchResult.results
              .slice(0, 5)
              .map((result, index) => {
                const title = result.title.length > 80
                  ? result.title.substring(0, 80) + '...'
                  : result.title;
                const snippet = result.snippet.length > 150
                  ? result.snippet.substring(0, 150) + '...'
                  : result.snippet;

                return `**${index + 1}. [${title}](${result.url})**\n${snippet}`;
              })
              .join('\n\n');

            embed.addFields({
              name: '📋 Kết quả',
              value: resultsText || 'Không tìm thấy kết quả.',
            });
          } else {
            embed.setDescription('Không tìm thấy kết quả nào cho từ khoá này.');
          }

          return message.reply({ embeds: [embed] });
        } catch (error) {
          logger.error(`Lỗi tìm kiếm tự động: ${error.message}`);
          return message.reply('❌ Không thể thực hiện tìm kiếm. Vui lòng thử lại sau.');
        }
      }
    }

    // Kiểm tra từ khóa random ảnh anime
    // Ví dụ: "@bot waifu", "@bot neko", "@bot hug", "@bot ôm"
    if (userContent) {
      const normalizedContent = userContent.toLowerCase().trim();

      // Hiện danh sách categories nếu user gõ "anime list" hoặc "anime help"
      if (normalizedContent === 'anime list' || normalizedContent === 'anime help' || normalizedContent === 'anime') {
        const { EmbedBuilder: EB } = require('discord.js');
        const listEmbed = new EB()
          .setColor(0xE879F9)
          .setTitle('🎴 Danh sách ảnh Anime')
          .setDescription(
            'Tag tôi kèm một trong các từ khóa sau để nhận ảnh anime ngẫu nhiên:\n\n' +
            getCategoryList(message.channel) +
            '\n\n**Ví dụ:** `@bot waifu`, `@bot neko`, `@bot hug`, `@bot ôm`'
          )
          .setFooter({ text: 'Nguồn: nekos.best API' })
          .setTimestamp();
        return message.reply({ embeds: [listEmbed] });
      }

      // Xử lý random ảnh anime nếu khớp từ khóa
      const handled = await handleAnimeImage(message, userContent);
      if (handled) return;
    }

    try {
      // Hiển thị trạng thái đang gõ
      await message.channel.sendTyping();

      // Xử lý tệp đính kèm
      const imageAttachments = [];
      const documentTexts = [];

      if (message.attachments.size > 0) {
        for (const [, attachment] of message.attachments) {
          if (isImage(attachment)) {
            imageAttachments.push(attachment);
          } else if (isDocument(attachment)) {
            const doc = await extractContent(attachment);
            documentTexts.push(doc);
          }
        }
      }

      // Xây dựng nội dung tin nhắn người dùng
      let fullUserContent = userContent;

      // Nếu reply một tin nhắn khác (không phải của bot), ta đính kèm nội dung đó vào context
      if (referencedMessage && !isReplyToBot) {
        const refAuthor = referencedMessage.author;
        const refContent = referencedMessage.content || '';
        
        let refSection = `--- Tin nhắn được trả lời (từ @${refAuthor.username}) ---\n`;
        refSection += refContent ? `${refContent}\n` : '[Tin nhắn không có nội dung văn bản]\n';
        
        // Xử lý tệp đính kèm của tin nhắn được reply
        if (referencedMessage.attachments && referencedMessage.attachments.size > 0) {
          for (const [, attachment] of referencedMessage.attachments) {
            if (isImage(attachment)) {
              imageAttachments.push(attachment);
              refSection += `[Hình ảnh đính kèm: ${attachment.name}]\n`;
            } else if (isDocument(attachment)) {
              try {
                const doc = await extractContent(attachment);
                refSection += `\n📄 File đính kèm: ${doc.filename} (${doc.type})\n`;
                refSection += doc.content + '\n';
              } catch (err) {
                logger.error(`Lỗi đọc file của tin nhắn được trả lời: ${err.message}`);
              }
            }
          }
        }
        
        refSection += '--------------------------------------------------\n\n';
        fullUserContent = refSection + fullUserContent;
      }

      // Thêm nội dung tài liệu vào context
      if (documentTexts.length > 0) {
        fullUserContent += '\n\n--- Nội dung tệp đính kèm ---\n';
        for (const doc of documentTexts) {
          fullUserContent += `\n📄 File: ${doc.filename} (${doc.type})\n`;
          fullUserContent += doc.content + '\n';
        }
      }

      // Thêm hướng dẫn phân tích ảnh nếu có
      if (imageAttachments.length > 0 && !userContent) {
        if (fullUserContent) {
          fullUserContent += '\n\n' + getImageAnalysisPrompt(imageAttachments.length);
        } else {
          fullUserContent = getImageAnalysisPrompt(imageAttachments.length);
        }
      }

      // Nếu có ảnh, dùng vision model để mô tả ảnh trước
      // Ưu tiên dùng API chính thức của Gemini (độ chính xác rất cao)
      if (imageAttachments.length > 0) {
        let visionText = null;
        const prompt = fullUserContent || 'Hãy mô tả chi tiết hình ảnh này (nhân vật, màu sắc, chữ viết, tên game/ứng dụng nếu có).';

        // 1. Thử dùng Google Gemini API chính thức
        if (hasGeminiKey) {
          try {
            visionText = await analyzeImagesWithGemini(imageAttachments, prompt);
            logger.info(`Gemini API trả về ${visionText.length} ký tự mô tả ảnh.`);
          } catch (err) {
            logger.error(`Lỗi dùng Gemini API: ${err.message}. Chuyển sang dự phòng OpenRouter.`);
          }
        }

        // 2. Dự phòng: dùng Vision Model của OpenRouter
        if (!visionText) {
          logger.info(`Đang phân tích ${imageAttachments.length} ảnh bằng OpenRouter vision model: ${config.ai.visionModel}`);
          const imageContentParts = [{ type: 'text', text: prompt }];
          
          for (const attachment of imageAttachments) {
            imageContentParts.push({
              type: 'image_url',
              image_url: { url: attachment.url },
            });
          }

          try {
            const visionResponse = await chat(
              [{ role: 'user', content: imageContentParts }],
              null,
              { model: config.ai.visionModel, maxTokens: 4096, temperature: 0.3 }
            );
            visionText = visionResponse.choices?.[0]?.message?.content;
            if (visionText) logger.info(`OpenRouter Vision trả về ${visionText.length} ký tự.`);
          } catch (visionErr) {
            logger.error(`Lỗi OpenRouter Vision: ${visionErr.message}`);
          }
        }

        // Gắn mô tả vào text để model chính (gpt-oss-120b) đọc
        if (visionText) {
          fullUserContent = (fullUserContent ? fullUserContent + '\n\n' : '') +
            '--- PHÂN TÍCH HÌNH ẢNH ---\n' + visionText;
        } else {
          fullUserContent = (fullUserContent ? fullUserContent + '\n\n' : '') +
            '[Không thể phân tích hình ảnh, hãy báo cho người dùng biết lỗi hệ thống thị giác]';
        }
      }

      // Xây dựng mảng messages từ lịch sử hội thoại
      const messages = conversationManager.buildMessages(
        message.channel.id,
        fullUserContent
      );

      // Lấy danh sách tool definitions
      const tools = getToolDefinitions();

      // Gọi AI service
      let response = await chat(messages, tools);
      let assistantMessage = response.choices[0]?.message;

      // Theo dõi xem có tìm kiếm web không
      let searchPerformed = false;
      let searchData = null;

      // Vòng lặp xử lý tool calls
      let iterations = 0;
      while (
        assistantMessage?.tool_calls &&
        assistantMessage.tool_calls.length > 0 &&
        iterations < MAX_TOOL_ITERATIONS
      ) {
        iterations++;
        logger.info(
          `Vòng tool call ${iterations}/${MAX_TOOL_ITERATIONS}: ${assistantMessage.tool_calls.length} tool(s)`
        );

        // Duy trì trạng thái đang gõ
        await message.channel.sendTyping();

        // Thêm message assistant với tool calls vào lịch sử
        messages.push({
          role: 'assistant',
          content: assistantMessage.content || null,
          tool_calls: assistantMessage.tool_calls,
        });

        // Thực thi từng tool call
        for (const toolCall of assistantMessage.tool_calls) {
          const toolResult = await executeTool(toolCall);

          // Kiểm tra xem có tìm kiếm web không
          if (toolResult.wasSearch) {
            searchPerformed = true;
            searchData = toolResult.searchData;
          }

          // Thêm kết quả tool vào messages
          messages.push({
            role: 'tool',
            tool_call_id: toolResult.toolCallId,
            content: toolResult.result,
          });
        }

        // Gọi AI lại với kết quả tool
        response = await chat(messages, tools);
        assistantMessage = response.choices[0]?.message;
      }

      // Lấy nội dung phản hồi cuối cùng
      let responseText =
        assistantMessage?.content || 'Xin lỗi, tôi không thể tạo phản hồi.';

      // Chuyển đổi bảng markdown thành code block (Discord không render bảng MD)
      responseText = formatTablesForDiscord(responseText);

      // Lưu cặp tin nhắn vào lịch sử hội thoại
      conversationManager.saveMessages(
        message.channel.id,
        fullUserContent,
        responseText
      );

      // Chia nhỏ tin nhắn nếu vượt giới hạn 2000 ký tự
      const parts = splitMessage(responseText);

      // Safety: đảm bảo không có chunk nào > 2000 ký tự
      const safeParts = [];
      for (const part of parts) {
        if (part.length <= 2000) {
          safeParts.push(part);
        } else {
          // Force-split chunk quá dài
          for (let j = 0; j < part.length; j += 1990) {
            safeParts.push(part.substring(j, j + 1990));
          }
        }
      }

      // Gửi phần đầu tiên dưới dạng reply
      await message.reply(safeParts[0]);

      // Gửi các phần còn lại (nếu có) dưới dạng tin nhắn thường
      for (let i = 1; i < safeParts.length; i++) {
        await message.channel.send(safeParts[i]);
      }

      // Nếu có tìm kiếm web, gửi embed kết quả
      if (searchPerformed && searchData && searchData.results.length > 0) {
        const searchEmbed = new EmbedBuilder()
          .setColor(0x00ae86)
          .setTitle('🔍 Nguồn tham khảo')
          .setDescription(
            searchData.results
              .slice(0, 3)
              .map(
                (r, i) =>
                  `${i + 1}. [${r.title}](${r.url})`
              )
              .join('\n')
          )
          .setFooter({ text: 'Kết quả từ tìm kiếm web' })
          .setTimestamp();

        await message.channel.send({ embeds: [searchEmbed] });
      }

      // Cập nhật trạng thái bot hiển thị token đã sử dụng của kênh
      try {
        const { updatePresence } = require('./ready');
        await updatePresence(client, message.channel.id);
      } catch (err) {
        logger.debug(`Lỗi cập nhật status bot: ${err.message}`);
      }

      const channelLabel = isDM ? 'DM' : `#${message.channel.name}`;
      logger.discord(
        `${message.author.tag} tại ${channelLabel}: "${userContent.substring(0, 80)}${userContent.length > 80 ? '...' : ''}"`
      );
    } catch (error) {
      logger.error(`Lỗi xử lý tin nhắn: ${error.message}`);
      logger.debug(error.stack);

      // Gửi thông báo lỗi cho người dùng
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Đã xảy ra lỗi')
        .setDescription(
          'Xin lỗi, đã có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.'
        )
        .addFields({
          name: 'Chi tiết',
          value: `\`\`\`${error.message.substring(0, 200)}\`\`\``,
        })
        .setTimestamp();

      try {
        await message.reply({ embeds: [errorEmbed] });
      } catch (replyError) {
        logger.error(`Không thể gửi thông báo lỗi: ${replyError.message}`);
      }
    }
  },
};
