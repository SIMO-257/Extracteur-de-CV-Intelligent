FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    npm cache clean --force && \
    npm install --no-audit

COPY . .

EXPOSE 5000
CMD ["npm", "start"]
