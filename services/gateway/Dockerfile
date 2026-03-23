FROM node:18-alpine

WORKDIR /app

COPY services/gateway/package*.json ./
RUN npm install

COPY services/gateway/ ./

EXPOSE 80

CMD ["npm", "start"]
