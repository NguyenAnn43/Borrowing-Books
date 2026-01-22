---
description: Quy trình tạo một feature mới trong dự án
---

# Tạo Feature Mới

Workflow này hướng dẫn cách tạo một feature mới đúng chuẩn.

## 1. Phân tích yêu cầu

- Xác định feature thuộc phần nào (client/server/both)
- Xác định các models/types cần thiết
- Xác định các API endpoints cần tạo

## 2. Backend (nếu cần)

### 2.1. Tạo/Update Model
```bash
# Nếu cần model mới
touch server/src/models/[ModelName].ts
```

### 2.2. Tạo Validator
```bash
touch server/src/validators/[featureName]Schema.ts
```

### 2.3. Tạo Service
```bash
touch server/src/services/[featureName]Service.ts
```

### 2.4. Tạo Controller
```bash
touch server/src/controllers/[featureName]Controller.ts
```

### 2.5. Tạo Routes
```bash
touch server/src/routes/[featureName]Routes.ts
```

### 2.6. Register Routes
- Thêm routes vào `server/src/routes/index.ts`

## 3. Frontend (nếu cần)

### 3.1. Tạo Types
```bash
# Thêm types vào client/src/types/
```

### 3.2. Tạo Service
```bash
touch client/src/services/[featureName]Service.ts
```

### 3.3. Tạo Store (nếu cần global state)
```bash
touch client/src/stores/[featureName]Store.ts
```

### 3.4. Tạo Components
```bash
mkdir -p client/src/components/features/[featureName]
```

### 3.5. Tạo Pages
```bash
mkdir -p client/src/app/[route-path]
touch client/src/app/[route-path]/page.tsx
```

## 4. Testing

// turbo
```bash
cd server && pnpm test
```

// turbo
```bash
cd client && pnpm test
```

## 5. Documentation

- Update API documentation nếu có endpoint mới
- Update README nếu cần
