# Architecture Documentation

## Overview

The Borrowing Books system is built with a monorepo architecture containing:

- **client/**: Next.js 14 frontend application
- **server/**: Express.js backend API
- **shared/**: Shared code and types

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Frontend     │────▶│    Backend      │────▶│    Database     │
│   (Next.js)     │     │   (Express)     │     │   (MongoDB)     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       │                        │
       │                        │
       ▼                        ▼
┌─────────────────┐     ┌─────────────────┐
│   Cloudinary    │     │   JWT Auth      │
│  (File Storage) │     │   (Security)    │
└─────────────────┘     └─────────────────┘
```

## Backend Architecture

The backend follows a layered architecture:

```
Routes → Controllers → Services → Models → Database
```

- **Routes**: Define API endpoints and middlewares
- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Models**: Define data schemas (Mongoose)

## Frontend Architecture

The frontend uses Next.js 14 App Router:

```
app/
├── (auth)/           # Authentication pages
├── (dashboard)/      # Protected dashboard pages
├── books/            # Public book pages
└── api/              # API routes (if needed)

components/
├── ui/               # Base UI components
├── forms/            # Form components
├── layouts/          # Layout components
└── features/         # Feature-specific components

stores/               # Zustand state stores
services/             # API service layer
```

## Data Flow

1. User interacts with UI
2. Component calls service or store action
3. Service makes API request
4. Backend controller receives request
5. Controller calls service with business logic
6. Service interacts with database via models
7. Response flows back to frontend
8. UI updates based on response

## Security

- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting
- Input validation (Zod)
- CORS configuration
- Helmet security headers
