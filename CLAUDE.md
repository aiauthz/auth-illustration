# CLAUDE.md

## Project Overview

Interactive visualization app for OAuth 2.0, OpenID Connect (OIDC), and Identity Assertion Authorization Grant (ID-JAG) flows. An educational presentation tool demonstrating secure authentication patterns, including how AI agents authenticate with identity providers.

5 slides cover: OAuth Consent, App-to-App Integration, Delegated API Key, Agent as OAuth Client, and Cross-App Access (ID-JAG).

## Tech Stack

- **Framework:** React 18 + TypeScript 5.2
- **Build:** Vite 6 (base path: `/auth-illustration/` for GitHub Pages)
- **Styling:** Tailwind CSS 3.4 with dark theme (HSL CSS variables), tailwindcss-animate
- **UI Primitives:** Radix UI (Dialog, Tooltip, Alert Dialog, Tabs, Label) + CVA for variants
- **Icons:** Lucide React
- **Utilities:** clsx + tailwind-merge via `cn()` helper in `src/lib/utils.ts`
- **Package Manager:** npm

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server with HMR
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint (strict: --max-warnings 0)
npm run preview      # Preview production build locally
```

No test framework is configured.

## Project Structure

```
src/
  App.tsx                  # Main app: keyboard shortcuts, slide navigation
  main.tsx                 # Entry point
  index.css                # Global styles + Tailwind directives
  components/              # Reusable UI components
    SlideLayout.tsx         # Shared slide chrome (buttons, title, caption, event listener)
    ConsentDialog.tsx       # Parameterized OAuth consent dialog
    LoginDialog.tsx         # Parameterized login dialog
    ui/                    # Headless Radix-based primitives (button, card, dialog, etc.)
    logos/                 # Custom SVG logo components
  lib/                     # Utilities and helpers
    colors.ts              # Semantic edge color palette (edgeColors)
    layout.ts              # Layout helpers: row(), grid() for node positioning
    tokens.ts              # Fake JWT generation for visualization
    utils.ts               # cn() classname utility
  slides/                  # Slide components (Slide1_ through Slide5_)
  stage/                   # Grid-based spatial rendering system
    Stage.tsx              # Container with StageContext
    ActorCard.tsx          # Positioned actor/node cards
    EdgeLayer.tsx          # SVG arrow/connection rendering
    NodeLayer.tsx          # Node placement layer
    GridLayer.tsx          # Background grid
    useAnchors.ts          # Hook for node anchor points
```

## Code Conventions

- **Path alias:** `@/` maps to `src/` (configured in tsconfig + vite.config)
- **Naming:** PascalCase for components, camelCase for functions/variables, UPPERCASE for enums/constants
- **One component per file**, no barrel `index.ts` exports
- **Slide naming:** `Slide{N}_{Name}.tsx` (e.g., `Slide1_OAuthConsent.tsx`)
- **Props:** Use `interface` for prop types, `type` for unions
- **Formatting (Prettier):** No semicolons, single quotes, tab width 2, trailing commas (ES5), print width 100, arrow parens always
- **Linting:** ESLint strict mode (zero warnings allowed), unused vars prefixed with `_` are OK
- **TypeScript:** Strict mode enabled, target ES2020

## Architecture Patterns

- **SlideLayout:** All slides wrap their content in `<SlideLayout>`, which provides control buttons (Start/Previous/Next/Reset), title bar, closed caption box, and the `slideNextStep` global event listener. Each slide only defines its own flow logic, nodes, edges, and custom overlays.
- **Stage system:** Custom spatial layout with 3 layers (Grid → Edges → Nodes). Nodes positioned absolutely with pixel coordinates. Edges use SVG Manhattan routing.
- **State management:** React hooks only (useState, useEffect, useContext, useRef). No external state library. Each slide defines its own `FlowStep` union type and `handleNextStep`/`handlePreviousStep` handlers.
- **Edge colors:** Use `edgeColors` from `@/lib/colors` instead of hardcoded hex strings. Semantic names: `auth`, `authBright`, `token`, `tokenAlt`, `idToken`, `consent`, `success`, `successBright`, `error`, `api`, `apiAlt`.
- **Layout helpers:** `row()` and `grid()` from `@/lib/layout` for positioning nodes. Available for new slides; existing slides use manually tuned coordinates.
- **Animation:** requestAnimationFrame + CSS transitions + SVG dash-offset animations. Easing via cubic functions.
- **Navigation:** Global keydown listener in App.tsx. Space/Arrow/PageDown/n = next step, Arrow Left/PageUp/p = prev, number keys 1-5 = jump to slide, F = fullscreen.
- **Custom events:** `slideNextStep` dispatched for slide-level step progression (handled inside SlideLayout).

## Key Patterns

- Use `cn()` from `@/lib/utils` for all conditional classname merging
- Radix UI primitives are wrapped in `src/components/ui/` with Tailwind styling and CVA variants
- Compound components pattern for Card, Dialog, etc. (e.g., Card, CardHeader, CardContent, CardTitle)
- Dark theme throughout — all new UI should use the existing HSL color variable system
- `ConsentDialog` and `LoginDialog` accept optional `title`/`description` props to override defaults
