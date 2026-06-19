// Lệnh /clear - Xoá lịch sử hội thoại của kênh hiện tại
// Giải phóng bộ nhớ và bắt đầu cuộc trò chuyện mới

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const conversationManager = require('../services/conversationManager');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Xoá lịch sử hội thoại'),

  /**
   * Thực thi lệnh /clear
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    // Xoá lịch sử hội thoại của kênh hiện tại
    const hadHistory = conversationManager.clearHistory(interaction.channelId);

    // Lấy thống kê sau khi xoá
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
      .setFooter({ text: `Thực hiện bởi ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });

    // Cập nhật trạng thái bot để hiển thị token đã reset
    try {
      const { updatePresence } = require('../events/ready');
      await updatePresence(client, interaction.channelId);
    } catch (err) {
      logger.debug(`Lỗi cập nhật status bot sau khi clear: ${err.message}`);
    }

    logger.discord(`${interaction.user.tag} xoá lịch sử tại #${interaction.channel?.name || interaction.channelId}`);
  },
};
