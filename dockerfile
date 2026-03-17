FROM node:18-alpine

WORKDIR /app

# Copy shared library
COPY shared /app/shared

# Install shared dependencies
WORKDIR /app/shared
RUN npm install

# Copy all services
COPY services /app/services

# Install ride-service (main entry point)
WORKDIR /app/services/ride-service
RUN npm install

# Install other services for background workers
WORKDIR /app/services/payment-service
RUN npm install

WORKDIR /app/services/history-service
RUN npm install

WORKDIR /app/services/location-service
RUN npm install

WORKDIR /app/services/fare-service
RUN npm install

# Set working directory back to ride-service
WORKDIR /app/services/ride-service

EXPOSE 3001

CMD ["npm", "start"]