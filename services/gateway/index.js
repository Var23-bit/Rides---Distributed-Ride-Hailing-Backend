const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());
app.use(express.json());

const RIDE_URL = process.env.RIDE_SERVICE_URL || 'http://ride-service:3001';
const LOCATION_URL = process.env.LOCATION_SERVICE_URL || 'http://location-service:3002';
const FARE_URL = process.env.FARE_SERVICE_URL || 'http://fare-service:3003';

const makeProxy = (target) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => path,
    logLevel: 'warn',
  });

app.use('/rides', makeProxy(RIDE_URL));
app.use('/health', makeProxy(RIDE_URL));
app.use('/drivers', makeProxy(LOCATION_URL));
app.use('/fares', makeProxy(FARE_URL));

app.get('/', (req, res) => {
  res.json({
    message: 'Ride Hailing API Gateway',
    routes: {
      rides: '/rides',
      drivers: '/drivers',
      fares: '/fares',
      health: '/health',
    },
  });
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Gateway listening on port ${PORT}`);
});
