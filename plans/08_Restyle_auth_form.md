# Plan: Restyle AuthForm to match the dark/orange design

## Problem
The current `AuthForm` (`packages/ui`) is a light-blue, single-submit-button form with a text
toggle link. The target design is a dark UI with an orange accent, input icons, a password
show/hide toggle, a "Remember me" checkbox, a "Forgot password?" link, and two stacked buttons
("Log in" filled, "Create account" outlined). Goal: match the design using **MUI theme + props**
with as little custom `sx`/styling as possible.

## Approach
Push the visual change into the **shared MUI theme** (dark mode + orange primary) so the form
stays mostly prop-driven. Restructure `AuthForm` layout to add icons, the show/hide toggle, the
remember-me + forgot-password row, and the two-button stack. Keep validation logic unchanged.
Keep the Confirm Password field in signUp mode; drop the title heading.

## Decisions (confirmed with user)
- **Theme:** update the shared MUI theme globally (dark mode + orange primary).
- **Buttons:** show both — "Log in" submits, "Create account" calls `onModeChange` to signUp.
- **Remember me / Forgot password:** visual only, no wired behavior.
- **Icons:** leading mail/lock icons + working show/hide password toggle (InputAdornment).
- **SignUp:** keep Confirm Password field (styled to match); drop the title heading.

## Changes

### 1. `packages/ui/src/theme.ts`
- Set `palette.mode = 'dark'`.
- `palette.primary.main` → orange/coral (approx `#E8734A` from design; final hex TBD).
- Set a dark `palette.background.default`/`paper` matching the design's deep navy.
- Keep existing font config. This is the main "styling" lever so components stay prop-driven.

### 2. `packages/ui/src/components/AuthForm.tsx`
- Remove the title `Typography` heading.
- Email field: add leading `EmailOutlined` icon via `InputProps.startAdornment`.
- Password field: add leading `LockOutlined` icon + trailing `IconButton` toggling
  `Visibility`/`VisibilityOff`; local `showPassword` state controls `type`.
- Confirm Password (signUp only): same leading lock icon; keep validation as-is.
- Add a row (MUI `Box`/`Stack`, `justifyContent: space-between`): `FormControlLabel` +
  `Checkbox` "Remember me" on the left, `Link` "Forgot password?" on the right (visual only).
- Replace the bottom toggle link with a button stack:
  - "Log in" / primary `variant="contained"` `type="submit"` (submits).
  - "Create account" outlined; in signIn mode calls `onModeChange('signUp')`; in signUp mode
    acts as the submit button ("Create account" label) OR keep a sensible pair — final button
    labels/behavior per mode documented inline. Preserve existing `loading` handling.
- Keep `error` Alert and all validation/state logic untouched.
- Prefer theme + MUI props over custom `sx`; use `sx` only for spacing/layout.

### 3. `packages/ui/src/components/AuthForm.stories.tsx`
- Verify all existing stories still render; adjust the mismatch-story description if wording
  no longer matches. Optionally add a "Dark" background note (theme is already dark globally).

### 4. Verification
- `pnpm --filter @instigi/ui typecheck` (or repo-wide `pnpm typecheck`).
- `pnpm lint`.
- Visually confirm via Storybook (`:6006`) that signIn/signUp match the design.
- Confirm `apps/web-app` AuthPage still renders correctly under the new dark theme
  (RootLayout already wraps with `ThemeProvider`).

## Notes / Considerations
- Global dark theme affects **both apps** (`web-app`, `admin-app`) and Storybook — expected per
  user choice; a quick sanity check of admin-app is advisable but out of scope for edits.
- `noUncheckedIndexedAccess` / `exactOptionalPropertyTypes` are on; avoid assigning `undefined`
  to optional MUI props explicitly.
- Exact orange/navy hex values will be sampled from the design; adjustable after first render.
- No API/type changes; `AuthFormProps`/`AuthFormData` stay the same.
