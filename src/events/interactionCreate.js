// Sự kiện interactionCreate - Xử lý slash commands
// Điều hướng interaction đến command handler tương ứng

const logger = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',

  /**
   * Xử lý interaction (slash command)
   * @param {import('discord.js').Interaction} interaction - Discord interaction
   * @param {import('discord.js').Client} client - Discord client
   */
  async execute(interaction, client) {
    // Chỉ xử lý chat input commands (slash commands)
    if (!interaction.isChatInputCommand()) return;

    // Tìm command trong collection
    if (!client.commands) {
      logger.warn(`Lệnh slash được gọi nhưng client.commands không được định nghĩa.`);
      await interaction.reply({
        content: '❌ Bot hiện không hỗ trợ các lệnh slash (/) trực tiếp.',
        ephemeral: true,
      });
      return;
    }

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Không tìm thấy lệnh: ${interaction.commandName}`);
      await interaction.reply({
        content: '❌ Lệnh không tồn tại hoặc chưa được đăng ký.',
        ephemeral: true,
      });
      return;
    }

    try {
      logger.discord(
        `${interaction.user.tag} sử dụng lệnh: /${interaction.commandName}`
      );

      // Thực thi command
      await command.execute(interaction, client);
    } catch (error) {
      logger.error(
        `Lỗi thực thi lệnh /${interaction.commandName}: ${error.message}`
      );
      logger.debug(error.stack);

      // Gửi thông báo lỗi cho người dùng
      const errorMessage = {
        content: '❌ Đã xảy ra lỗi khi thực thi lệnh. Vui lòng thử lại sau.',
        ephemeral: true,
      };

      try {
        // Kiểm tra xem interaction đã được reply hay defer chưa
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      } catch (replyError) {
        logger.error(`Không thể gửi thông báo lỗi: ${replyError.message}`);
      }
    }
  },
};
