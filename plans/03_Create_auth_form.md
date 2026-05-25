# PLAN_03: Create `AuthForm` Component in `packages/ui`

## Overview

Build a reusable `AuthForm` component in the `@instigi/ui` package that handles both
sign-in and sign-up flows in a single component driven by a `mode` prop. Includes
built-in client-side validation and Storybook stories for all key states.

## Current State

- **Package**: `packages/ui` (`@instigi/ui`)
- **Stack**: React 19, TypeScript, Vite 8, MUI v9 (`@mui/material` + `@emotion/react`), Storybook 10
- **Existing components**: `Button.tsx` (with `loading` prop), `TextField.tsx`
- **Storybook**: already configured with MUI `ThemeProvider` in `.storybook/preview.tsx`

## Component API

```tsx
export interface AuthFormData {
  email: string;
  password: string;
}

export interface AuthFormProps {
  /** Controls which mode the form renders in */
  mode: 'signIn' | 'signUp';
  /** Called with validated form data when the user submits */
  onSubmit: (data: AuthFormData) => void | Promise<void>;
  /** Called when the user clicks the mode toggle link */
  onModeChange?: (newMode: 'signIn' | 'signUp') => void;
  /** Disables the form and shows a spinner on the submit button */
  loading?: boolean;
  /** Server-side or async error message shown below the form */
  error?: string;
}
```

> **Note:** `AuthFormData` intentionally only contains `{ email, password }` — the `confirmPassword`
> field is a UI-only concern and is not passed to `onSubmit`.

## Behaviour

### Validation

- **Email**: required + valid email format (regex)
- **Password**: required (non-empty)
- **Confirm Password** _(sign-up mode only)_: required + must match the password field
- Errors shown inline via `TextField` `error` + `helperText` props
- Validation runs **on submit**; re-validates on field change **after** the first failed submission

### Mode Toggle

- Sign-in renders: _"Don't have an account? **Sign up**"_
- Sign-up renders: _"Already have an account? **Sign in**"_
- Clicking the link calls `onModeChange` with the opposite mode
- Internal field state and validation errors are **reset** when mode changes

### Submit Button Label

- Sign-in: `"Sign In"`
- Sign-up: `"Sign Up"`

### Loading & Error

- `loading` prop is forwarded to `Button` — disables the button and shows "Loading…"
- `error` string is rendered in a MUI `Alert` (severity `"error"`) below the submit button

---

## Tasks

### 1. Create `AuthForm.tsx`

Location: `packages/ui/src/components/AuthForm.tsx`

Use React `useState` for field values, field error messages, and a `submitted` flag.
Use existing `Button` and `TextField` from the package (not MUI directly).
Use MUI `Box`, `Typography`, `Link`, and `Alert` for layout and feedback.

Key implementation details:

- `validate()` returns `{ emailError, passwordError }` — empty strings mean valid
- On submit: run validate; if errors exist, set error state and set `submitted = true`; return early
- `submitted` flag gates re-validation on change (avoids showing errors before first submit attempt)
- Mode toggle link click: call `onModeChange`, reset field values and error state

```tsx
// Sketch — not exhaustive
const validate = (email: string, password: string) => ({
  emailError: !email
    ? 'Email is required'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? 'Enter a valid email address'
      : '',
  passwordError: !password ? 'Password is required' : '',
});
```

### 2. Export from `index.ts`

Location: `packages/ui/src/index.ts`

Add:

```ts
export { AuthForm } from './components/AuthForm';
export type { AuthFormProps, AuthFormData } from './components/AuthForm';
```

### 3. Create `AuthForm.stories.tsx`

Location: `packages/ui/src/components/AuthForm.stories.tsx`

| Story             | Description                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `SignIn`          | Default sign-in mode, no loading, no error                                                        |
| `SignUp`          | Default sign-up mode                                                                              |
| `SignInLoading`   | `loading={true}`, sign-in mode                                                                    |
| `SignUpLoading`   | `loading={true}`, sign-up mode                                                                    |
| `SignInWithError` | `error="Invalid email or password."`, sign-in mode                                                |
| `SignUpWithError` | `error="An account with this email already exists."`, sign-up mode                                |
| `Interactive`     | Uses a `render` function with `useState` to demonstrate the mode toggle working live in Storybook |

### 4. Run typecheck

```
pnpm --filter @instigi/ui typecheck
```

Verify no TypeScript errors before considering done.

---

## File Checklist

| File                                              | Action               |
| ------------------------------------------------- | -------------------- |
| `packages/ui/src/components/AuthForm.tsx`         | Create               |
| `packages/ui/src/components/AuthForm.stories.tsx` | Create               |
| `packages/ui/src/index.ts`                        | Update — add exports |

---

## Amendment: Add "Confirm Password" to Sign-Up Mode

### Change summary

- Add a **Confirm Password** field rendered only when `mode === 'signUp'`
- Validation: required + must equal the password field value
- `AuthFormData` is unchanged — `confirmPassword` is UI-only and not passed to `onSubmit`
- `SignUpWithPasswordMismatch` story added to cover the mismatch error state

### Files to update

| File                                              | Change                                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `packages/ui/src/components/AuthForm.tsx`         | Add `confirmPassword` state + error, render field in sign-up mode, update `validate()` |
| `packages/ui/src/components/AuthForm.stories.tsx` | Add `SignUpWithPasswordMismatch` story                                                 |

---

## Verification

1. `pnpm --filter @instigi/ui typecheck` — zero errors
2. `pnpm --filter @instigi/ui storybook` — all stories visible and interactive
3. `pnpm --filter @instigi/ui build` — library build unaffected (stories excluded via tsconfig)
