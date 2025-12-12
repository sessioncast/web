# SessionCast Web

React-based web client for viewing and interacting with remote tmux terminal sessions.

## Features

- Real-time terminal streaming via xterm.js
- Google OAuth2 authentication
- Multi-session dashboard with machine grouping
- Session creation and management
- Responsive terminal with resize support
- Gzip decompression for optimized streaming
- Auto-reconnection with exponential backoff

## Screenshots

```
┌────────────────────────────────────────────────────────────────┐
│  SessionCast                              user@example.com  ⚙  │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ 🟢 dev-server│  │ 🟢 api-logs  │  │ 🔴 backup    │         │
│  │   machine-1  │  │   machine-1  │  │   machine-2  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
├────────────────────────────────────────────────────────────────┤
│  $ npm run build                                               │
│  > sessioncast-web@1.0.0 build                                │
│  > vite build                                                  │
│  ✓ Built in 2.3s                                              │
│  $                                                             │
└────────────────────────────────────────────────────────────────┘
```

## Requirements

- Node.js 18+
- npm or yarn

## Installation

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build
```

## Configuration

Set environment variables or create `.env`:

```env
VITE_API_URL=https://your-server.com
VITE_WS_URL=wss://your-server.com/ws
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | SessionCast server URL | `http://localhost:8080` |
| `VITE_WS_URL` | WebSocket endpoint | `ws://localhost:8080/ws` |

## Project Structure

```
src/
├── components/
│   ├── Header.tsx         # Navigation header
│   ├── SessionCard.tsx    # Session card component
│   ├── SessionList.tsx    # Session dashboard
│   └── Terminal.tsx       # xterm.js terminal
├── hooks/
│   └── useWebSocket.ts    # WebSocket connection hook
├── pages/
│   ├── Dashboard.tsx      # Main dashboard page
│   ├── Login.tsx          # Login page
│   └── TerminalView.tsx   # Terminal viewer page
├── types/
│   └── index.ts           # TypeScript types
├── App.tsx
└── main.tsx
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **xterm.js** - Terminal emulator
- **pako** - Gzip decompression
- **Tailwind CSS** - Styling

## WebSocket Protocol

The client connects to the server via WebSocket and handles:

```typescript
// Sending
{ type: 'register', role: 'viewer', session: 'machine/session' }
{ type: 'keys', session: 'machine/session', payload: 'keystroke' }
{ type: 'resize', session: 'machine/session', meta: { cols: '120', rows: '40' } }
{ type: 'listSessions' }
{ type: 'createSession', meta: { machineId: 'machine', sessionName: 'name' } }
{ type: 'killSession', session: 'machine/session' }

// Receiving
{ type: 'screen', session: 'machine/session', payload: '<base64>' }
{ type: 'screenGz', session: 'machine/session', payload: '<gzip-base64>' }
{ type: 'sessionList', sessions: [...] }
{ type: 'sessionStatus', session: 'machine/session', status: 'online|offline' }
```

## Deployment

### Static Hosting (Vercel, Netlify, etc.)

```bash
npm run build
# Deploy dist/ folder
```

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Nginx Configuration

```nginx
server {
    listen 80;
    root /var/www/sessioncast;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Development

```bash
# Start dev server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build
```

## Related Projects

- [sessioncast/server](https://github.com/sessioncast/server) - Relay server
- [sessioncast/agent](https://github.com/sessioncast/agent) - Terminal agent

## License

MIT License
