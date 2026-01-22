# 📋 AI Team Rules - Inter-Library Management System

> **Dự án**: Hệ Thống Quản Lý Thư Viện Liên Trường (Borrowing-Books)
> **Công nghệ**: Next.js 14 + Tailwind CSS | Node.js + Express | MongoDB
> **Cập nhật**: 2026-01-21

---

## 🎯 Mục Đích

File này định nghĩa các quy tắc mà **tất cả AI assistants** phải tuân theo khi làm việc với dự án này. Điều này đảm bảo code consistency, tránh conflict, và giữ cho dự án có kiến trúc thống nhất.

---

## 📁 Cấu Trúc Dự Án

```
Borrowing-Books/
├── client/          # Frontend (Next.js 14 + Tailwind CSS)
├── server/          # Backend (Node.js + Express)
├── shared/          # Shared code (types, constants, validators)
├── docs/            # Documentation
└── .agent/          # AI rules & workflows
```

> [!CAUTION]
> **KHÔNG ĐƯỢC** tự ý thay đổi cấu trúc thư mục này. Nếu cần thay đổi, hãy thảo luận với team lead.

---

## 🔐 Roles & Permissions

Hệ thống có 4 roles với quyền hạn khác nhau:

| Role | Code | Mô tả |
|------|------|-------|
| Admin | `admin` | Quản trị viên hệ thống, toàn quyền |
| Librarian | `librarian` | Thủ thư, quản lý sách và mượn/trả |
| User | `user` | Người dùng đã đăng ký, có thể mượn sách |
| Guest | `guest` | Khách, chỉ xem được thông tin công khai |

---

## 🎨 Frontend Rules (client/)

### Cấu trúc thư mục
```
client/src/
├── app/              # Next.js App Router
│   ├── (auth)/       # Auth routes (login, register)
│   ├── (dashboard)/  # Dashboard routes theo role
│   │   ├── admin/
│   │   ├── librarian/
│   │   └── user/
│   ├── books/        # Public book pages
│   └── api/          # API routes (nếu cần)
├── components/       # React components
│   ├── ui/           # Base components (Button, Input, Modal...)
│   ├── forms/        # Form components
│   ├── layouts/      # Layout components
│   └── features/     # Feature-specific components
├── hooks/            # Custom React hooks
├── lib/              # Utilities, helpers
├── services/         # API service layer
├── stores/           # Zustand stores
├── types/            # TypeScript types
└── styles/           # Global styles
```

### Naming Conventions
| Type | Convention | Ví dụ |
|------|------------|-------|
| Components | PascalCase | `BookCard.tsx`, `LoginForm.tsx` |
| Hooks | camelCase với prefix `use` | `useAuth.ts`, `useBooks.ts` |
| Stores | camelCase với suffix `Store` | `authStore.ts`, `bookStore.ts` |
| Services | camelCase với suffix `Service` | `bookService.ts` |
| Types/Interfaces | PascalCase với prefix `I` cho interface | `IUser`, `IBook` |
| Utils | camelCase | `formatDate.ts`, `helpers.ts` |

### Component Structure
```tsx
// Thứ tự imports
import React from 'react'; // 1. React
import { useRouter } from 'next/navigation'; // 2. Next.js
import { useAuthStore } from '@/stores/authStore'; // 3. Local imports
import { Button } from '@/components/ui/Button'; // 4. Components
import { IBook } from '@/types'; // 5. Types
import styles from './Component.module.css'; // 6. Styles

// Component
interface Props {
  // Props interface
}

export function ComponentName({ prop1, prop2 }: Props) {
  // 1. Hooks
  // 2. State
  // 3. Effects
  // 4. Handlers
  // 5. Render
}
```

### Styling Rules
- **Primary**: Sử dụng Tailwind CSS classes
- **Custom styles**: Dùng CSS Modules khi cần styles phức tạp
- **Colors**: Sử dụng design tokens đã định nghĩa trong `tailwind.config.ts`
- **Responsive**: Mobile-first approach (sm → md → lg → xl)

### State Management
- **Global state**: Zustand (auth, user preferences)
- **Server state**: TanStack Query (React Query)
- **Form state**: React Hook Form + Zod validation
- **Local state**: useState, useReducer

---

## 🖥️ Backend Rules (server/)

### Cấu trúc thư mục
```
server/src/
├── config/           # Configuration (database, env, swagger)
├── controllers/      # Route controllers
├── middlewares/      # Express middlewares
├── models/           # Mongoose models
├── routes/           # API routes
├── services/         # Business logic
├── types/            # TypeScript type definitions
├── utils/            # Utilities
├── validators/       # Zod schemas for validation
└── app.ts            # Express app entry
```

### Naming Conventions
| Type | Convention | Ví dụ |
|------|------------|-------|
| Controllers | camelCase với suffix `Controller` | `bookController.ts` |
| Models | PascalCase (singular) | `User.ts`, `Book.ts` |
| Routes | camelCase với suffix `Routes` | `bookRoutes.ts` |
| Services | camelCase với suffix `Service` | `bookService.ts` |
| Middlewares | camelCase | `auth.ts`, `validate.ts` |
| Validators | camelCase với suffix `Schema` | `bookSchema.ts` |
| Types | PascalCase với prefix `I` | `IUser`, `IBook` |

### API Response Format
```javascript
// Success response
{
  success: true,
  data: { ... },
  message: "Operation successful",
  meta: { page: 1, limit: 10, total: 100 } // cho pagination
}

// Error response
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    details: [ ... ]
  }
}
```

