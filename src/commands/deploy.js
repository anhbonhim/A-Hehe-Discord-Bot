// Script đăng ký slash commands với Discord API
// Chạy: node src/commands/deploy.js
// Cần chạy mỗi khi thêm/sửa/xoá slash commands

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Tải biến môi trường
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

// Kiểm tra biến môi trường bắt buộc
if (!token) {
  console.error('❌ Lỗi: DISCORD_TOKEN chưa được cấu hình trong file .env');
  process.exit(1);
}

if (!clientId) {
  console.error('❌ Lỗi: CLIENT_ID chưa được cấu hình trong file .env');
  process.exit(1);
}

/**
 * Đăng ký slash commands globally
 */
async function deployCommands() {
  const commands = [];
  const commandsPath = __dirname;

  // Đọc tất cả file command (trừ deploy.js)
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js') && file !== 'deploy.js');

  console.log('📦 Đang tải commands...\n');

  for (const file of commandFiles) {
    try {
      const command = require(path.join(commandsPath, file));

      if (command.data) {
        commands.push(command.data.toJSON());
        console.log(`   ✅ Đã tải: /${command.data.name}`);
      } else {
        console.warn(`   ⚠️ Bỏ qua ${file}: thiếu thuộc tính "data"`);
      }
    } catch (error) {
      console.error(`   ❌ Lỗi tải ${file}: ${error.message}`);
    }
  }

  console.log(`\n📡 Đang đăng ký ${commands.length} commands với Discord API...\n`);

  // Khởi tạo REST client
  const rest = new REST({ version: '10' }).setToken(token);

  try {
    // Đăng ký commands globally (tất cả servers)
    const data = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    console.log(`✅ Đã đăng ký thành công ${data.length} slash command(s)!\n`);
    console.log('📋 Danh sách commands đã đăng ký:');
    data.forEach((cmd) => {
      console.log(`   • /${cmd.name} - ${cmd.description}`);
    });
    console.log('\n💡 Lưu ý: Commands có thể mất đến 1 giờ để cập nhật trên tất cả servers.');
  } catch (error) {
    console.error(`❌ Lỗi đăng ký commands: ${error.message}`);

    if (error.status === 401) {
      console.error('   Token không hợp lệ. Vui lòng kiểm tra DISCORD_TOKEN.');
    } else if (error.status === 403) {
      console.error('   Bot không có quyền. Vui lòng kiểm tra CLIENT_ID và permissions.');
    }

    process.exit(1);
  }
}

// Chạy script
deployCommands();
