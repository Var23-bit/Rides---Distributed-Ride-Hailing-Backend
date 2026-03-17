FROM node:18-alpine

WORKDIR /app

COPY shared /shared

WORKDIR /app/service

COPY services/ride-service/package*.json ./

RUN npm install --prefix /shared && npm install

COPY services/ride-service/ ./

EXPOSE 3001

CMD ["npm", "start"]
