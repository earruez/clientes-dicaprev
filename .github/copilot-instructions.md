# Project Guidelines

## Code Style
Use TypeScript with Next.js App Router. Always use path aliases `@/` for imports from `src/`. Mark interactive components with `"use client"` at the top; prefer server components by default.

Follow Tailwind CSS for styling, using the `cn()` utility from `src/lib/utils.ts` for class merging. Reference design tokens in [codex/CODEX_v2_DICAPREV.txt](codex/CODEX_v2_DICAPREV.txt) for colors, typography, and spacing.

Keep components small and readable. Prefer TypeScript strictness and avoid `any` unless necessary.

## Architecture
This is a Next.js dashboard application for DICAPREV, organized by features under `/src/app/dicaprev/`. Use the App Router with layouts for shared UI (Sidebar, Topbar). Colocate types, hooks, and components within feature folders.

Business logic goes in custom hooks (e.g., `useTrabajadores`), returning objects with data, setters, and derived state. UI components are in `/src/components/ui/` for primitives and `/src/components/layout/` for layout elements.

Each domain should remain separated by feature folder. Prefer colocating feature-specific components inside each module when they are not globally reusable.

## Build and Test
Run `npm install` to install dependencies. Use `npm run dev` to start development server (default port 3000). Build with `npm run build`, start production with `npm run start`. Validate production build before major commits.

No testing framework is set up yet; plan to add Vitest for unit tests. Validate changes at minimum by checking imports, routes, and local compilation. Prefer safe incremental changes over large risky refactors.

## Conventions
- Use Spanish for domain entity names (Trabajador, Centro, Área) but English for code constructs.
- Define types locally in feature folders, distinguishing between base models and UI-extended types.
- For forms, omit auto-managed fields like `id`, `creadoEl` from input types.
- Use mock data in development until Firebase integration is complete. Prepare the structure so Firebase/Firestore can be integrated cleanly later; do not add Firebase until explicitly requested.
- Reuse `src/components/ui` before creating new UI primitives.
- Keep naming consistent with the current Spanish domain structure.
- Avoid duplicate files, accidental files, and placeholder artifacts.
- Always check for broken imports after edits.
- Do not modify `node_modules`, `.next`, or generated files.
- Do not create unnecessary files like "Rendering" or "npm".

Maintain a clean, scalable structure for a SaaS platform (DICAPREV). Prioritize clarity and maintainability over complexity.

See [codex/CODEX_v1_DICAPREV.txt](codex/CODEX_v1_DICAPREV.txt) and [codex/CODEX_v2_DICAPREV.txt](codex/CODEX_v2_DICAPREV.txt) for detailed design and component specifications.