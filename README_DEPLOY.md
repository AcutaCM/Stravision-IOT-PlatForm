# Deployment Guide (Ubuntu Server)

This guide assumes you have a fresh Ubuntu server (e.g., Ubuntu 20.04/22.04 LTS).

## 1. Install Docker & Git

Run the following commands on your server:

```bash
# Update package list
sudo apt-get update

# Install Docker and Git
sudo apt-get install -y docker.io docker-compose git

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

## 2. Clone the Repository

Clone the project from your Git repository:

```bash
# GitHub
git clone https://github.com/AcutaCM/Stravision-IOT-PlatForm.git

# OR Gitee (Faster in China)
git clone https://gitee.com/guantougitee/Stravision-IOT-PlatForm.git

# Enter the directory
cd Stravision-IOT-PlatForm
```

## 3. Configure Environment Variables

1.  Copy the example configuration file:
    ```bash
    cp .env.example .env
    ```

2.  Edit the `.env` file with your real credentials:
    ```bash
    nano .env
    ```
    *   **MQTT_***: Fill in your MQTT broker details (Host, Username, Password).
    *   **WEATHER_API_KEY**: Get a free key from [weatherapi.com](https://www.weatherapi.com/).
    *   **JWT_SECRET**: Set a random string for security.

    *Press `Ctrl+O` then `Enter` to save, `Ctrl+X` to exit.*

## 4. Start the Application

Build and start the containers using Docker Compose:

```bash
sudo docker-compose up -d --build
```

*   `--build`: Ensures images are built from scratch.
*   `-d`: Runs in detached mode (background).

## 5. Access the Application

Open your browser and visit:

*   **http://<YOUR_SERVER_IP>**

You should see the application running.

---

## Maintenance

### Updating Code
If you have pushed new code to Git, update the server with:

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart containers
sudo docker-compose up -d --build
```

### Viewing Logs
To see logs from the application:

```bash
# View all logs
sudo docker-compose logs -f

# View specific service logs (e.g., web app)
sudo docker-compose logs -f web
```
