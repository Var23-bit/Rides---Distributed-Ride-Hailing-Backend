const { query, eventBus } = require('shared');

const STREAM_NAME = 'trip_events';
const GROUP_NAME = 'history_service_group';
const CONSUMER_NAME = `history_worker_${process.pid}`;

async function processEvent(event) {
  const { eventType, payload } = event;
  const tripId = payload.tripId || null;

  try {
    console.log(`[History Service] Logging Event: ${eventType} for Trip: ${tripId}`);
    
    // Insert into events_log table
    const sql = `
      INSERT INTO events_log (trip_id, event_type, payload)
      VALUES ($1, $2, $3)
    `;
    await query(sql, [tripId, eventType, payload]);
    
  } catch (err) {
    console.error(`[History Service] Failed to log event ${eventType}`, err);
    throw err; // Re-throw to prevent ack if storing fails
  }
}

async function start() {
  console.log('History Service Booting...');
  
  // Wait a bit to ensure Redis is fully up before creating groups
  setTimeout(() => {
    eventBus.consume(STREAM_NAME, GROUP_NAME, CONSUMER_NAME, processEvent);
  }, 2500);
}

start();
