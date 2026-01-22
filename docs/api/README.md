# API Documentation

## Overview

This directory contains API documentation for the Borrowing Books system.

## Base URL

- Development: `http://localhost:5000/api`
- Production: `https://api.borrowingbooks.com/api`

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Endpoints

Refer to the Swagger documentation at `/api-docs` for detailed endpoint information.

### Quick Links

- [Authentication](./auth.md)
- [Books](./books.md)
- [Borrowings](./borrowings.md)
- [Libraries](./libraries.md)
- [Users](./users.md)

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": [ ... ]
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| VALIDATION_ERROR | Request validation failed |
| UNAUTHORIZED | Authentication required |
| FORBIDDEN | Permission denied |
| NOT_FOUND | Resource not found |
| RATE_LIMIT_EXCEEDED | Too many requests |
| INTERNAL_ERROR | Server error |
