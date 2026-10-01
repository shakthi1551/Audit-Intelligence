---
name: Streamlit evaluation handoff
description: Security and development-routing decisions for AuditIQ's Streamlit evaluation service.
---

Do not pass the browser's normal session token to Streamlit. Use a short-lived, single-use handoff code, store only its hash, then exchange it for a short-lived token restricted to reading metrics for one engagement. Keep the scoped token in server-side Streamlit session state; reject it on ordinary authenticated API routes.

In Replit development, route server-side Python API requests through the internal `http://localhost:80/api` proxy when the app domain is `.replit.dev`. Do not disable TLS verification to work around the development proxy's certificate chain. Use the HTTPS app domain in production.

Mount the handoff router before any root-mounted router that applies normal bearer authentication. Express processes routers in registration order, so an earlier root middleware can reject the unauthenticated code exchange before its dedicated handler runs.

**Why:** The UI runs as a separate service, so putting the browser's broader JWT in its URL or exposing it to general routes would expand its access. The development proxy avoids an untrusted local TLS chain without weakening certificate checks.

**How to apply:** Reuse this boundary for any cross-service evaluation view. Keep the token limited to its required read route and engagement, preserve normal TLS verification for public HTTPS calls, and keep the unauthenticated exchange ahead of root-mounted auth middleware.