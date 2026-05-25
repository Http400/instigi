# PLAN_04: Add Routing to `web-app` with React Router

## Overview

Add client-side routing to `apps/web-app` using **React Router v7** (already installed as `react-router@^7.6.0`) in **Data Mode** (`createBrowserRouter` + `RouterProvider`). Data Mode is the recommended approach for new Vite SPA projects — it supports loaders, actions, and pending states while keeping full control over bundling.

## Current State

- **App**: `apps/web-app` (`@instigi/web-app`)
- **Stack**: React 19, TypeScript, Vite 8, MUI v9, react-router 7.6
- **Entry point**: `src/main.tsx` — renders `<App />` inside `<ThemeProvider>`, no router present
- **App component**: `src/App.tsx` — single page placeholder (heading + button)
- **react-router already installed** — no new dependency needed
- **From Plan 03**: `AuthForm` component exists in `@instigi/ui` (sign-in / sign-up modes)

## React Router Version

**React Router v7** (latest as of 2026-05). Installed: `react-router@^7.6.0`.

Official docs: https://reactrouter.com/start/modes  
Mode chosen: **Data Mode** — `createBrowserRouter` + `RouterProvider`

## Routes

| Path    | Component      | Description                                                            |
| ------- | -------------- | ---------------------------------------------------------------------- |
| `/`     | `HomePage`     | Landing / home page                                                    |
| `/auth` | `AuthPage`     | Single page for sign-in **and** sign-up — mode toggled via local state |
| `*`     | `NotFoundPage` | 404 catch-all                                                          |

A `RootLayout` component provides shared chrome (nav bar, MUI theme wrappers via `<Outlet />`).

## Architecture

```
main.tsx
  └── RouterProvider (router = createBrowserRouter([...]))
        └── RootLayout  (path="/")
              ├── <Outlet />  →  HomePage      (index)
              ├── <Outlet />  →  AuthPage      (/auth)
              └── <Outlet />  →  NotFoundPage  (path="*")
```

`main.tsx` no longer renders `<App />` — the router takes over. MUI `<ThemeProvider>` and `<CssBaseline>` move into `RootLayout`.

---

## Tasks

### 1. Create page components

**`src/pages/HomePage.tsx`**

Simple landing page — heading, tagline, single link to `/auth` using React Router `<Link>`.

```tsx
import { Link } from 'react-router';
import { Container, Typography, Box, Button } from '@mui/material';

export default function HomePage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Welcome to Instigi
        </Typography>
        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button component={Link} to="/auth" variant="contained">
            Sign In / Sign Up
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
```

**`src/pages/AuthPage.tsx`**

Single page for both sign-in and sign-up. Uses local `useState` to track the current `mode`. `AuthForm`'s `onModeChange` callback toggles between the two modes in place — no navigation needed.

```tsx
import { useState } from 'react';
import { Container, Box } from '@mui/material';
import { AuthForm, AuthFormData } from '@instigi/ui';

type AuthMode = 'signIn' | 'signUp';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signIn');

  const handleSubmit = async (data: AuthFormData) => {
    // TODO: wire up authentication / registration API
    console.log(mode === 'signIn' ? 'Sign in' : 'Sign up', data);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 8 }}>
        <AuthForm
          mode={mode}
          onSubmit={handleSubmit}
          onModeChange={(newMode) => setMode(newMode)}
        />
      </Box>
    </Container>
  );
}
```

**`src/pages/NotFoundPage.tsx`**

Simple 404 page with a link back to home.

```tsx
import { Link } from 'react-router';
import { Container, Typography, Box, Button } from '@mui/material';

export default function NotFoundPage() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          404 — Page Not Found
        </Typography>
        <Button component={Link} to="/" variant="contained">
          Go Home
        </Button>
      </Box>
    </Container>
  );
}
```

---

### 2. Create `RootLayout`

**`src/layouts/RootLayout.tsx`**

Provides shared shell: MUI `<ThemeProvider>` + `<CssBaseline>` + minimal nav + `<Outlet />`.

```tsx
import { Outlet, Link } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { theme } from '@instigi/ui';

export default function RootLayout() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              Instigi
            </Link>
          </Typography>
          <Button component={Link} to="/auth">
            Sign In / Sign Up
          </Button>
        </Toolbar>
      </AppBar>
      <Outlet />
    </ThemeProvider>
  );
}
```

---

### 3. Create the router and update `main.tsx`

**`src/router.tsx`**

Define and export the router using `createBrowserRouter`.

```tsx
import { createBrowserRouter } from 'react-router';
import RootLayout from './layouts/RootLayout';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: 'auth', Component: AuthPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
```

**`src/main.tsx`** — replace `<App />` with `<RouterProvider>`:

```tsx
import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
```

> **Note:** `ThemeProvider` and `CssBaseline` move from `main.tsx` into `RootLayout.tsx`.

---

### 4. Update `App.tsx` (or remove it)

`App.tsx` is no longer the root component. It can be deleted, or repurposed later as the `HomePage` component. The tests in `App.test.tsx` need to be updated or removed.

**Update `src/App.test.tsx`** — wrap renders with `MemoryRouter` since `App` (if kept) no longer provides routing context, or rewrite tests to target individual page components.

Example for a page-level test:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import HomePage from './pages/HomePage';

it('renders home heading', () => {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
  expect(screen.getByRole('heading', { name: /welcome to instigi/i })).toBeInTheDocument();
});
```

---

### 5. Run typecheck and tests

```bash
pnpm --filter @instigi/web-app typecheck
pnpm --filter @instigi/web-app test
```

Verify:

- No TypeScript errors
- All tests pass (update `App.test.tsx` as needed)

---

## File Checklist

| File                                      | Action                                                         |
| ----------------------------------------- | -------------------------------------------------------------- |
| `apps/web-app/src/router.tsx`             | **Create** — `createBrowserRouter` config                      |
| `apps/web-app/src/layouts/RootLayout.tsx` | **Create** — shared shell with `<Outlet />`                    |
| `apps/web-app/src/pages/HomePage.tsx`     | **Create** — landing page with link to `/auth`                 |
| `apps/web-app/src/pages/AuthPage.tsx`     | **Create** — sign-in/sign-up via `AuthForm` + local mode state |
| `apps/web-app/src/pages/NotFoundPage.tsx` | **Create** — 404 fallback                                      |
| `apps/web-app/src/main.tsx`               | **Update** — use `RouterProvider`                              |
| `apps/web-app/src/App.tsx`                | **Delete** (or repurpose as `HomePage`)                        |
| `apps/web-app/src/App.test.tsx`           | **Update** — adapt tests for new page structure                |

---

## Verification

1. `pnpm --filter @instigi/web-app typecheck` — zero errors
2. `pnpm --filter @instigi/web-app test` — all tests pass
3. `pnpm --filter @instigi/web-app dev` — app starts; navigate to `/`, `/auth`, `/anything-else` and verify correct pages render; toggle between sign-in and sign-up on `/auth` without navigating away
