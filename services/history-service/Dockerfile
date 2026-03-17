FROM node:18-alpine
WORKDIR /app
COPY shared /shared
WORKDIR /app/service
COPY services/history-service/package*.json ./
RUN npm install --prefix /shared && npm install
COPY services/history-service/ ./
CMD ["npm", "start"]
