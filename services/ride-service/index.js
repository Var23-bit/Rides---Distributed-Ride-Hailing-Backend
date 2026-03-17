const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { query, eventBus } = require('shared');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const LOCATION_SERVICE_URL = process.env.LOCATION_SERVICE_URL || 'http://localhost:3002';
const FARE_SERVICE_URL = process.env.FARE_SERVICE_URL || 'http://localhost:3003';

// 1. Create a ride request
app.post('/rides/request', async (req, res) => {
  const { riderId, pickup, dropoff } = req.body;
  
  if (!riderId || !pickup || !dropoff) {
    return res.status(400).json({ error: 'Missing riderId, pickup, or dropoff coordinates' });
  }

  try {
    // a. Find nearest driver via Location Service
    const locationRes = await axios.get(`${LOCATION_SERVICE_URL}/drivers/nearby`, {
      params: { lat: pickup.lat, lng: pickup.lng, radius: 5 }
    });

    const drivers = locationRes.data.drivers;
    if (!drivers || drivers.length === 0) {
      return res.status(404).json({ error: 'No drivers available nearby' });
    }

    // Pick the closest driver
    const selectedDriver = drivers[0].driverId;

    // b. Get fare estimate (Optional for booking, but good for MVP)
    let fareEstimate = null;
    try {
        const fareRes = await axios.post(`${FARE_SERVICE_URL}/fares/estimate`, { pickup, dropoff });
        fareEstimate = fareRes.data.estimate;
    } catch (e) {
        console.warn('Could not get fare estimate, proceeding without it', e.message);
    }

    // c. Create Trip in DB
    const sql = `
      INSERT INTO trips (rider_id, driver_id, pickup_coords, dropoff_coords, status)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), ST_SetSRID(ST_MakePoint($5, $6), 4326), 'REQUESTED')
      RETURNING trip_id, status, created_at
    `;
    const result = await query(sql, [
      riderId, 
      selectedDriver, 
      pickup.lng, pickup.lat, 
      dropoff.lng, dropoff.lat
    ]);

    const trip = result.rows[0];

    // d. Publish event
    await eventBus.publish('trip_events', 'TRIP_REQUESTED', {
      tripId: trip.trip_id,
      riderId,
      driverId: selectedDriver,
      pickup,
      dropoff,
      timestamp: trip.created_at
    });

    res.status(201).json({ 
        message: 'Ride requested successfully', 
        tripId: trip.trip_id,
        driverId: selectedDriver,
        status: trip.status,
        fareEstimate 
    });

  } catch (err) {
    console.error('Error creating ride request:', err.message);
    res.status(500).json({ error: 'Internal server error while requesting ride' });
  }
});

// 2. Get Trip Details
app.get('/rides/:id', async (req, res) => {
  try {
    const sql = `
      SELECT trip_id, rider_id, driver_id, status, fare, created_at, updated_at,
             ST_X(pickup_coords::geometry) as pickup_lng, ST_Y(pickup_coords::geometry) as pickup_lat,
             ST_X(dropoff_coords::geometry) as dropoff_lng, ST_Y(dropoff_coords::geometry) as dropoff_lat
      FROM trips WHERE trip_id = $1
    `;
    const result = await query(sql, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Update Trip Status (Accept, Start, End)
app.patch('/rides/:id/status', async (req, res) => {
  const tripId = req.params.id;
  const { status } = req.body; // e.g., 'ACCEPTED', 'STARTED', 'ENDED'
  const validStatuses = ['ACCEPTED', 'STARTED', 'ENDED', 'CANCELED'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    // If ending, calculate final fare first (Mocked implementation using distance)
    let finalFare = null;
    if (status === 'ENDED') {
        const tripRes = await query(`
            SELECT ST_X(pickup_coords::geometry) as p_lng, ST_Y(pickup_coords::geometry) as p_lat,
                   ST_X(dropoff_coords::geometry) as d_lng, ST_Y(dropoff_coords::geometry) as d_lat
            FROM trips WHERE trip_id = $1
        `, [tripId]);
        
        if (tripRes.rows.length > 0) {
            const t = tripRes.rows[0];
            try {
                // Call Fare Service
                const fareRes = await axios.post(`${FARE_SERVICE_URL}/fares/estimate`, { 
                    pickup: { lat: t.p_lat, lng: t.p_lng }, 
                    dropoff: { lat: t.d_lat, lng: t.d_lng } 
                });
                finalFare = fareRes.data.estimate;
            } catch (e) {
                console.warn('Fare service unavailable, defaulting fare');
                finalFare = 15.00; // fallback
            }
        }
    }

    let sql = `UPDATE trips SET status = $1, updated_at = CURRENT_TIMESTAMP`;
    const params = [status];
    
    if (finalFare !== null) {
        sql += `, fare = $2`;
        params.push(finalFare);
        sql += ` WHERE trip_id = $` + params.length;
        params.push(tripId);
    } else {
        sql += ` WHERE trip_id = $2`;
        params.push(tripId);
    }
    
    sql += ` RETURNING *`;
    
    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const updatedTrip = result.rows[0];

    // Publish event for History / Payment services
    await eventBus.publish('trip_events', `TRIP_${status}`, {
      tripId,
      driverId: updatedTrip.driver_id,
      riderId: updatedTrip.rider_id,
      status,
      fare: updatedTrip.fare,
      timestamp: updatedTrip.updated_at
    });

    res.status(200).json({ message: `Trip status updated to ${status}`, trip: updatedTrip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error while updating status' });
  }
});

// Basic healthcheck
app.get('/health', (req, res) => res.status(200).send('OK'));

app.listen(PORT, () => {
  console.log(`Ride Service listening on port ${PORT}`);
});
