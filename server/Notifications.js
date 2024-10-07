const cron = require('node-cron');
const db = require('./database/dbOperations');

// Schedule a task to check for upcoming notifications every day at 9 AM
cron.schedule('0 9 * * *', async () => {
    console.log('Checking for upcoming notifications...');

    try {
        // Fetch upcoming itineraries (7 days)
        const itineraries = await db.fetchUpcomingItineraries();
        for (const itinerary of itineraries) {
            const message = `Reminder: Your itinerary to ${itinerary.destinations} starts in ${itinerary.start_date}`;
            await db.addNotification(itinerary.owner_id, itinerary.itinerary_id, message);
        }

        // Fetch upcoming flights (5 days)
        const flights = await db.fetchUpcomingFlights();
        for (const flight of flights) {
            const message = `Reminder: Your flight to ${flight.arrival_airport} departs in ${flight.departure_time}`;
            await db.addNotification(flight.owner_id, flight.itinerary_id, message);
        }

        // Fetch upcoming hotels (5 days)
        const hotels = await db.fetchUpcomingHotels();
        for (const hotel of hotels) {
            const message = `Reminder: Your hotel stay at ${hotel.hotel_name} starts on ${hotel.check_in_date}`;
            await db.addNotification(hotel.owner_id, hotel.itinerary_id, message);
        }

        // Fetch upcoming activities (3 days)
        const activities = await db.fetchUpcomingActivities();
        for (const activity of activities) {
            const message = `Reminder: Your activity at ${activity.location} starts on ${activity.activity_date}`;
            await db.addNotification(activity.owner_id, activity.itinerary_id, message);
        }

        // Fetch upcoming restaurants (3 days)
        const restaurants = await db.fetchUpcomingRestaurants();
        for (const restaurant of restaurants) {
            const message = `Reminder: Your reservation at ${restaurant.restaurant_name} is on ${restaurant.reservation_date}`;
            await db.addNotification(restaurant.owner_id, restaurant.itinerary_id, message);
        }

        // Fetch upcoming transport (3 days)
        const transports = await db.fetchUpcomingTransports();
        for (const transport of transports) {
            const message = `Reminder: Your transport from ${transport.pickup_location} to ${transport.dropoff_location} is on ${transport.pickup_time}`;
            await db.addNotification(transport.owner_id, transport.itinerary_id, message);
        }

    } catch (error) {
        console.error('Error scheduling notifications:', error);
    }
});
