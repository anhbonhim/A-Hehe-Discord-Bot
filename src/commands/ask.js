// Lệnh /ask - Hỏi AI một câu hỏi thông qua slash command
// Hỗ trợ tuỳ chọn hiển thị riêng tư (ephemeral)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { simpleChat } = require('../services/aiService');
const conversationManager = require('../services/conversationManager');
const { chat } = require('../services/aiService');
const { getToolDefinitions, executeTool } = require('../services/toolManager');
const splitMessage = require('../utils/splitMessage');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Hỏi AI một câu hỏi')
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('Câu hỏi của bạn')
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName('private')
        .setDescription('Chỉ hiển thị cho bạn (mặc định: không)')
        .setRequired(false)
    ),

  /**
   * Thực thi lệnh /ask
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const prompt = interaction.options.getString('prompt');
    const isPrivate = interaction.options.getBoolean('private') || false;

    // Defer reply để có thêm thời gian xử lý
    await interaction.deferReply({ ephemeral: isPrivate });

    try {
      // Xây dựng messages với lịch sử hội thoại
      const messages = conversationManager.buildMessages(
        interaction.channelId,
        prompt
      );

      // Gọi AI với tool support
      const tools = getToolDefinitions();
      let response = await chat(messages, tools);
      let assistantMessage = response.choices[0]?.message;

      // Xử lý tool calls (tối đa 5 vòng)
      let iterations = 0;
      while (
        assistantMessage?.tool_calls &&
        assistantMessage.tool_calls.length > 0 &&
        iterations < 5
      ) {
        iterations++;

        // Thêm assistant message với tool calls
        messages.push({
          role: 'assistant',
          content: assistantMessage.content || null,
          tool_calls: assistantMessage.tool_calls,
        });

        // Thực thi tools
        for (const toolCall of assistantMessage.tool_calls) {
          const result = await executeTool(toolCall);
          messages.push({
            role: 'tool',
            tool_call_id: result.toolCallId,
            content: result.result,
          });
        }

        // Gọi AI lại
        response = await chat(messages, tools);
        assistantMessage = response.choices[0]?.message;
      }

      const responseText =
        assistantMessage?.content || 'Không có phản hồi từ AI.';

      // Lưu vào lịch sử hội thoại
      conversationManager.saveMessages(
        interaction.channelId,
        prompt,
        responseText
      );

      // Chia nhỏ nếu cần
      const parts = splitMessage(responseText);

      // Gửi phần đầu tiên qua editReply
      await interaction.editReply(parts[0]);

      // Gửi các phần còn lại qua followUp
      for (let i = 1; i < parts.length; i++) {
        await interaction.followUp({ content: parts[i], ephemeral: isPrivate });
      }

      logger.discord(`${interaction.user.tag} dùng /ask: "${prompt.substring(0, 50)}..."`);
    } catch (error) {
      logger.error(`Lỗi lệnh /ask: ${error.message}`);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Lỗi')
        .setDescription('Không thể xử lý câu hỏi. Vui lòng thử lại sau.')
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
