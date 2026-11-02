# Contributing to ImbaFind

Thanks for helping improve ImbaFind. This guide covers the local setup, the checks a change must pass, and the workflow we expect for branches, commits and pull requests.

## Prerequisites

- **Node.js 22.13 or newer** and npm (the version is pinned in `package.json` under `engines`).
- **Expo CLI** via `npx` — use `npx expo <command>`, there is no global install.
- Optional, for the live backend and AI features: the [Supabase CLI](https://supabase.com/docs/guides/cli) and a [Gemini API key](https://aistudio.google.com/apikey).
- Optional, to run the app on a device: the Expo Go app, or an Android emulator / iOS simulator.

## Local setup

Follow [Setup and run](README.md#setup-and-run) in the README. In short: `npm ci`, then `npm start`. No credentials are needed to browse sample data; add a `.env.local` (from `.env.example`) and deploy the migrations and Edge Functions to use the live backend and AI features.

## Commands

| Command                                                  | Purpose                                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `npm start`                                              | Start the Expo dev server (press a / i / w, or scan the QR code with Expo Go) |
| `npm run lint`                                           | Run ESLint via `expo lint`                                                    |
| `npm run typecheck`                                      | Typecheck with TypeScript strict mode (`tsc --noEmit`)                        |
| `npm test`                                               | Run the Jest unit and component tests                                         |
| `npm run test:coverage`                                  | Run the Jest tests with a coverage report                                     |
| `npm run e2e:build:android` / `npm run e2e:test:android` | Build and run the Detox suite on an Android emulator                          |
| `npm run e2e:build:ios` / `npm run e2e:test:ios`         | Build and run the Detox suite on an iOS simulator (macOS with Xcode only)     |
| `maestro test .maestro`                                  | Run the Maestro flows against an installed build                              |
| `supabase test db`                                       | Run the pgTAP policy tests in `supabase/tests/` (Supabase CLI + Docker)       |
| `npm run format`                                         | Format the codebase with Prettier                                             |
| `npm run format:check`                                   | Check formatting without writing changes                                      |
| `npm run expo-doctor`                                    | Diagnose Expo dependency and config issues                                    |

## Formatting

Formatting is handled by [Prettier](https://prettier.io). A **pre-commit hook** (Husky + lint-staged) runs ESLint `--fix` and Prettier on the files you stage, so committed code stays consistent. Run `npm run format` to format the whole tree on demand.

## Dependencies

`package-lock.json` is authoritative: install with `npm ci` and never edit the lockfile by hand. Version ranges follow a single policy:

- **Expo- and React Native-managed packages** (`expo`, `expo-*`, `react`, `react-dom`, `react-native`, `react-native-*`, `@react-native*`, `@expo/*`, `jest-expo`, `eslint-config-expo`) use exactly the range that `npx expo install` writes. Never hand-edit them: add or update them with `npx expo install` (or `npx expo install --fix`) so they stay SDK-compatible.
- **Every other package** uses a caret range (`^`), or a tilde range (`~`) where a tool needs a tighter pin, such as TypeScript.
- Add runtime dependencies with `npx expo install`, not `npm install`.

Dependabot opens grouped weekly updates for the Expo and React Native families, so patch and minor bumps arrive as pull requests rather than silently.

## Before you open a pull request

Lint, typecheck and tests must all pass. GitHub Actions runs the same checks on every push and pull request, plus a job that applies the migrations from scratch and runs the RLS tests, so a green local run avoids a failing build:

```sh
npm run lint
npm run typecheck
npm run test:coverage
```

## Branches, commits and pull requests

- Work on a short-lived branch off the default branch, named for the change (for example `feat/ai-search-clamp` or `fix/viewing-slot-conflict`).
- Keep commits focused and write clear messages that explain the why, not just the what.
- Keep the scope of a pull request to a single change. Do not mix unrelated refactors with a fix.
- Open a pull request against the default branch with a short description of the change, how it was tested, and any follow-up work. Link the relevant issue if there is one.
- Do not commit secrets, `.env.local`, or credentials. The Supabase anon key is the only backend key that belongs in the client, and never the service-role key.

## Further reading

- [Architecture overview](docs/ARCHITECTURE.md) — how the app, Supabase and the AI functions fit together.
- [AI integration](docs/AI_INTEGRATION.md) and the [ADR on AI via Edge Functions](docs/adr/0001-ai-via-supabase-edge-functions.md).
- [Ethical and responsible AI statement](docs/ETHICAL_AI_STATEMENT.md).
