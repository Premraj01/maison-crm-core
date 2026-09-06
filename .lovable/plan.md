# Maison CRM boilerplate

## Goal
Build a complete sample-data CRM in this new project, preserving the warm editorial Maison language from the separate read-only reference project. The existing Maison site remains untouched.

## Experience and navigation
- Create a responsive application shell with a fixed, collapsible left rail for Dashboard, Leads, Customers, Team, Settings, and Components.
- Add a top bar with global search, notifications, light/dark theme control, and a role-preview switcher.
- Keep the sign-in screen outside the main shell while matching the same typography, color, spacing, and control treatments.
- Give every screen its own URL and metadata: `/`, `/leads`, `/customers`, `/customers/$customerId`, `/team`, `/team/permissions`, `/settings`, `/components`, and `/sign-in`.

## Maison design system
- Recreate the supplied paper, cream, ink, ink-soft, line, terracotta, and terracotta-soft palette exactly, then provide a coordinated full dark theme through semantic tokens.
- Load Fraunces and Manrope from Google Fonts in the document head; use Fraunces for editorial display type, Manrope for UI, and tabular figures for metrics.
- Restyle the existing shadcn primitives into a cohesive Maison component system with compact radii, fine borders, warm surfaces, and restrained elevation.
- Add theme initialization and persistence so the chosen appearance is restored without a visible flash.
- Use Lucide icons, Recharts, and Sonner already available in the project.

## Shared component kit
- Build reusable button variants and loading states; cards and KPI cards; dialogs and drawers; banners; toast helpers; tabs; menus; avatars; tooltips; inputs, selects, dates, textareas, and search fields.
- Add data tables with sorting, pagination, filters, and empty states.
- Add status/health/role badges, full-page loader, skeletons for cards, tables, lists, and charts, plus reusable empty and error states.
- Create a Components screen that demonstrates every global element and its important states.

## Typed sample data and permissions
- Add typed local modules for leads, customers, deals, users, tasks, activities, chart series, pipeline stages, and notification preferences.
- Add a mock `can(role, action)` permission layer and a shared role-preview state.
- Make permissions visibly affect navigation, actions, editing controls, invitation access, and settings while keeping all data local and disposable.

## Screens and interactions
- **Dashboard:** four animated KPI cards, pipeline chart, lead-source breakdown, recent activity, and task list.
- **Leads:** sortable/filterable/searchable table plus kanban view; drag leads between New, Contacted, Qualified, Proposal, Won, and Lost; add/edit modal; detail drawer with timeline and notes.
- **Customers:** segmented customer list with health indicators and links to a full detail screen containing profile, contacts, deals, activity, and files tabs.
- **Team:** role-aware user list and invite-user modal.
- **Permissions:** readable role-by-capability matrix reflecting the active preview role.
- **Settings:** profile, remembered appearance, notification controls, and local pipeline-stage configuration.
- **Sign-in:** polished visual-only form with no authentication wiring.
- Use realistic sample content and connect UI actions locally so filters, sorting, paging, tabs, drawers, dialogs, toasts, role restrictions, and kanban movement can all be exercised.

## Motion, responsiveness, and accessibility
- Add a restrained page fade/rise, staggered reveals, count-up metrics, shimmer loading states, subtle hover lifts, and smooth dialog/drawer movement.
- Disable or simplify all motion under `prefers-reduced-motion`.
- Adapt the rail, tables, kanban, charts, dialogs, and top bar for desktop and mobile; preserve keyboard focus, labels, contrast, and non-drag alternatives for stage changes.

## Technical approach
- Keep the existing TanStack Start/React 19 structure and use Tailwind v4 semantic tokens in `src/styles.css`.
- Organize the shell, feature views, shared UI, typed sample data, and permission/theme providers into focused modules.
- Use client state only; do not enable Cloud, authentication, or persistent business records.
- Verify compilation, route rendering, primary interactions, light/dark appearance, permissions, and representative desktop/mobile layouts before completion.
