# Redmine Tracker

A Material Design 3 time tracking application that integrates with Redmine. Built with React 19, TypeScript, Vite 7, and Tailwind CSS 4.

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** (included with Node.js)
- A running **Redmine** instance with API access enabled
- Your **Redmine API key** (found under _My Account_ → _API access key_ in Redmine)

## Installation

### macOS

```bash
# Install Node.js via Homebrew (if not installed)
brew install node

# Clone and install
git clone <repository-url>
cd redmine-tracker
npm install

# Run interactive setup (stores credentials in macOS Keychain)
npm run setup
```

You will be prompted for:

- **Redmine URL** — e.g. `https://redmine.example.com`
- **API Key** — your personal Redmine API key

The setup verifies the connection and stores credentials securely in macOS Keychain.

```bash
# Start the application
npm run dev
```

The app runs at **http://localhost:5173**. The proxy server starts on port 3001.

### Linux

```bash
# Install Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or via nvm (any distro)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install 22
nvm use 22

# Install libsecret for credential storage (Ubuntu/Debian)
sudo apt-get install -y libsecret-tools

# On Fedora/RHEL
# sudo dnf install libsecret

# On Arch
# sudo pacman -S libsecret

# Clone and install
git clone <repository-url>
cd redmine-tracker
npm install

# Run interactive setup (stores credentials via secret-tool / GNOME Keyring / KWallet)
npm run setup

# Start the application
npm run dev
```

> **Note:** If `secret-tool` is not available, credentials fall back to a local `.env` file with restricted permissions (`chmod 600`).

### Windows

```powershell
# Install Node.js
# Download installer from https://nodejs.org/ (LTS recommended)
# Or via winget:
winget install OpenJS.NodeJS.LTS

# Clone and install
git clone <repository-url>
cd redmine-tracker
npm install

# Run interactive setup (stores credentials in .env file)
npm run setup

# Start the application
npm run dev
```

> **Note:** Windows uses a `.env` file for credential storage. The file permissions are restricted via `icacls`. A native keystore backend (DPAPI) is not yet implemented.

## Credential Storage

| OS      | Backend     | Details                                                         |
| ------- | ----------- | --------------------------------------------------------------- |
| macOS   | Keychain    | `security add-generic-password` under service `redmine-tracker` |
| Linux   | secret-tool | GNOME Keyring or KWallet via `secret-tool store`                |
| Windows | `.env` file | Plaintext fallback with restricted ACLs                         |

Credentials are resolved in order: OS keystore → environment variables (`REDMINE_URL`, `REDMINE_API_KEY`) → `.env` file.

To override without running setup, create a `.env` file in the project root:

```bash
cp .env.example .env
# Edit .env with your values
```

## Available Scripts

| Command                 | Description                                 |
| ----------------------- | ------------------------------------------- |
| `npm run setup`         | Interactive Redmine configuration           |
| `npm run dev`           | Start proxy + dev server                    |
| `npm run build`         | Production build                            |
| `npm run test`          | Run all tests                               |
| `npm run test:watch`    | Run tests in watch mode                     |
| `npm run test:coverage` | Run tests with coverage report              |
| `npm run lint`          | Run ESLint                                  |
| `npm run format`        | Format code with Prettier                   |
| `npm run validate`      | Run typecheck + lint + format check + tests |
| `npm run test:e2e`      | Run Playwright end-to-end tests             |

## Ports

| Service         | Port          |
| --------------- | ------------- |
| Vite dev server | 5173 (strict) |
| API proxy       | 3001          |

The proxy at port 3001 forwards all `/api/*` requests to your Redmine instance, handling CORS and authentication.

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint + husky.

```
<type>: <description>
```

| Type       | When to use                         |
| ---------- | ----------------------------------- |
| `feat`     | New feature                         |
| `fix`      | Bug fix                             |
| `refactor` | Code change (no new feature or fix) |
| `test`     | Adding or updating tests            |
| `docs`     | Documentation only                  |
| `style`    | Formatting, no code change          |
| `chore`    | Build, tooling, dependencies        |
| `perf`     | Performance improvement             |

Examples:

```bash
git commit -m "feat: add dark mode toggle"
git commit -m "fix: resolve timer drift on tab switch"
git commit -m "docs: update setup instructions for Linux"
```
