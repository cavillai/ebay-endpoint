# This is a dockerized version of a server that you can easily deploy somewhere.
# If you don't want server rendering, you can safely delete this file.

FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y \
  chromium-browser \
  libnss3 \
  libxss1 \
  libappindicator3-1 \
  libindicator7 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatspi2.0-0 \
  libcups2 \
  libdbus-1-3 \
  libfontconfig1 \
  libgconf-2-4 \
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
  libxfont2 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  fonts-liberation \
  xdg-utils \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir app
COPY . ./app

WORKDIR /app

RUN npm install && npm run make

# Run everything after as non-privileged user.
USER pptruser

EXPOSE 8000

CMD ["npm", "start"] 
