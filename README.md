# 🤖 Discord AI Bot

Bot Discord AI đa năng tích hợp mô hình **GPT-OSS 120B** (qua OpenRouter) kết hợp cơ chế **2-Stage Routing**, tra cứu web thời gian thực, đọc hiểu tài liệu, phân tích hình ảnh và tích hợp bộ công cụ gửi ảnh Anime an toàn.

---

## ✨ Tính năng chính

- 🧠 **Cơ chế 2-Stage Routing**:
  - **Tầng 1 (AI Router - `gpt-oss-20b`)**: Nhận diện ý định và tự động ánh xạ lệnh hệ thống (xóa lịch sử, đổi mức suy luận, gửi ảnh anime...) theo loại kênh (SFW/NSFW).
  - **Tầng 2 (Model chính - `gpt-oss-120b`)**: Trò chuyện tự nhiên, suy luận sâu sắc (sử dụng reasoning effort tùy chỉnh).
- 🔍 **Tìm kiếm web thời gian thực**: Tra cứu thông tin mới nhất qua Tavily API hoặc DuckDuckGo.
- 🖼️ **Phân tích hình ảnh (Vision)**: Nhận diện vật thể, OCR chữ viết qua Google Gemini 2.5 Flash API hoặc OpenRouter Vision.
- 📄 **Trích xuất tài liệu**: Đọc và phân tích nội dung các tệp đính kèm (PDF, DOCX, TXT...).
- 🎴 **Gửi ảnh Anime thông minh**:
  - Tích hợp 54 danh mục tĩnh chất lượng cao từ Nekobot API & nekos.best.
  - Hỗ trợ tìm kiếm động (Web Search Fallback) khi yêu cầu nhân vật/chủ đề cụ thể (như `luffy`, `rem`).
  - **NSFW Guard kép**: Lọc từ khóa nhạy cảm trên kênh thường và chặn gửi ảnh người lớn cấp mã nguồn (code-level) nếu kênh không phải NSFW.
- 💬 **Lịch sử hội thoại & Trạng thái động**: Tự động lưu ngữ cảnh theo kênh và hiển thị thông số hoạt động của bot thời gian thực.

---

## 🚀 Cài đặt & Khởi chạy

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu hình biến môi trường
Tạo tệp `.env` từ `.env.example` và thiết lập các biến sau:
```env
DISCORD_TOKEN=your_discord_bot_token
OPENROUTER_API_KEY=your_openrouter_api_key
GEMINI_API_KEY=your_gemini_api_key (tùy chọn - dùng cho Vision)
TAVILY_API_KEY=your_tavily_api_key (tùy chọn - dùng cho Web Search)
```

### 3. Chạy bot
- Chế độ Production: `npm start`
- Chế độ Development: `npm run dev`

---

## 📋 Danh sách Lệnh Hệ thống (Stage 1)

Bot tự động nhận diện ý định trò chuyện bằng ngôn ngữ tự nhiên (không cần slash command):

| Lệnh / Ý định | Ví dụ tin nhắn | Mô tả hành động |
|---|---|---|
| **Trò chuyện AI** | `@bot giải thích thuyết tương đối` | Chuyển tiếp thẳng tới model chính (Stage 2) |
| **Xoá lịch sử** | `@bot xóa lịch sử chat` / `quên hết đi` | Làm sạch ngữ cảnh hội thoại của kênh hiện tại |
| **Thông tin model** | `@bot xem mô hình đang chạy` | Hiển thị thông số cấu hình model AI của bot |
| **Đổi suy luận** | `@bot đổi reasoning sang high` | Đổi mức suy luận của AI (`auto`/`low`/`medium`/`high`) |
| **Trợ giúp** | `@bot hướng dẫn sử dụng` / `help` | Hiển thị menu trợ giúp và danh sách danh mục ảnh |
| **Tra cứu tin tức** | `@bot tìm kiếm thời tiết hôm nay` | Tra cứu thông tin thời gian thực từ web |
| **Ảnh Anime tĩnh** | `@bot waifu` / `@bot ôm` / `@bot neko` | Gửi ảnh anime tương ứng từ Nekobot & nekos.best |
| **Ảnh Anime động** | `@bot gửi ảnh luffy` / `@bot ảnh rem` | Tìm kiếm động từ internet làm fallback (SFW/NSFW tương ứng) |

---

## 🏗️ Cấu trúc dự án

```
src/
├── index.js              # Khởi chạy và thiết lập bot
├── config.js             # Cấu hình tập trung (.env)
├── events/
│   ├── ready.js          # Sự kiện bot online & cập nhật status
│   └── messageCreate.js  # Luồng xử lý tin nhắn & 2-Stage Routing
├── services/
│   ├── aiService.js      # Giao tiếp API OpenRouter
│   ├── animeImage.js     # Điều phối gửi ảnh Anime tĩnh & động
│   ├── documentParser.js # Trích xuất văn bản tài liệu
│   ├── imageAnalyzer.js  # Phân tích hình ảnh (Vision)
│   ├── toolManager.js    # Quản lý tool call và AI Router
│   └── webSearch.js      # Công cụ tìm kiếm web & ảnh động (DDG custom scraper)
└── utils/
    ├── logger.js         # Ghi log console có màu sắc
    └── splitMessage.js   # Chia nhỏ tin nhắn vượt giới hạn Discord
```
