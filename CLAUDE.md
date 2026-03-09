# BlueBubbles Server

BlueBubbles Server is an Electron + Koa application that bridges macOS iMessage to Android devices. It reads the iMessage database, exposes HTTP and Socket.IO APIs, and delivers push notifications via Firebase Cloud Messaging.

This is a monorepo using npm workspaces with two packages:
- `@bluebubbles/server` (`packages/server/`) -- Electron main process, Koa HTTP server, Socket.IO
- `@bluebubbles/ui` (`packages/ui/`) -- React 18 + Chakra UI + Redux Toolkit (Electron renderer)

## Quick Reference

```bash
npm install          # Install all dependencies (do NOT use yarn)
npm run start        # Dev: runs UI and server concurrently
npm run build        # Production: builds UI then server
npm run build-ui     # Build UI only, copies output to packages/server/dist/static
npm run build-server # Build server only
```

**Required versions:** Node >= 22.12, npm >= 10.x, Python >= 3.10.x

## Architecture

### Server (`packages/server/`)

- **Entry:** `src/main.ts` (Electron) -> `src/server/index.ts` (`BlueBubblesServer` singleton)
- **HTTP API:** Koa + koa-router; routes in `src/server/api/v1/httpRoutes.ts`
- **Real-time:** Socket.IO; events in `src/server/api/v1/socketRoutes.ts`
- **ORM:** TypeORM with better-sqlite3; databases in `src/server/databases/`
- **Services:** `src/server/services/` (FCM, proxy tunnels, webhooks, queue, scheduled messages, etc.)
- **Path aliases:** `@server`, `@windows`, `@trays` (configured in tsconfig.json and webpack)

### UI (`packages/ui/`)

- React 18, Chakra UI, Redux Toolkit, React Router, Framer Motion
- Built with react-app-rewired targeting `electron-renderer`
- Source in `src/app/` (slices, components, layouts, hooks, actions, containers)

## Code Conventions

- TypeScript strict mode (server has `strictNullChecks: false`)
- `experimentalDecorators` and `emitDecoratorMetadata` enabled in server
- Prettier: 4-space indent, 120 char print width, double quotes, semicolons, no trailing commas, avoid arrow parens
- ESLint: extends recommended + @typescript-eslint + prettier; server max-len 120
- Lint-staged + Husky pre-commit hooks on the server package

## Key Patterns

- **Singleton:** `Server()` function for global server access
- **Repository:** `ServerRepository`, `MessageRepository`, `FindMyRepository`
- **Serializers:** `MessageSerializer`, `ChatSerializer`, `HandleSerializer`, `AttachmentSerializer`
- **Interfaces:** `GeneralInterface`, `MessageInterface`, `MacOsInterface`, `AlertsInterface`, `ContactInterface`
- **Decorators:** `@AsyncSingletonDecorator`, `@DebounceDecorator`, `@AsyncRetryerDecorator`
- **Event-driven:** `BlueBubblesServer` extends `EventEmitter`
- **Transformers:** DB column conversion for Cocoa dates, booleans, JSON, base64

## Database

- **Server config DB:** `config.db` via TypeORM -- entities: Config, Alert, Device, Queue, Webhook, Contact, ContactAddress, ScheduledMessage
- **iMessage DB:** read-only connection to `~/Library/Messages/chat.db` -- entities: Chat, Handle, Message, Attachment
- **Pollers:** `MessagePoller` and `ChatChangePoller` detect iMessage changes by watching `chat.db` and `chat.db-wal`
- iMessage stores dates as Cocoa timestamps (seconds since 2001-01-01); transformers handle conversion automatically

## Git Workflow

- Branch naming: `<name>/<feature>` (e.g. `zach/improved-animations`)
- PRs target the `development` branch
- CI runs on push to `master` (macOS-13, Node 22, Python 3.10)
