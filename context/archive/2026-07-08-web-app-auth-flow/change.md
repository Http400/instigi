---
change_id: web-app-auth-flow
title: Rebuild the web-app sign in / sign up flow with Redux Toolkit + RTK Query
status: archived
created: 2026-07-08
updated: 2026-07-10
archived_at: 2026-07-10T14:39:22Z
---

## Notes

S-08 from context/foundation/roadmap.md. Rebuild the web-app authentication experience: wire the existing `AuthPage` shell to the unchanged auth-service (`/api/auth/login|register|refresh`) using Redux Toolkit + RTK Query. Persist the session in localStorage so users stay signed in across reloads, auto-refresh the access token on 401, surface friendly error copy, redirect to home on success, make the app shell auth-aware (Sign Out), and add a `ProtectedRoute` guard. Auth-service API contracts must NOT change. Independent of the workout track.
