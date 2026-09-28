# Cadence — Task Manager

A fast, focused task manager for one person: capture, organize, prioritize and complete work across projects.

Built with React, TypeScript and Vite. There is no backend: data lives in the browser's `localStorage`, so it survives a refresh. On first run the app opens with 3 projects and 6 sample tasks.

## Features

- **Accounts:** sign in or create an account. You stay signed in after a refresh (and after closing the browser when "Keep me signed in" is ticked). Each account has its own tasks, projects and teams. Accounts live in this browser only: passwords are stored as salted PBKDF2 hashes, never as plain text, but without a server this keeps people's data apart on a shared device rather than acting as real security.
- **Tasks:** add, edit, delete (with confirmation and undo), complete or reopen from the list. Each task has a title, description, due date, priority, status, project and created time.
- **Projects:** create, rename (with a color), delete. Each project shows its task count. Deleting a project keeps its tasks and moves them to "No project".
- **Teams:** create teams, add or remove members, and assign any task to anyone on a team. Each team has its own page, and removing a member or team keeps their tasks and unassigns them.
- **Board:** switch any view between List and Board. The board works like ClickUp: drag cards between columns grouped by status, priority or assignee. Dragging works with a mouse, on touch screens (press and hold), and from the keyboard (Space to lift, arrow keys to move). Every move can be undone.
- **Views:** All tasks, Today, Upcoming, Overdue, Completed.
- **Organize:** filter by project, priority, status and assignee; search titles and descriptions; sort by due date, priority, created date or A to Z.
- **Dashboard:** five live counts (all, due today, in progress, completed, overdue). Click a count to open that view.
- **Feedback:** a toast confirms every action, and every empty view explains what to do next.
- **Themes:** follows the device's light or dark setting; press `T` to switch.
- **Layout:** works on desktop, tablet and mobile (slide-in menu, bottom-sheet editor, floating add button).

## Design system

- **Fonts** (bundled locally, no external requests): Bebas Neue for page and dialog titles, Oswald for numbers and section labels, Poppins for controls and task titles, Nunito for reading text.
- **Golden ratio (φ ≈ 1.618):** font sizes step by √φ from a 15px base, so every second step is a full φ (15 → 24.3 → 39.3 → 63.5). Spacing, corner radii, control heights and layout widths use Fibonacci numbers (5, 8, 13, 21, 34, 55, 89 … 987). Dashboard cards are golden rectangles, and the page header splits 1.618 : 1.
- **Responsive:** breakpoints at 377, 610 and 987px, plus 1597px for large monitors. Tested from 320px phones through landscape phones and tablets to 1920px desktops. Touch screens get 44px tap targets.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `N` | Add a task (quick add) |
| `Shift` + `N` | New task with all details |
| `J` / `K` or arrow keys | Move selection |
| `Enter` | Open selected task |
| `X` | Complete or reopen selected task |
| `Delete` | Delete selected task |
| `1`–`5` | Switch view |
| `/` | Search |
| `B` | Switch between list and board |
| `P` | New project |
| `T` | Toggle light and dark |
| `?` | Show all shortcuts |
| `Ctrl` + `Enter` | Save in the task panel |
| `Esc` | Close or clear |

## Run locally

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check and build to dist/
npm run preview   # serve the production build
```

## Deploy

1. Push this folder to a new GitHub repository named `task-manager`.
2. On [vercel.com](https://vercel.com), choose **Add New → Project** and import the repository.
3. Keep the detected Vite settings and click **Deploy**.

Every push to `main` redeploys. Because data is stored per browser, every visitor starts with the sample data.
