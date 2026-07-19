---
name: Orval queryKey required in options
description: Generated useXxx hooks require queryKey in the query options object or TS2741 is raised.
---

Orval-generated hooks (e.g. `useListAuditLogs`) infer the return type from the `UseQueryOptions` generic and require `queryKey` in the options object when you pass a `query` options bag:

```typescript
// WRONG — TS2741: Property 'queryKey' is missing
useListAuditLogs(params, { query: { enabled: true } });

// CORRECT
import { getListAuditLogsQueryKey } from "@workspace/api-client-react";
const params = { engagementId, page: 1 };
useListAuditLogs(params, { query: { enabled: true, queryKey: getListAuditLogsQueryKey(params) } });
```

**Why:** The generated `UseQueryOptions` type marks `queryKey` as required (no default is injected at the type level).

**How to apply:** Any time you pass inline query options to a generated hook, always include `queryKey: getXxxQueryKey(params)`.