### Error Handling
```javascript
// Sử dụng custom error class
throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');

// Middleware sẽ catch và format response
```

### Controller Pattern
```typescript
// controllers/bookController.ts
import { Request, Response } from 'express';
import { bookService } from '../services';
import { asyncHandler } from '../utils';

export const getBooks = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search } = req.query;
  const result = await bookService.getBooks({ page, limit, search });
  
  res.json({
    success: true,
    data: result.books,
    meta: result.pagination
  });
});
```

### Service Pattern
```typescript
// services/bookService.ts
import { Book } from '../models';
import { IBook } from '../types';

export const getBooks = async ({ page = 1, limit = 10, search }: any) => {
  const query: any = search 
    ? { title: { $regex: search, $options: 'i' } }
    : {};
    
  const books = await Book.find(query)
    .skip((page - 1) * limit)
    .limit(limit);
    
  const total = await Book.countDocuments(query);
  
  return {
    books,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  };
};
```

---

## 🗄️ Database Models

### User Model
```javascript
{
  email: String,           // required, unique
  password: String,        // hashed with bcrypt
  fullName: String,
  phone: String,
  avatar: String,          // URL from Cloudinary
  role: ['admin', 'librarian', 'user'],
  libraryId: ObjectId,     // for librarian only
  status: ['active', 'inactive', 'banned'],
  maxBorrowLimit: Number,  // default: 5
  createdAt: Date,
  updatedAt: Date
}
```

### Library Model
```javascript
{
  name: String,
  code: String,            // unique code (e.g., "LIB001")
  address: String,
  phone: String,
  email: String,
  status: ['active', 'inactive'],
  workingHours: { open: String, close: String },
  createdAt: Date,
  updatedAt: Date
}
```

### Book Model
```javascript
{
  isbn: String,
  title: String,
  author: String,
  publisher: String,
  publishYear: Number,
  category: String,
  description: String,
  coverImage: String,      // URL from Cloudinary
  language: String,        // 'vi', 'en', etc.
  pageCount: Number,
  tags: [String],          // for search optimization
  location: String,        // shelf location (e.g., "Khu A, Kệ 3")
  libraryId: ObjectId,
  totalCopies: Number,
  availableCopies: Number,
  status: ['available', 'unavailable'],
  createdAt: Date,
  updatedAt: Date
}
```

### Borrowing Model
```javascript
{
  userId: ObjectId,
  bookId: ObjectId,
  libraryId: ObjectId,
  borrowDate: Date,
  dueDate: Date,
  returnDate: Date,
  actualReturnDate: Date,  // actual date user returned
  status: ['pending', 'borrowed', 'returned', 'overdue'],
  fineAmount: Number,      // fine for overdue
  isFined: Boolean,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Reservation Model
```javascript
{
  userId: ObjectId,
  bookId: ObjectId,
  libraryId: ObjectId,
  reservationDate: Date,
  expiryDate: Date,
  status: ['pending', 'ready', 'completed', 'cancelled', 'expired'],
  createdAt: Date,
  updatedAt: Date
}
```

### Notification Model
```javascript
{
  userId: ObjectId,
  title: String,
  message: String,
  type: ['borrowing', 'reservation', 'overdue', 'system'],
  isRead: Boolean,
  createdAt: Date
}
```

---

## 🔒 Security Rules

### Authentication
- Sử dụng **JWT** cho authentication
- Access token: 15 phút
- Refresh token: 7 ngày
- Lưu refresh token trong HttpOnly cookie

### Password
- Hash với **bcrypt** (salt rounds: 12)
- Minimum 8 characters, 1 uppercase, 1 number

### Validation
- Frontend: **Zod** + React Hook Form
- Backend: **Zod** middleware

### API Security
- Rate limiting: 100 requests/minute
- CORS: chỉ allow frontend domain
- Helmet: enable all security headers
- Input sanitization

---

## 📝 Git Conventions

### CI/CD Pipeline
- **Trigger**: Push/PR vào main, develop
- **Checks**: Lint, Test, Build
- **Requirement**: Tất cả checks phải pass (✅) mới merge được

### Branch Naming
```
feature/[feature-name]    # Tính năng mới
bugfix/[bug-description]  # Sửa bug
hotfix/[issue]            # Sửa gấp trên production
refactor/[area]           # Refactoring code
```

### Commit Message
```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: client, server, shared, docs

Ví dụ:
feat(client): add book search component
fix(server): resolve borrowing date calculation
docs(shared): update API documentation
```

---

## ⚠️ Những Điều KHÔNG ĐƯỢC Làm

> [!CAUTION]
> 1. **KHÔNG** hard-code credentials hoặc secrets
> 2. **KHÔNG** bỏ qua error handling
> 3. **KHÔNG** sử dụng `any` type trong TypeScript
> 4. **KHÔNG** commit trực tiếp lên `main` branch
> 5. **KHÔNG** thay đổi database schema mà không update file này
> 6. **KHÔNG** tạo API endpoint mới mà không có validation
> 7. **KHÔNG** sử dụng console.log trong production code
> 8. **KHÔNG** lưu file upload trực tiếp trong server

---

## ✅ Checklist Trước Khi Commit

- [ ] Code đã được format (Prettier)
- [ ] Không có ESLint errors
- [ ] Đã thêm/update types nếu cần
- [ ] Đã thêm validation cho API mới
- [ ] Đã update documentation nếu cần
- [ ] Đã test manual các tính năng

---

## 📚 Tài Liệu Tham Khảo

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Express.js](https://expressjs.com/)
- [Mongoose](https://mongoosejs.com/)
- [Zod](https://zod.dev/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
