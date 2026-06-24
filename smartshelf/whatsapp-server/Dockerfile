# Use a stable Node.js image and install Google Chrome ourselves.
# The official puppeteer/puppeteer:latest image no longer bundles the exact
# Chrome version Puppeteer expects, which causes "Could not find Chrome" errors.
FROM node:20-slim

# Install Chrome dependencies and utilities
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    libgbm1 \
    libxss1 \
    libgtk-3-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome Stable
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache-bust: increment this to force a full rebuild (Docker layer cache)
ARG CACHEBUST=2

# Prevent puppeteer from downloading its own Chrome during npm install.
# We already installed the system Chrome above.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV SESSION_DIR=/data/.wwebjs_auth
ENV SKIP_NETWORK_CHECK=true
ENV NODE_OPTIONS="--max-old-space-size=256 --expose-gc"

COPY package*.json ./
RUN npm install

# Invalidate cache when CACHEBUST changes
RUN echo "build ${CACHEBUST}"

COPY . .

# Create session directory on the persistent disk Render mounts at /data
RUN mkdir -p /data/.wwebjs_auth && chmod -R 777 /data

# Render expects services to listen on port 10000 by default
EXPOSE 10000

CMD mkdir -p /data/.wwebjs_auth && node index.js
