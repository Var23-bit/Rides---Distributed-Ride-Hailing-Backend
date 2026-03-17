FROM node:18-alpine

WORKDIR /app

# Copy the shared directory first since the service depends on it
COPY shared /shared

# Setup working directory for the service
WORKDIR /app/service

COPY services/location-service/package*.json ./

RUN npm install --prefix /shared && npm install

COPY services/location-service/ ./

EXPOSE 3002

CMD ["npm", "start"]
