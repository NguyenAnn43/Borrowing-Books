# 🚀 Setup Guide - Borrowing Books

## Prerequisites

- Node.js >= 20.0.0
- npm hoặc pnpm
- MongoDB (local hoặc Atlas account)

---

## 📦 Installation

### 1. Clone project
```bash
git clone <repository-url>
cd Borrowing-Books
```

### 2. Install dependencies
```bash
# Install tất cả dependencies cho monorepo
npm install
Error: Error: Lexical error on line 7:. Unrecognized text.
...ipant DB;    Actor->>UI: Selects Updat
---------------------^
# Hoặc dùng pnpm
pnpm install
```

---

## 🔧 Backend Setup

### 1. Tạo file .env
```bash
cd server
cp .env.example .env
```

### 2. Cấu hình MongoDB

**Option A: MongoDB Atlas (Khuyên dùng cho team)**

1. Đăng ký tài khoản tại: https://www.mongodb.com/cloud/atlas/register
2. Tạo FREE cluster (M0)
3. Tạo Database User:
   - Username: `admin`
   - Password: `<tạo password mạnh>`
4. Network Access: Add IP `0.0.0.0/0` (allow all - chỉ cho dev)
5. Lấy connection string từ "Connect" → "Connect your application"
6. Cập nhật file `.env`:

```env
MONGODB_URI=mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/borrowing_books?retryWrites=true&w=majority
```

**Option B: MongoDB Local**

```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Linux
sudo apt-get install mongodb
sudo systemctl start mongod

# Windows: Download từ mongodb.com
```

File `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/borrowing_books
```

### 3. Cập nhật các biến môi trường khác

File `server/.env`:
```env
NODE_ENV=development
PORT=5001

MONGODB_URI=<your-mongodb-uri>

JWT_SECRET=your_super_secret_key_change_this_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_key_change_this
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:3000

# Cloudinary (Optional - for image upload)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

LOG_LEVEL=debug
```

### 4. Chạy backend
```bash
cd server
pnpm dev
```

Server sẽ chạy tại: http://localhost:5001

API Docs: http://localhost:5001/api-docs

---

## 🎨 Frontend Setup

### 1. Tạo file .env.local
```bash
cd client
cp .env.example .env.local
```

### 2. Cập nhật API URL
File `client/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_APP_NAME="Borrowing Books"
NEXT_PUBLIC_APP_DESCRIPTION="Inter-Library Management System"
```

### 3. Chạy frontend
```bash
cd client
pnpm dev
```

Frontend sẽ chạy tại: http://localhost:3000

---

## 👥 Team Collaboration với MongoDB

### Cách 1: Share MongoDB Atlas (Khuyên dùng)

1. **Người tạo cluster**:
   - Setup MongoDB Atlas như hướng dẫn trên
   - Share connection string với team (qua Discord/Slack - KHÔNG commit vào Git)

2. **Team members**:
   - Clone repo
   - Tạo file `.env` riêng
   - Paste connection string đã nhận được
   - Chạy `pnpm dev`

**Ưu điểm**:
- ✅ Tất cả cùng làm việc với 1 database
- ✅ Sync data real-time
- ✅ Miễn phí (512MB)

### Cách 2: Mỗi người setup MongoDB local

1. Mỗi người install MongoDB local
2. Mỗi người có database riêng
3. Seed data riêng

**Ưu điểm**:
- ✅ Không phụ thuộc internet
- ✅ Test được offline

**Nhược điểm**:
- ❌ Không share data
- ❌ Phải seed data mỗi lần

---

## 🔐 Security Notes

### ⚠️ QUAN TRỌNG

**KHÔNG BAO GIỜ commit các file sau vào Git**:
- `.env`
- `.env.local`
- `node_modules/`

Các file này đã được thêm vào `.gitignore`.

**Khi làm việc nhóm**:
- Share connection string qua channel private (Discord, Slack, etc.)
- KHÔNG paste vào Pull Request, Issues, hoặc comments
- Mỗi người giữ `.env` cục bộ trên máy

---

## 🧪 Testing

```bash
# Backend tests
cd server
pnpm test

# Frontend tests
cd client
pnpm test
```

---

## 🐛 Troubleshooting

### Port already in use

**Lỗi**: `Error: listen EADDRINUSE: address already in use :::5000`

**Fix**:
```bash
# Kill process trên port 5000
lsof -ti:5000 | xargs kill -9

# Hoặc đổi PORT trong .env
PORT=5001
```

### MongoDB connection failed

**Lỗi**: `MongooseServerSelectionError: connect ECONNREFUSED`

**Fix**:
- Kiểm tra MongoDB đã chạy chưa: `brew services list` (macOS)
- Kiểm tra connection string trong `.env` đúng chưa
- Nếu dùng Atlas: Kiểm tra IP whitelist và database user/password

### TypeScript errors

```bash
cd server
pnpm build
```

Nếu có lỗi, check lại các import và types.

---

## 📚 Next Steps

1. ✅ Setup MongoDB
2. ✅ Chạy backend + frontend
3. ✅ Test API tại http://localhost:5001/api-docs
4. 📖 Đọc [API Documentation](./docs/api/README.md)
5. 📖 Đọc [Architecture](./docs/architecture/README.md)
6. 🔨 Bắt đầu development!

---

## 📞 Support

Nếu gặp vấn đề, check:
- [Issues](./issues) trên GitHub
- File `.agent/rules.md` để hiểu structure
- Workflows trong `.agent/workflows/`
