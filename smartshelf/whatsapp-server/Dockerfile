# Use a Node.js image with Chromium dependencies for Puppeteer
FROM ghcr.io/puppeteer/puppeteer:latest

USER root

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Create directory for session storage
RUN mkdir -p .wwebjs_auth && chown -R pptruser:pptruser .wwebjs_auth

# Use the non-root user from the base image
USER pptruser

EXPOSE 3700

CMD ["node", "index.js"]
