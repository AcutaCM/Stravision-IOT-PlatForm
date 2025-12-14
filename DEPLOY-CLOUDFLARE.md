# Cloudflare Deployment Guide

Since you are using Cloudflare, the setup is much simpler. You don't need to manage certificates on the server yourself (Let's Encrypt), because Cloudflare handles the edge certificates for you.

## 1. Cloudflare Settings

In your Cloudflare Dashboard:

1.  Go to **SSL/TLS** > **Overview**.
2.  Set the encryption mode to **Full** (or **Full (Strict)**).

    *   **Full**: Encrypts end-to-end, but allows self-signed certificates on your server. (Easiest, uses the `generate-certs.ps1` script).
    *   **Full (Strict)**: Requires a valid certificate on your server. You can use a Cloudflare Origin CA certificate for this.

## 2. Server Setup

### Option A: Using Self-Signed Certs (Simplest, "Full" Mode)

1.  **Generate Certificates**:
    Run the generation script locally or on the server:
    ```bash
    # If on Windows (Local)
    ./generate-certs.ps1
    
    # If on Linux Server
    mkdir -p nginx/certs
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout nginx/certs/nginx.key -out nginx/certs/nginx.crt -subj '/CN=localhost'
    ```

2.  **Deploy**:
    ```bash
    docker-compose down
    docker-compose up -d
    ```

### Option B: Using Cloudflare Origin CA (Best Practice, "Full (Strict)" Mode)

1.  **Generate Origin Cert**:
    *   In Cloudflare Dashboard, go to **SSL/TLS** > **Origin Server**.
    *   Click **Create Certificate**.
    *   Keep the default options (RSA 2048, hostnames).
    *   Copy the **Origin Certificate** content to `nginx/certs/nginx.crt`.
    *   Copy the **Private Key** content to `nginx/certs/nginx.key`.

2.  **Deploy**:
    ```bash
    docker-compose down
    docker-compose up -d
    ```

## 3. Real IP Configuration

`nginx/nginx.conf` has been pre-configured with Cloudflare's IP ranges. This ensures that your logs and application see the **real user IP address** instead of Cloudflare's proxy IP.
