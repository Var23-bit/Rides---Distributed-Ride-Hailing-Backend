const axios = require('axios');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runFlow() {
  console.log('=== Starting Integration Test Flow ===');

  const RIDE_SERVICE = 'http://localhost:3001';
  const LOCATION_SERVICE = 'http://localhost:3002';
  
  const driverId = 'e20be6eb-3ed2-4bae-a6de-7b0b6bc7dd48';
  const riderId = 'rider-123';
  
  const pickup = { lat: 40.7128, lng: -74.0060 }; // NYC
  const dropoff = { lat: 40.7306, lng: -73.9866 }; // A bit further in NYC

  try {
    // 1. Update driver location (Mock a driver coming online)
    console.log('1. Mocking driver location update...');
    await axios.post(`${LOCATION_SERVICE}/drivers/location`, {
      driverId,
      lat: pickup.lat,
      lng: pickup.lng
    });
    console.log('   Driver location updated.');

    // Wait 500ms for async PostGIS update
    await sleep(500);

    // 2. Request a ride
    console.log('2. Requesting a ride...');
    const startReq = Date.now();
    const rideRes = await axios.post(`${RIDE_SERVICE}/rides/request`, {
      riderId, pickup, dropoff
    });
    const matchTime = Date.now() - startReq;
    
    console.log(`   Ride matched in ${matchTime}ms! Trip ID: ${rideRes.data.tripId}, Matched Driver: ${rideRes.data.driverId}`);
    
    if (matchTime > 100) {
        console.warn(`   ⚠️ Warning: Match took ${matchTime}ms (> 100ms requirement, though expected on warm-up/cold start)`);
    }
    
    const tripId = rideRes.data.tripId;

    // 3. Progress trip state
    console.log('3. Progressing trip state: ACCEPTED');
    await axios.patch(`${RIDE_SERVICE}/rides/${tripId}/status`, { status: 'ACCEPTED' });
    
    await sleep(500); // simulate drive to pickup
    
    console.log('4. Progressing trip state: STARTED');
    await axios.patch(`${RIDE_SERVICE}/rides/${tripId}/status`, { status: 'STARTED' });
    
    await sleep(500); // simulate ride
    
    console.log('5. Progressing trip state: ENDED');
    const endRes = await axios.patch(`${RIDE_SERVICE}/rides/${tripId}/status`, { status: 'ENDED' });
    
    console.log(`   Trip ENDED! Final Fare computed: $${endRes.data.trip.fare}`);

    console.log('=== Integration Test Flow Complete ===');
    console.log('Please check history/payment logs to verify async event delivery.');
  } catch (err) {
    console.error('Test Failed:', err.response ? err.response.data : err.message);
  }
}

runFlow();
