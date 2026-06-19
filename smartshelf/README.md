# SmartShelf

SmartShelf is an intelligent pharmacy inventory management system built for pharmacies in Sierra Leone. It combines real-time stock tracking, AI-powered medical guidance, WhatsApp-based authentication and chatbot support, and offline-first data access so staff can work even without a stable internet connection.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [AI Tools](#ai-tools)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running Locally](#running-locally)
- [WhatsApp Server Setup](#whatsapp-server-setup)
- [Deployment](#deployment)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Development Environment](#development-environment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Inventory Management**: Track medicines, stock levels, expiry dates, reorder thresholds, and costs.
- **Sales & Restock**: Record sales, bulk sales, and send restock orders to suppliers via WhatsApp.
- **AI Chatbot**: WhatsApp chatbot grounded in uploaded Standard Treatment Guidelines (STGs) and live inventory data.
- **WhatsApp OTP Authentication**: Login via one-time password sent to the user's WhatsApp number.
- **Offline-First**: Service worker and IndexedDB caching let the app load and function offline.
- **Role-Based Access**: Super admin, admin, and pharmacist roles with protected routes.
- **Document Upload**: Upload PDF guidelines for the AI to learn from.
- **Diagnostics**: Endpoint to verify environment variables, OpenAI access, and WhatsApp server status.
- **Responsive UI**: Modern dashboard built with Tailwind CSS and shadcn/ui components.

## Tech Stack

### Frontend
- [Next.js](https://nextjs.org/) 16 — React framework with App Router
- [React](https://react.dev/) 19 — UI library
- [TypeScript](https://www.typescriptlang.org/) — type-safe development
- [Tailwind CSS](https://tailwindcss.com/) v4 — utility-first styling
- [shadcn/ui](https://ui.shadcn.com/) — accessible UI components
- [Zustand](https://zustand-demo.pmnd.rs/) — client state management

### Backend
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) — serverless API
- [Prisma](https://www.prisma.io/) — ORM and database schema management
- [PostgreSQL](https://www.postgresql.org/) (via [Neon](https://neon.tech/) or local) — relational database
- [Jose](https://github.com/panva/jose) — JWT signing and verification
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — password hashing

### File & Offline Storage
- [UploadThing](https://uploadthing.com/) — file uploads for PDF guidelines and medicine images
- [Dexie.js](https://dexie.org/) — IndexedDB wrapper for offline data
- Service Worker — runtime caching and offline page serving

### WhatsApp Integration
- Separate Node.js server (`whatsapp-server/`) using [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- Express server with webhook forwarding to SmartShelf
- Deployed on [Render](https://render.com/)

## AI Tools

- **OpenAI GPT-4o-mini** — powers the chatbot medical and inventory responses
- **RAG (Retrieval-Augmented Generation)** — searches uploaded STG documents and live inventory before answering
- **Geneline** — vector search and embeddings namespace used to retrieve guideline snippets

## Architecture

```
┌─────────────────┐      WhatsApp API      ┌──────────────────┐
│   User Phone    │  <----------------->   │ WhatsApp Server  │  (Render)
│                 │                        │  whatsapp-web.js │
└─────────────────┘                        └────────┬─────────┘
                                                    │ webhook (POST)
                                                    ▼
                                          ┌──────────────────┐
                                          │   SmartShelf     │  (Vercel)
                                          │  Next.js App     │
                                          │  - API Routes    │
                                          │  - RAG / Chatbot │
                                          │  - Prisma / DB   │
                                          └────────┬─────────┘
                                                   │
                                                   ▼
                                          ┌──────────────────┐
                                          │   PostgreSQL     │  (Neon)
                                          └──────────────────┘
```

## Prerequisites

- Node.js 20 or later
- npm or compatible package manager
- PostgreSQL database (local or Neon)
- OpenAI API key
- WhatsApp phone number for the bot
- UploadThing account and token
- (Optional) Vercel and Render accounts for deployment

## Installation

1. Clone the repository:

```bash
git clone https://github.com/KDiall/SmartShelf.git
cd SmartShelf/smartshelf
```

2. Install dependencies for the main app:

```bash
npm install
```

3. Install dependencies for the WhatsApp server:

```bash
cd ../whatsapp-server
npm install
```

## Environment Variables

Create a `.env` file in `smartshelf/` based on `env.txt`:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/smartshelf?sslmode=require"

# Auth
JWT_SECRET="your-jwt-secret-min-32-characters"

# OpenAI
OPENAI_API_KEY="sk-..."

# WhatsApp Server
WHATSAPP_SERVER_URL="https://nib-client.onrender.com"
WHATSAPP_API_KEY="nib_secret_key"

# Vector Search / Geneline
GENELINE_X_API_KEY="..."
GENELINE_X_NAMESPACE="smartshelf"

# UploadThing
UPLOADTHING_TOKEN="..."

# Public URL (used in some links and callbacks)
PUBLIC_BASE_URL="https://smart-shelf-neon.vercel.app"
```

Create a `.env` file in `whatsapp-server/`:

```env
PORT=10000
CLIENT_PHONE_E164=+23274050353
API_KEY=nib_secret_key
AGENT_URL=https://smart-shelf-neon.vercel.app/api/webhooks/whatsapp
AGENT_API_KEY=nib_secret_key
```

> **Security note:** keep production keys out of Git. Use Vercel and Render environment variable dashboards instead.

## Database Setup

1. Generate the Prisma client:

```bash
npm run postinstall
```

2. Run migrations:

```bash
npm run prisma:migrate
```

3. (Optional) Seed the database:

```bash
npm run prisma:seed
```

4. Open Prisma Studio to inspect data:

```bash
npm run prisma:studio
```

## Running Locally

1. Start the main application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

2. In a separate terminal, start the WhatsApp server:

```bash
cd whatsapp-server
npm start
```

3. Scan the QR code printed in the WhatsApp server terminal with the WhatsApp app to connect the bot number.

## WhatsApp Server Setup

The WhatsApp server is a separate Express application that acts as a bridge between WhatsApp Web and SmartShelf.

1. Deploy `whatsapp-server/` to Render (Web Service).
2. Set the environment variables listed above.
3. Connect the phone number by scanning the QR code from the Render logs.
4. Make sure `AGENT_URL` points to your deployed SmartShelf `/api/webhooks/whatsapp` endpoint.
5. Verify the `API_KEY` matches SmartShelf's `WHATSAPP_API_KEY`.

## Deployment

### SmartShelf (Vercel)

1. Import the GitHub repo in Vercel.
2. Set the root directory to `smartshelf` if needed.
3. Add all environment variables from the `.env` template.
4. Deploy. Vercel will run `npm run build` automatically.

### WhatsApp Server (Render)

1. Create a new Web Service on Render.
2. Connect the same GitHub repo.
3. Set the root directory to `whatsapp-server`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add the environment variables.
7. Deploy and connect the WhatsApp number.

## Usage

### For Admins

1. Log in with your phone number and the OTP sent via WhatsApp.
2. Go to **Settings** to view WhatsApp connection status and trigger reconnect if needed.
3. Go to **Medical Guidelines** to upload STG PDFs for the AI chatbot.
4. Add users, manage pharmacies, and set stock thresholds.

### For Pharmacists

1. Log in with your phone number and OTP.
2. View the dashboard for low-stock and expiring medicines.
3. Record sales, bulk sales, and restock orders.
4. Receive restock reminders via WhatsApp.

### For WhatsApp Users

1. Send a message to the connected WhatsApp number (`+23274050353`).
2. Ask inventory questions (e.g., "Do we have paracetamol?") or medical guidance questions.
3. The bot replies using live inventory data and uploaded treatment guidelines.

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` — send OTP to a phone number
- `POST /api/auth/verify-otp` — verify OTP and receive JWT

### WhatsApp
- `POST /api/webhooks/whatsapp` — incoming WhatsApp message webhook (protected by `x-api-key`)
- `GET /api/webhooks/whatsapp` — webhook health check
- `GET /api/webhooks/diagnostics` — environment and connection diagnostics (protected by `x-api-key`)
- `GET /api/admin/whatsapp` — WhatsApp server status (admin/super_admin)
- `POST /api/admin/whatsapp` — reconnect/init WhatsApp client (super_admin)

### Admin
- `GET /api/admin/users`
- `POST /api/admin/users`
- `GET /api/admin/guidelines`
- `POST /api/admin/guidelines`
- `DELETE /api/admin/guidelines`

### Inventory & Sales
- `GET /api/medicines`
- `POST /api/medicines`
- `GET /api/sales`
- `POST /api/sales`
- `POST /api/bulk-sale`
- `POST /api/restock`

### Uploads
- `GET /api/uploadthing` — UploadThing route handler

## Project Structure

```
smartshelf/
├── prisma/              # Prisma schema and migrations
├── public/              # Static assets and service worker
├── src/
│   ├── app/             # Next.js App Router pages and API routes
│   ├── components/      # React components and UI
│   ├── lib/             # Utility libraries (whatsapp, jwt, rag, etc.)
│   ├── store/           # Zustand stores
│   └── types/           # TypeScript types
├── whatsapp-server/     # Node.js WhatsApp Web bridge server
│   ├── index.js
│   ├── Dockerfile
│   └── package.json
└── README.md
```

## Development Environment

The project is developed in any modern IDE or editor. Recommended setup:

- **IDE**: VS Code, Windsurf, or Cursor
- **Node.js**: v20+
- **Package Manager**: npm
- **Browser**: Chrome, Firefox, or Edge

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| WhatsApp unavailable | Wrong `WHATSAPP_SERVER_URL` or server down | Check env var and Render logs |
| Bot replies "error processing request" | `AGENT_URL` points to old deployment | Update `AGENT_URL` to current Vercel domain |
| Webhook returns 401 | API key mismatch | Verify `WHATSAPP_API_KEY` and `AGENT_API_KEY` match |
| Upload fails | User role not allowed | Super admins and admins can upload guidelines |
| 504 from OpenAI | OpenAI temporarily unavailable | Retry later or check API key/billing |
| Offline pages not loading | Service worker not registered | Hard refresh or clear cache |

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-feature`.
3. Make changes and run tests/lint: `npm run lint` and `npm run build`.
4. Submit a pull request to `main`.

## License

This project is proprietary and maintained by the SmartShelf team. Contact the maintainers for licensing questions.

---

Built with Next.js, React, Prisma, and OpenAI for modern pharmacy operations in Sierra Leone.
