# This is a dockerized version of a server that you can easily deploy somewhere.
# If you don't want server rendering, you can safely delete this file.

FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  libnss3 \
  libxss1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatspi2.0-0 \
  libcups2 \
  libdbus-1-3 \
  libfontconfig1 \
  libgdk-pixbuf2.0-0 \
  libglib2.0-0 \
  libgtk-3-0 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxrandr2 \
  libxrender1 \
  libxtst6 \
  fonts-liberation \
  xdg-utils \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir app
COPY . ./app

WORKDIR /app

RUN npm install && npm run make

# Create non-privileged user for running the application
RUN groupadd -r pptruser && useradd -r -g pptruser pptruser

# Change ownership of app directory to pptruser
RUN chown -R pptruser:pptruser /app

# Run everything after as non-privileged user.
USER pptruser

EXPOSE 8000

CMD ["node", "dist/src/server/index.js"] 
