# 📚 Borrowing Books - Inter-Library Management System

Hệ thống quản lý mượn sách liên trường, cho phép người dùng tìm kiếm và mượn sách từ nhiều thư viện khác nhau trong mạng lưới.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | **Next.js 14**, Tailwind CSS, Zustand, React Query, **Vitest** (Test) |
| **Backend** | **Node.js**, **Express.js**, **TypeScript**, Zod, **Vitest** (Test) |
| **Database** | **MongoDB Atlas**, Mongoose (ODM) |
| **DevOps** | **GitHub Actions** (CI/CD), Docker (Planned) |
| **Authentication** | JWT, HttpOnly Cookies |

## 📁 Project Structure

```bash
Borrowing-Books/
├── client/          # Frontend (Next.js 14 + TypeScript)
├── server/          # Backend (Express + TypeScript)
├── shared/          # Shared code (Types, Constants)
├── docs/            # Documentation (API, Architecture)
├── .agent/          # 🤖 AI Rules & Workflows (QUAN TRỌNG)
├── .github/         # CI/CD Workflows
└── package.json     # Monorepo configuration
```

## 🤖 AI-Driven Workflow (Dành cho Team)

Dự án này được thiết kế để làm việc tối ưu với AI Assistants (Cursor, Copilot, Cline...).

> [!IMPORTANT]
> **Vui lòng đọc kỹ Folder `.agent/` trước khi code!**

1.  **Rules (`.agent/rules.md`)**: Chứa "Luật chơi" của dự án (Convention, Architecture, Security). AI của bạn sẽ tự động đọc file này để code đúng chuẩn.
2.  **Workflows (`.agent/workflows/`)**: Hướng dẫn AI thực hiện các tác vụ cụ thể:
    - Tạo Feature mới: Xem `create-feature.md`
    - Tạo API mới: Xem `create-api.md`
    - Debug lỗi: Xem `debugging.md`

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- MongoDB Account (Atlas)

### Installation

```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment variables
cp server/.env.example server/.env
cp client/.env.example client/.env.local
# -> Cập nhật MongoDB URI trong server/.env

# 3. Development
pnpm dev
# Server: http://localhost:5001
# Client: http://localhost:3000
```

### Testing & CI

Dự án sử dụng **Vitest** và **GitHub Actions**.

```bash
# Run all tests
pnpm test

# Lint code
pnpm lint
```

## 👥 Roles & Permissions

| Role | Code | Description |
|------|------|-------------|
| Admin | `admin` | Quản trị toàn hệ thống |
| Librarian | `librarian` | Quản lý sách, xác nhận mượn/trả |
| User | `user` | Độc giả, sinh viên (mượn sách) |
| Guest | `guest` | Khách vãng lai (chỉ xem) |

## 📖 Documentation

- [API Documentation](./docs/api/README.md)
- [Architecture Guide](./docs/architecture/README.md)
- [Team Rules & Conventions](./.agent/rules.md)

## 🤝 Contributing

1. **Luôn chạy Test**: `pnpm test` trước khi push.
2. **Tuân thủ Rules**: Đảm bảo AI của bạn đã đọc `.agent/rules.md`.
3. **Commit chuẩn**: `feat(client): add login page` (theo Conventional Commits).
4. **Pull Request**: Tạo PR vào nhánh `develop`. CI sẽ tự động chạy check.

## 📝 License

MIT License
