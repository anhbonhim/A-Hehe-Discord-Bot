// Lệnh /model - Xem hoặc thay đổi model AI và mức độ suy luận
// Hỗ trợ thay đổi model và reasoning effort động

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getModelInfo, setModel, setReasoningEffort } = require('../services/aiService');
const logger = require('../utils/logger');

// Nhãn hiển thị tiếng Việt cho reasoning effort
const REASONING_LABELS = {
  auto: 'Tự động (model tự quyết định)',
  low: 'Thấp — tốc độ nhanh, tiết kiệm',
  medium: 'Trung bình',
  high: 'Cao — suy luận sâu sắc',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('model')
    .setDescription('Xem hoặc thay đổi model AI và mức độ suy luận')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('Tên model mới (ví dụ: openai/gpt-oss-120b, google/gemini-2.5-pro)')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('reasoning')
        .setDescription('Mức độ suy luận của model')
        .setRequired(false)
        .addChoices(
          { name: 'Auto — Model tự quyết định', value: 'auto' },
          { name: 'Low — Nhanh, tiết kiệm', value: 'low' },
          { name: 'Medium — Cân bằng', value: 'medium' },
          { name: 'High — Suy luận sâu sắc', value: 'high' }
        )
    ),

  /**
   * Thực thi lệnh /model
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const newModelName = interaction.options.getString('name');
    const newReasoning = interaction.options.getString('reasoning');

    // Nếu có thay đổi (model hoặc reasoning hoặc cả hai)
    if (newModelName || newReasoning) {
      const changes = [];
      const oldInfo = getModelInfo();

      if (newModelName) {
        setModel(newModelName);
        changes.push(`Model: \`${oldInfo.name}\` → \`${newModelName}\``);
      }

      if (newReasoning) {
        const oldLabel = REASONING_LABELS[oldInfo.reasoningEffort] || oldInfo.reasoningEffort;
        setReasoningEffort(newReasoning);
        const newLabel = REASONING_LABELS[newReasoning];
        changes.push(`Reasoning: ${oldLabel} → **${newLabel}**`);
      }

      const updatedInfo = getModelInfo();

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('Đã cập nhật cấu hình AI')
        .addFields(
          {
            name: 'Thay đổi',
            value: changes.join('\n'),
          },
          {
            name: 'Cấu hình hiện tại',
            value:
              `Model: \`${updatedInfo.name}\`\n` +
              `Context: ${updatedInfo.maxContextTokens.toLocaleString()} tokens\n` +
              `Max response: ${updatedInfo.maxResponseTokens.toLocaleString()} tokens\n` +
              `Temperature: ${updatedInfo.temperature}\n` +
              `Reasoning: **${REASONING_LABELS[updatedInfo.reasoningEffort] || updatedInfo.reasoningEffort}**`,
          }
        )
        .setTimestamp()
        .setFooter({ text: `Thay đổi bởi ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });

      logger.discord(
        `${interaction.user.tag} cập nhật cấu hình: ${changes.join('; ')}`
      );
    } else {
      // Hiển thị thông tin model hiện tại
      const info = getModelInfo();
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
            name: 'Cách dùng',
            value:
              '`/model name:<tên_model>` — đổi model\n' +
              '`/model reasoning:<auto|low|medium|high>` — đổi mức suy luận\n' +
              'Danh sách model: https://openrouter.ai/models',
          }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};
