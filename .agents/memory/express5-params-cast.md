---
name: Express 5 req.params cast
description: Express 5 types route params as string | string[] — always cast to string before parseInt.
---

In Express 5, `req.params` values are typed as `string | string[]` (not just `string` as in Express 4). Every `parseInt(req.params.someId, 10)` call will fail TypeScript unless cast:

```typescript
const id = parseInt(req.params.id as string, 10);
```

**Why:** The Express 5 type definitions broadened the param type to match query-string behaviour. Without the cast, TS2345 is raised across every route handler.

**How to apply:** All new route handlers must use `as string` when passing `req.params.*` to any function expecting `string`.
