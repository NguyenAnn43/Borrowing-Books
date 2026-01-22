---
description: Quy trình debug và fix lỗi
---

# Debugging Workflow

## 1. Xác định loại lỗi

### Frontend Errors
- **Build errors**: Lỗi khi build Next.js
- **Runtime errors**: Lỗi khi chạy ứng dụng
- **Type errors**: Lỗi TypeScript
- **UI bugs**: Lỗi hiển thị

### Backend Errors
- **Syntax errors**: Lỗi cú pháp JavaScript
- **Runtime errors**: Lỗi khi chạy server
- **Database errors**: Lỗi MongoDB/Mongoose
- **API errors**: Lỗi responses không đúng

## 2. Thu thập thông tin

### Check logs
```bash
# Backend logs
cd server && npm run dev

# Frontend logs
cd client && npm run dev
```

### Check error messages
- Đọc kỹ error message
- Xác định file và line number
- Tìm stack trace

## 3. Debug theo từng loại

### TypeScript/Type Errors
1. Check file có lỗi
2. Xem types đã định nghĩa đúng chưa
3. Xem imports có đúng không

### API Errors
1. Check route có đúng không
2. Check controller logic
3. Check service logic
4. Check database query

### Database Errors
1. Check connection string
2. Check model schema
3. Check query syntax

## 4. Fix và Test

// turbo
```bash
cd server && npm run lint
```

// turbo
```bash
cd client && npm run lint
```

// turbo
```bash
cd client && npm run build
```

## 5. Verify Fix

- Test lại tính năng bị lỗi
- Test các tính năng liên quan
- Đảm bảo không có side effects

## 6. Document

- Nếu lỗi phức tạp, ghi chú vào code
- Update documentation nếu cần
