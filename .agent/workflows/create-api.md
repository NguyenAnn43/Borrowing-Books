---
description: Quy trình tạo một API endpoint mới
---

# Tạo API Endpoint Mới

## 1. Xác định thông tin API

- **Method**: GET/POST/PUT/DELETE
- **Path**: /api/[resource]/[action]
- **Access**: Public/Authenticated/Role-specific
- **Request body/params**: Định nghĩa schema
- **Response format**: Định nghĩa schema

## 2. Tạo Validator Schema

```typescript
// server/src/validators/[resource]Schema.ts
import { z } from 'zod';

export const createBookSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    author: z.string().min(1, 'Author is required'),
    // ... other fields
  }),
});
```

## 3. Tạo Service Method

```typescript
// server/src/services/[resource]Service.ts
import { Book } from '../models';

export const createBook = async (data: any) => {
  // Business logic here
  const book = await Book.create(data);
  return book;
};
```

## 4. Tạo Controller Method

```typescript
// server/src/controllers/[resource]Controller.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../utils';
import * as bookService from '../services/bookService';

export const createBook = asyncHandler(async (req: Request, res: Response) => {
  const book = await bookService.createBook(req.body);
  res.status(201).json({
    success: true,
    data: book,
    message: 'Book created successfully'
  });
});
```

## 5. Thêm Route

```typescript
// server/src/routes/[resource]Routes.ts
import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { createBookSchema } from '../validators/bookSchema';
import { protect, authorize } from '../middlewares/auth';
import * as bookController from '../controllers/bookController';

const router = Router();

router.post(
  '/',
  protect,
  authorize('librarian', 'admin'),
  validate(createBookSchema),
  bookController.createBook
);
```

## 6. Test API

// turbo
```bash
cd server && npm run dev
```

Dùng Postman hoặc Thunder Client để test endpoint mới.

## 7. Update Documentation

- Thêm endpoint vào Swagger docs
- Update file `.agent/rules.md` nếu cần
