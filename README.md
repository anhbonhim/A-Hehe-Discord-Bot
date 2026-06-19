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

## 📝 Cách tương tác và Danh sách lệnh

Bot hỗ trợ song song hai cách tương tác: qua **Tương tác trực tiếp bằng tin nhắn** (tag bot `@hehe`, nhắn prefix `!ai`, hoặc nhắn trực tiếp trong DM) hoặc **Slash Commands (/)**.

### 💬 Tương tác bằng tin nhắn chat (Khuyên dùng)

Bạn chỉ cần nhắn tin (tag bot `@hehe` hoặc gõ prefix `!ai` hoặc nhắn tin trong DM) kèm nội dung mong muốn, bot sẽ tự động nhận diện ý định của bạn:

| Yêu cầu của bạn | Ví dụ tin nhắn | Hành động của Bot |
|-----------------|-------|-------------------|
| **Hỏi AI thông thường** | `@hehe Giải thích lý thuyết tương đối` | Trả lời câu hỏi kèm ngữ cảnh hội thoại cũ |
| **Xoá lịch sử hội thoại** | `@hehe clear` hoặc `@hehe xóa lịch sử` | Xoá bộ nhớ hội thoại của kênh hiện tại |
| **Xem thông tin model** | `@hehe model` hoặc `@hehe xem mô hình` | Hiển thị thông số chi tiết model hiện tại |
| **Đổi model AI** | `@hehe đổi model google/gemini-2.5-pro` | Đổi model chính sang model bất kỳ trên OpenRouter |
| **Đổi mức suy luận** | `@hehe đổi reasoning high` | Thay đổi mức độ suy luận (`auto`/`low`/`medium`/`high`) |
| **Tìm kiếm web trực tiếp** | `@hehe tìm kiếm tin tức công nghệ mới nhất` | Tìm kiếm Google/Tavily và trả về danh sách link nguồn |
| **Đọc ảnh/tài liệu** | Gửi kèm ảnh/tài liệu + tag `@hehe` | Đọc nội dung PDF/DOCX/TXT hoặc mô tả hình ảnh đính kèm |
| **Ảnh Anime dễ thương** | `@hehe waifu` hoặc `@hehe ôm` | Trả về ảnh anime ngẫu nhiên theo hành động (nekos.best) |
| **Ảnh Anime 18+** | `@hehe xwaifu` hoặc `@hehe xneko` | Trả về ảnh anime 18+ ngẫu nhiên (chỉ hoạt động trong kênh NSFW) |

### ⚡ Slash Commands (/)

Nếu thích, bạn vẫn có thể sử dụng các lệnh slash truyền thống:

| Lệnh | Mô tả |
|-------|--------|
| `/ask prompt:<câu hỏi>` | Hỏi AI (hỗ trợ tùy chọn gửi ẩn tin nhắn `private: true`) |
| `/search query:<từ khoá>` | Tìm kiếm trực tiếp thông tin trên web |
| `/model` | Xem hoặc thay đổi model AI và mức độ suy luận |
| `/clear` | Xoá lịch sử hội thoại để bắt đầu lại cuộc trò chuyện mới |

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
