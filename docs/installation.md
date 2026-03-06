# Installation Guide

## Prerequisites

- **Node.js** >= 18.0.0
- A running **Redmine** instance with REST API enabled
- Your **Redmine API key** (found under _My Account_ > _API access key_)

## macOS

```bash
# Install Node.js via Homebrew (if not installed)
brew install node

# Clone and install
git clone https://github.com/Sebastian-Lemling/redmine-time-tracker.git
cd redmine-time-tracker
npm install

# Run interactive setup (stores credentials in macOS Keychain)
npm run setup

# Start the application
npm run dev
```

Credentials are stored in macOS Keychain via `security add-generic-password`.

## Linux

```bash
# Install Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or via nvm (any distro)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install 22

# Install libsecret for credential storage (Ubuntu/Debian)
sudo apt-get install -y libsecret-tools

# On Fedora/RHEL: sudo dnf install libsecret
# On Arch: sudo pacman -S libsecret

# Clone and install
git clone https://github.com/Sebastian-Lemling/redmine-time-tracker.git
cd redmine-time-tracker
npm install

# Run interactive setup (stores credentials via GNOME Keyring / KWallet)
npm run setup
npm run dev
```

> If `secret-tool` is not available, credentials fall back to a local `.env` file with restricted permissions (`chmod 600`).

## Windows

```powershell
# Install Node.js via winget (or download from https://nodejs.org)
winget install OpenJS.NodeJS.LTS

# Clone and install
git clone https://github.com/Sebastian-Lemling/redmine-time-tracker.git
cd redmine-time-tracker
npm install

# Run interactive setup (stores credentials in .env file)
npm run setup
npm run dev
```

> Windows uses a `.env` file for credential storage with restricted ACLs via `icacls`.

## Credential Storage

| OS      | Backend     | Details                                                         |
| ------- | ----------- | --------------------------------------------------------------- |
| macOS   | Keychain    | `security add-generic-password` under service `redmine-tracker` |
| Linux   | secret-tool | GNOME Keyring or KWallet via `secret-tool store`                |
| Windows | `.env` file | Plaintext fallback with restricted ACLs                         |

Credentials are resolved in order: OS keystore > environment variables (`REDMINE_URL`, `REDMINE_API_KEY`) > `.env` file.

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
| `npm run test`          | Run all tests (Vitest)                      |
| `npm run test:watch`    | Run tests in watch mode                     |
| `npm run test:coverage` | Run tests with coverage report              |
| `npm run test:e2e`      | Run Playwright end-to-end tests             |
| `npm run lint`          | Run ESLint                                  |
| `npm run format`        | Format code with Prettier                   |
| `npm run typecheck`     | TypeScript type-check                       |
| `npm run validate`      | Run typecheck + lint + format check + tests |

## Ports

| Service         | Port |
| --------------- | ---- |
| Vite dev server | 5173 |
| API proxy       | 3001 |

The proxy at port 3001 forwards `/api/*` requests to your Redmine instance, handling CORS and authentication headers.
