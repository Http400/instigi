# PLAN_02: Add Storybook to `packages/ui`

## Overview

Add **Storybook 10** (latest stable: `v10.4.x`) to `packages/ui` — a React + TypeScript + Vite component library
using MUI v9 (`@mui/material`). Storybook will be configured with the `@storybook/react-vite` framework
to reuse the existing Vite setup. Stories will be written for the two existing components: `Button` and `TextField`.

> **Storybook 10 key highlights:**
>
> - ESM-only (no CommonJS), requires **Node ≥ 20.16** (current engines allow `>=20.0.0` — bump to `>=20.16.0`)
> - Typesafe **CSF Factories** for writing strongly-typed stories
> - Native Vitest 4 integration support

## Current State

- **Package**: `packages/ui` (`@instigi/ui`)
- **Stack**: React 19, TypeScript, Vite 8, MUI v9 (`@mui/material` + `@emotion/react`)
- **Tooling**: pnpm 10 monorepo, Turborepo 2
- **Existing components**: `Button.tsx`, `TextField.tsx`
- **Existing scripts**: `build`, `dev`, `test`, `test:watch`, `lint`, `typecheck`, `clean`

## Approach

Install Storybook 10 manually (no `storybook init` to keep full control in the monorepo),
configure it to use Vite as builder with MUI theme wrapping in preview, add stories for
existing components, and wire the new `storybook` / `build-storybook` scripts into Turborepo.

---

## Tasks

### 1. Install Storybook 10 dev dependencies in `packages/ui`

```
pnpm add -D \
  storybook \
  @storybook/react-vite \
  @storybook/addon-essentials \
  @storybook/addon-interactions
```

Expected packages added:

- `storybook` — Storybook CLI (v10.4.x)
- `@storybook/react-vite` — React + Vite framework (v10.4.x)
- `@storybook/addon-essentials` — Docs, controls, actions, backgrounds, viewport
- `@storybook/addon-interactions` — Interaction testing support

### 1a. Bump Node engine requirement

Storybook 10 is ESM-only and requires **Node ≥ 20.16**. Update the root `package.json`:

```json
"engines": {
  "node": ">=20.16.0",
  "pnpm": ">=10.0.0"
}
```

### 2. Create `.storybook/main.ts`

Location: `packages/ui/.storybook/main.ts`

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
```

> No need to merge `vite.config.ts` since the library build config (externals, `lib` mode) is
> incompatible with Storybook's bundling. Storybook's Vite framework handles its own config.

### 3. Create `.storybook/preview.tsx`

Location: `packages/ui/.storybook/preview.tsx`

Wrap stories with MUI's `ThemeProvider` and `CssBaseline` so all components render with the
app theme:

```tsx
import React from 'react';
import type { Preview } from '@storybook/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '../src/theme';

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
```

### 4. Add scripts to `packages/ui/package.json`

Add to the `"scripts"` section:

```json
"storybook": "storybook dev -p 6006",
"build-storybook": "storybook build"
```

### 5. Update `turbo.json` to register Storybook tasks

Add the following task definitions:

```json
"storybook": {
  "cache": false,
  "persistent": true
},
"build-storybook": {
  "dependsOn": ["^build"],
  "outputs": ["storybook-static/**"]
}
```

### 6. Write stories for existing components using CSF Factories

Storybook 10 introduces **CSF Factories** — a typesafe way to define stories using `storybookConfig`
from the framework package. Stories use `const Story = meta.story({...})` pattern.

#### `packages/ui/src/components/Button.stories.tsx`

Cover the key variants of `Button`:

- Default (contained)
- Outlined / text variants
- Loading state
- Disabled state
- Color variants (primary, secondary, error)

#### `packages/ui/src/components/TextField.stories.tsx`

Cover key states of `TextField`:

- Default
- With label and placeholder
- With helper text
- Error state
- Disabled state
- Multiline

### 7. Exclude stories from the library build

Stories should not be compiled into the `dist/` output.

**`packages/ui/tsconfig.json`** — add `exclude`:

```json
"exclude": ["src/**/*.stories.*", "node_modules"]
```

**`packages/ui/vite.config.ts`** — already uses `entry: src/index.ts` so stories are excluded
from the library build naturally. No changes needed unless index.ts re-exports stories.

---

## File Checklist

| File                                               | Action                            |
| -------------------------------------------------- | --------------------------------- |
| `package.json` (root)                              | Bump `node` engine to `>=20.16.0` |
| `packages/ui/package.json`                         | Add devDeps + scripts             |
| `packages/ui/.storybook/main.ts`                   | Create                            |
| `packages/ui/.storybook/preview.tsx`               | Create                            |
| `packages/ui/src/components/Button.stories.tsx`    | Create                            |
| `packages/ui/src/components/TextField.stories.tsx` | Create                            |
| `packages/ui/tsconfig.json`                        | Update exclude                    |
| `turbo.json`                                       | Add storybook tasks               |

---

## Verification

After implementation:

1. `cd packages/ui && pnpm storybook` — Storybook dev server starts on port 6006, both stories visible
2. `cd packages/ui && pnpm build-storybook` — static output generated in `storybook-static/`
3. `pnpm build` (root) — library build is unaffected (stories excluded)
4. `pnpm typecheck` — no TypeScript errors

---

## Notes

- **Storybook version**: 10.4 (latest stable as of 2026-05)
- **ESM-only**: Storybook 10 drops CommonJS — requires Node ≥ 20.16.0 (root `engines` bumped)
- **CSF Factories**: New typesafe story syntax introduced in v10 — used for all stories
- `@storybook/react-vite` bundles its own Vite instance; no conflict with `vite@8` in devDeps
- `react` and `react-dom` are peer deps in `packages/ui` but installed in the monorepo root —
  pnpm workspace hoisting ensures Storybook can resolve them
- MUI `@emotion/react` and `@emotion/styled` are already in `dependencies`, so no extra install needed
