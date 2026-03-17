FROM node:18-alpine
WORKDIR /app/service
COPY services/fare-service/package*.json ./
RUN npm install
COPY services/fare-service/ ./
EXPOSE 3003
CMD ["npm", "start"]
