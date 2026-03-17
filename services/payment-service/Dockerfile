FROM node:18-alpine
WORKDIR /app
COPY shared /shared
WORKDIR /app/service
COPY services/payment-service/package*.json ./
RUN npm install --prefix /shared && npm install
COPY services/payment-service/ ./
CMD ["npm", "start"]
