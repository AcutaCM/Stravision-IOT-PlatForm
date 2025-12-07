# Deployment Guide

This project has been configured for Docker deployment with Nginx as a reverse proxy.

## Prerequisites

- Docker
- Docker Compose

## Deployment Steps

1.  **Transfer Files**: Copy the entire project directory to your cloud server.
2.  **Build and Run**:
    Run the following command in the project root:

    ```bash
    docker-compose up -d --build
    ```

3.  **Verify**:
    -   Web Application: `http://<your-server-ip>`
    -   The application is now accessible on port 80 (default HTTP port).

## Architecture

The deployment uses Nginx to proxy requests to the backend services:

-   **Nginx (Port 80)**: The only exposed service.
    -   `/*` -> Proxies to Next.js App (Port 3000)
    -   `/inference/*` -> Proxies to AI Inference Server (Port 8000)
    -   `/inference/ws` -> Proxies WebSockets to AI Inference Server

-   **Next.js App (Internal Port 3000)**: Frontend and Backend API.
-   **Inference Server (Internal Port 8000)**: Python/FastAPI server for object detection.

## Configuration

-   **Data Persistence**:
    -   Database and session data are stored in `./data`.
    -   User avatars are stored in `./public/uploads`.
    -   These directories are mapped to the container, so data persists across restarts.

-   **Ports**:
    -   Only port **80** needs to be open in your server's firewall.

## Local Development

When running locally with `npm run dev` and `python models/inference_server.py`:
-   The frontend automatically detects the development environment and connects to `localhost:8000` for AI features.
-   Nginx is not required for local development.

## Troubleshooting

-   **Database Errors**: If you encounter SQLite errors, ensure the `data` directory has write permissions.
-   **WebSocket Connection**: If the AI camera features don't work, check the browser console. Ensure Nginx is running and correctly routing `/inference/ws`.
