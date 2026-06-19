// Lệnh /search - Tìm kiếm thông tin trên web
// Hiển thị kết quả dưới dạng embed đẹp mắt

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { search } = require('../services/webSearch');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Tìm kiếm thông tin trên web')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Từ khoá tìm kiếm')
        .setRequired(true)
    ),

  /**
   * Thực thi lệnh /search
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    const query = interaction.options.getString('query');

    // Defer reply để có thêm thời gian xử lý
    await interaction.deferReply();

    try {
      logger.info(`Tìm kiếm từ lệnh /search: "${query}"`);

      // Thực hiện tìm kiếm
      const searchResult = await search(query, 5);

      // Tạo embed kết quả
      const embed = new EmbedBuilder()
        .setColor(0x00ae86)
        .setTitle(`🔍 Kết quả tìm kiếm: "${query}"`)
        .setTimestamp()
        .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}` });

      // Thêm tóm tắt nếu có
      if (searchResult.answer) {
        embed.setDescription(
          searchResult.answer.length > 400
            ? searchResult.answer.substring(0, 400) + '...'
            : searchResult.answer
        );
      }

      // Thêm từng kết quả
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

      await interaction.editReply({ embeds: [embed] });

      logger.discord(`${interaction.user.tag} dùng /search: "${query}"`);
    } catch (error) {
      logger.error(`Lỗi lệnh /search: ${error.message}`);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Lỗi tìm kiếm')
        .setDescription('Không thể thực hiện tìm kiếm. Vui lòng thử lại sau.')
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
