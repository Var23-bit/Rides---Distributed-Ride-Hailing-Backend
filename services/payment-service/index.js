const { eventBus } = require('shared');

const STREAM_NAME = 'trip_events';
const GROUP_NAME = 'payment_service_group';
const CONSUMER_NAME = `payment_worker_${process.pid}`;

async function processPayment(event) {
  if (event.eventType === 'TRIP_ENDED') {
    const trip = event.payload;
    const { tripId, riderId, fare } = trip;
    
    console.log(`[Payment Service] Processing payment for Trip: ${tripId}`);
    console.log(`[Payment Service] Charging Rider: ${riderId} amount: $${fare}`);
    
    // Simulate payment processing delay (e.g., calling Stripe)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`[Payment Service] Payment successful for Trip: ${tripId}. Amount: $${fare}`);
    
    // In a real system we would update a `payments` table here
  }
}

async function start() {
  console.log('Payment Service Booting...');
  
  // Wait a bit to ensure Redis is fully up before creating groups
  setTimeout(() => {
    eventBus.consume(STREAM_NAME, GROUP_NAME, CONSUMER_NAME, processPayment);
  }, 2000);
}

start();
