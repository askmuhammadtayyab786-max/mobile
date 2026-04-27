# FileForge — Full-Stack File Processing System

Production-grade file processing system built with **React + Vite**, **Node.js/Express**, **MongoDB**, and **Nginx**.

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Browser   │────▶│  Nginx :80       │────▶│  React/Vite    │
│             │     │  Reverse Proxy   │     │  Frontend :3000│
└─────────────┘     └────────┬─────────┘     └────────────────┘
                             │ /api/*
                    ┌────────▼─────────┐     ┌────────────────┐
                    │  Node.js/Express │────▶│  MongoDB :27017│
                    │  Backend :5000   │     └────────────────┘
                    └──────────────────┘
```

## Quick Start

```bash
# 1. Start all services
docker-compose up -d --build

# 2. Open the app
open http://localhost
```

## Project Structure

```
fileforge/
├── docker-compose.yml
├── mongo-init.js
├── nginx/
│   └── nginx.conf
├── frontend/                  ← Vite + React
│   ├── vite.config.js
│   ├── index.html
│   ├── Dockerfile
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css
│       ├── index.css
│       ├── utils/api.js
│       └── components/
│           ├── UploadZone.jsx
│           ├── FileGrid.jsx
│           ├── FilterBar.jsx
│           └── StatsPanel.jsx
└── backend/                   ← Express API
    ├── server.js
    ├── Dockerfile
    ├── .env.example
    ├── config/database.js
    ├── models/File.js
    ├── middleware/upload.js
    ├── controllers/fileController.js
    └── routes/files.js
```

## Local Development (without Docker)

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev          # http://localhost:5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173  (Vite dev server with proxy)
```

## API Reference

| Method   | Endpoint                      | Description              |
|----------|-------------------------------|--------------------------|
| `POST`   | `/api/files/upload`           | Upload files (multipart) |
| `GET`    | `/api/files`                  | List files + pagination  |
| `GET`    | `/api/files/:fileId`          | Get file metadata        |
| `GET`    | `/api/files/:fileId/download` | Download file            |
| `DELETE` | `/api/files/:fileId`          | Delete file              |
| `GET`    | `/api/files/stats/summary`    | Storage analytics        |
| `GET`    | `/api/health`                 | Health check             |

## Features

- Drag-and-drop multi-file upload with progress bars
- Auto category detection (image, video, audio, document, archive)
- Search, filter by category & status
- Analytics dashboard with storage breakdown
- 7-day auto-expiry via MongoDB TTL
- Rate limiting at Nginx (10/min upload, 30/min API)
- Security headers via Helmet + Nginx
- Gzip compression
- Docker health checks on all containers
