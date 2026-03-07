<div align="center">
  <h1>Redmine Tracker</h1>
  <p><strong>Track time beautifully.</strong> A modern Redmine client that feels like a Google app.</p>

  <p>
    <a href="#screenshots">Screenshots</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="#quick-start">Quick Start</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="CONTRIBUTING.md">Contributing</a>
  </p>

  <br />

  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/hero-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="docs/screenshots/hero-light.png">
    <img alt="Redmine Tracker — Month calendar with heat map and daily time entries" src="docs/screenshots/hero-light.png" width="100%">
  </picture>

  <br />
  <br />

<a aria-label="CI status" href="https://github.com/Sebastian-Lemling/redmine-time-tracker/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/Sebastian-Lemling/redmine-time-tracker/ci.yml?style=for-the-badge&logo=github&label=CI&labelColor=000"></a>&nbsp;
<a aria-label="MIT license" href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge&labelColor=000"></a>&nbsp;
<a aria-label="TypeScript 5.8" href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=000"></a>&nbsp;
<a aria-label="Node.js 18+" href="https://nodejs.org/"><img alt="Node.js" src="https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=for-the-badge&logo=node.js&logoColor=white&labelColor=000"></a>

</div>

<br />

## Why Redmine Tracker?

Redmine's built-in time tracking is clunky and slow. This app replaces it with a fast, keyboard-friendly interface that makes logging hours painless — start a timer with one click, book time from a clean dialog, review your month in a calendar with heat map.

## Features

- **Project-grouped tickets** — drag-to-reorder, color-coded by project
- **Inline editing** — status, tracker, assignee, version, progress — right on the card
- **One-click timers** — start from any ticket, live counter, pause & resume
- **Manual booking** — duration stepper, activity picker, date & description
- **Month calendar** — heat map visualization with daily detail panel
- **Batch sync** — review drafts, then push to Redmine in one click
- **Full-text search** — filter by project, status, tracker, priority
- **Pins & favorites** — organize your most-used tickets
- **Dark mode** — full Material Design 3 dark color scheme
- **i18n** — German and English, extensible to more languages

## See it in action

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/timer-workflow-dark.gif">
    <source media="(prefers-color-scheme: light)" srcset="docs/screenshots/timer-workflow.gif">
    <img alt="Timer workflow: start a timer, book your time, review in the calendar" src="docs/screenshots/timer-workflow.gif" width="100%">
  </picture>
  <br />
  <sub>Start a timer &rarr; book your time &rarr; review in the calendar</sub>
</div>

## Screenshots

<table>
<tr>
<td width="50%">
<img alt="Time tracking month view" src="docs/screenshots/timelog-light.png" width="100%">
</td>
<td width="50%">
<img alt="Booking dialog" src="docs/screenshots/booking-dialog.png" width="100%">
</td>
</tr>
<tr>
<td width="50%">
<img alt="Search with keyword highlighting" src="docs/screenshots/search-results.png" width="100%">
</td>
<td width="50%">
<img alt="Active timer on a ticket" src="docs/screenshots/timer-active.png" width="100%">
</td>
</tr>
</table>

<details>
<summary>&nbsp;<strong>Dark mode</strong></summary>
<br />

<img alt="Tickets in dark mode" src="docs/screenshots/tickets-dark.png" width="100%">

<img alt="Time tracking in dark mode" src="docs/screenshots/timelog-dark.png" width="100%">

</details>

## Quick Start

```bash
git clone https://github.com/Sebastian-Lemling/redmine-time-tracker.git
cd redmine-time-tracker
npm install
```

Run the interactive setup wizard — it will ask whether you want to run locally or with Docker:

```bash
npm run setup
```

### Local

After setup, start the development server:

```bash
npm run dev
```

The app opens at **http://localhost:5173**. The proxy server starts automatically alongside Vite.

### Docker

The setup wizard builds the image and starts the container automatically. The app will be available at **http://localhost:9500**.

Timelog data is persisted in a Docker volume and survives container restarts.

<details>
<summary>Docker management commands</summary>

| Command                 | Description                               |
| ----------------------- | ----------------------------------------- |
| `npm run docker:up`     | Start the container                       |
| `npm run docker:down`   | Stop and remove the container             |
| `npm run docker:update` | Pull latest changes, rebuild, and restart |
| `npm run docker:logs`   | Follow container logs                     |
| `npm run docker:build`  | Rebuild the image without starting        |

</details>

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code quality checks, and commit conventions.

## License

[MIT](LICENSE) &copy; Sebastian Lemling
