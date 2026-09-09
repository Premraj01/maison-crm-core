# Maison CRM Core

Build a CRM boilerplate UI reusing the Maison design language.

I already have a website built in a separate Lovable project called Maison — a warm editorial real estate site. This is a brand-new project. Do NOT touch that site. Build the CRM here from scratch, but reuse its exact look and feel.

Design tokens (match these exactly)

Colors: paper #F3ECE1, cream #FBF7F0, ink #221E19, ink-soft #6A6155, line #E2D8C8, terracotta #C15B33, terracotta-soft #E8B79E. Include a full dark variant and a theme toggle that remembers the choice.

Fonts: Fraunces for headings/display, Manrope for body and UI, with tabular numbers for metrics. Load via Google Fonts <link> in the root route head.

Icons: lucide. Charts: Recharts. Toasts/snackbars: sonner. Primitives: shadcn/ui restyled to the Maison theme.

Motion: restrained and consistent — page fade/rise on entry, staggered card reveals, smooth drawer/modal transitions, animated counters, shimmer skeletons, hover lifts. All respect prefers-reduced-motion.

Foundation

React 19 + TypeScript on the current Lovable stack (TanStack Start, Vite), Tailwind v4 tokens in src/styles.css.

App shell: fixed left navigation rail (Dashboard, Leads, Customers, Team, Settings) with collapse, top bar with search, notifications, theme toggle, and a role switcher for previewing permissions.

Reusable component kit (build these once, global) Buttons (primary/secondary/ghost/danger, sizes, loading), cards & stat cards, modal/dialog, drawer, snackbar/toasts, banners (info/success/warning/error), tables with sorting, pagination and empty states, form inputs (text, select, date, textarea, search), badges & status pills, tabs, dropdown menus, avatars, tooltips, full-page app loader, skeleton loaders (card, table row, list, chart), empty and error states. A "Components" page shows every element in one place.

Screens (sample data only — no logins or saved records yet)

Dashboard — KPI stat cards (leads, conversions, pipeline value, revenue), pipeline chart, lead-source breakdown, recent activity feed, tasks list.

Leads — table + kanban pipeline (New, Contacted, Qualified, Proposal, Won/Lost) with drag between stages, filters, search, lead detail drawer with timeline and notes, add/edit lead modal.

Customers — customer list with segments and health status, customer detail page (profile, contacts, deals, activity, files tab).

Team & permissions — user list with roles (Admin, Manager, Sales rep, Viewer), invite-user modal, permission matrix screen; the role switcher visibly changes what is available.

Settings — profile, appearance (theme), notifications, pipeline stage configuration.

Sign-in screen — visual only for now, matching the theme.

Notes

Sample data in typed local modules (src/data/*.ts) with a mock can(role, action) permission helper, so swapping in a real backend later touches only the data layer.

Modern fonts and UI, consistent spacing/typography across every screen.

Keep it a separate project from the website.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c9673dcd-3d10-4262-a0da-941fffe75524).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
