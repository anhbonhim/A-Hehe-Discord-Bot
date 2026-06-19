# 🤖 Discord AI Bot — GPT-OSS 120B

> Bot Discord AI thông minh sử dụng **GPT-OSS 120B** qua OpenRouter với khả năng suy luận mạnh mẽ, tìm kiếm web thời gian thực, và phân tích file đính kèm.

---

## ✨ Tính năng

- 🧠 **Suy luận mạnh mẽ** — Sử dụng GPT-OSS 120B với reasoning effort tuỳ chỉnh
- 🔍 **Tìm kiếm web thời gian thực** — Tích hợp Tavily API & DuckDuckGo
- 🖼️ **Phân tích hình ảnh (Độ chính xác cao)** — Sử dụng trực tiếp API Google Gemini 2.5/3.5 Flash để đọc chữ (OCR) và nhận diện game/vật thể, tự động fallback về OpenRouter Vision (Nemotron VL) nếu không có key
- 🌸 **Random ảnh Anime** — Tự động gửi ảnh Waifu hoặc hành động khi nhắc đến từ khóa (SFW qua nekos.best API, NSFW qua nekobot.xyz API)
- 📄 **Đọc tài liệu** — Hỗ trợ PDF, DOCX, TXT, và nhiều định dạng text
- 💬 **Lịch sử hội thoại** — Nhớ ngữ cảnh cuộc trò chuyện theo từng kênh
- 📊 **Trạng thái động** — Trạng thái hoạt động (Custom Status) của bot hiển thị tên model, số token đã dùng / dung lượng context window của kênh hoạt động gần nhất, và số credit OpenRouter còn lại theo thời gian thực
- 🛠️ **Function Calling** — AI tự động sử dụng công cụ khi cần (tìm kiếm, tính toán, xem giờ)
- ⚡ **Slash Commands & Tương tác tự nhiên** — Hỗ trợ Slash commands, prefix `!ai`, tag bot `@hehe` hoặc trả lời tin nhắn (reply) của bot
- 🔄 **Đổi model linh hoạt** — Chuyển đổi model AI bất kỳ trên OpenRouter

---

## 📋 Yêu cầu

- **Node.js** v18.0.0 trở lên
- **Discord Bot Token** — [Tạo tại Discord Developer Portal](https://discord.com/developers/applications)
- **OpenRouter API Key** — [Lấy tại OpenRouter](https://openrouter.ai/keys)
- **Google Gemini API Key** *(tuỳ chọn nhưng khuyến khích)* — [Lấy tại Google AI Studio](https://aistudio.google.com/app/apikey) để nhận diện hình ảnh chất lượng cao
- **Tavily API Key** *(tuỳ chọn)* — [Đăng ký tại Tavily](https://tavily.com)

---

## 🚀 Hướng dẫn cài đặt

### 1. Clone repository

```bash
git clone https://github.com/your-username/discord-ai-bot.git
cd discord-ai-bot
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình biến môi trường

```bash
cp .env.example .env
```

Mở file `.env` và điền các giá trị:

```env
DISCORD_TOKEN=your_discord_bot_token_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
CLIENT_ID=your_client_id_here
GEMINI_API_KEY=your_gemini_api_key_here (nếu muốn dùng Vision xịn)
```

### 4. Tạo Discord Bot

1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications)
2. Nhấn **New Application** → đặt tên → **Create**
3. Vào tab **Bot** → nhấn **Reset Token** → sao chép token
4. Bật **MESSAGE CONTENT INTENT** trong phần Privileged Gateway Intents
5. Vào tab **OAuth2** → sao chép **Client ID**
6. Tạo invite link:
   - OAuth2 → URL Generator
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Read Message History`, `Embed Links`, `Attach Files`, `Use Slash Commands`

### 5. Lấy OpenRouter API Key

1. Truy cập [OpenRouter](https://openrouter.ai)
2. Đăng ký/đăng nhập
3. Vào [API Keys](https://openrouter.ai/keys) → tạo key mới
4. Sao chép key vào file `.env`

### 6. Đăng ký Slash Commands

```bash
npm run deploy-commands
```

### 7. Khởi động bot

```bash
npm start
```

Hoặc chạy ở chế độ development (tự restart khi code thay đổi):

```bash
npm run dev
```

---

## 📝 Danh sách lệnh

### Prefix Commands

| Lệnh/Keyword | Mô tả |
|-------|--------|
| `!ai <câu hỏi>` | Hỏi AI một câu hỏi |
| `@Bot <câu hỏi>` | Mention bot kèm câu hỏi |
| `!ai` + đính kèm ảnh | Phân tích hình ảnh (Sử dụng Gemini API/OpenRouter) |
| `!ai` + đính kèm file | Đọc và phân tích tài liệu |
| Thao tác **Reply** bot | Trả lời tin nhắn bất kỳ của bot (bot tự nhớ context) |
| Keyword **waifu / hug / pat / kiss / slap ...** | Tự động trả về hình ảnh anime SFW ngẫu nhiên kèm hành động tương ứng |
| Keyword **xwaifu / xneko / xtrap / xgif** | Tự động trả về hình ảnh anime NSFW (18+) tương ứng (Chỉ dùng được trong kênh NSFW) |

### Slash Commands

| Lệnh | Mô tả |
|-------|--------|
| `/ask prompt:<câu hỏi>` | Hỏi AI (hỗ trợ chế độ riêng tư) |
| `/search query:<từ khoá>` | Tìm kiếm thông tin trên web |
| `/model` | Xem thông tin model AI hiện tại |
| `/model name:<tên>` | Thay đổi model AI |
| `/clear` | Xoá lịch sử hội thoại |

---

## ⚙️ Cấu hình

| Biến môi trường | Mô tả | Mặc định |
|-----------------|--------|----------|
| `DISCORD_TOKEN` | Token của Discord bot | *(bắt buộc)* |
| `OPENROUTER_API_KEY` | API key của OpenRouter | *(bắt buộc)* |
| `CLIENT_ID` | Client ID của Discord app | *(bắt buộc)* |
| `GEMINI_API_KEY` | API key Google Gemini để nhận diện ảnh | *(tuỳ chọn)* |
| `AI_MODEL` | Model AI sử dụng chính | `openai/gpt-oss-120b` |
| `VISION_MODEL` | Model vision dự phòng trên OpenRouter | `nvidia/nemotron-nano-12b-v2-vl:free` |
| `REASONING_EFFORT` | Mức độ suy luận (low/medium/high) | `high` |
| `BOT_PREFIX` | Tiền tố lệnh | `!ai` |
| `TAVILY_API_KEY` | API key Tavily cho tìm kiếm | *(tuỳ chọn)* |

---

## 🏗️ Kiến trúc dự án

```
discord-ai-bot/
├── .env.example          # Mẫu biến môi trường
├── package.json          # Dependencies và scripts
├── README.md             # Tài liệu hướng dẫn
└── src/
    ├── index.js          # Điểm khởi đầu - khởi tạo bot
    ├── config.js         # Cấu hình tập trung
    ├── commands/         # Slash commands
    │   ├── ask.js        # Lệnh /ask
    │   ├── search.js     # Lệnh /search
    │   ├── model.js      # Lệnh /model
    │   ├── clear.js      # Lệnh /clear
    │   └── deploy.js     # Script đăng ký commands
    ├── events/           # Event handlers
    │   ├── ready.js      # Sự kiện bot sẵn sàng
    │   ├── messageCreate.js  # Xử lý tin nhắn
    │   └── interactionCreate.js  # Xử lý slash commands
    ├── services/         # Business logic
    │   ├── aiService.js          # Gọi AI qua OpenRouter
    │   ├── conversationManager.js # Quản lý lịch sử hội thoại
    │   ├── webSearch.js          # Tìm kiếm web
    │   ├── imageAnalyzer.js      # Phân tích hình ảnh
    │   ├── documentParser.js     # Trích xuất nội dung tài liệu
    │   └── toolManager.js        # Quản lý function calling
    └── utils/            # Tiện ích
        ├── logger.js     # Ghi log với màu sắc
        └── splitMessage.js # Chia nhỏ tin nhắn dài
```

---

## 🔧 Xử lý sự cố

### Bot không phản hồi

1. Kiểm tra bot đã online (xanh lá) trên Discord
2. Đảm bảo **MESSAGE CONTENT INTENT** đã bật trong Developer Portal
3. Kiểm tra bot có quyền đọc/gửi tin nhắn trong kênh
4. Xem log console để tìm lỗi

### Lỗi "Invalid Token"

- Kiểm tra `DISCORD_TOKEN` trong file `.env`
- Token có thể đã bị reset → tạo token mới trên Developer Portal

### Lỗi "401 Unauthorized" từ OpenRouter

- Kiểm tra `OPENROUTER_API_KEY` trong file `.env`
- Đảm bảo API key còn hiệu lực và có đủ credit

### Slash commands không hiện

- Chạy lại `npm run deploy-commands`
- Đợi tối đa 1 giờ để Discord cập nhật
- Kiểm tra `CLIENT_ID` có đúng không

### Lỗi "Missing Permissions"

- Mời lại bot với đầy đủ permissions
- Kiểm tra role của bot trong server settings

---

## 📄 Giấy phép

Dự án này được phát hành theo giấy phép [MIT](LICENSE).

---

<p align="center">
  Made with ❤️ using <strong>Discord.js v14</strong> & <strong>OpenRouter</strong>
</p>
