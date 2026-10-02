# Travel Planner Web App

**Copyright © 2024 Abel Mesfin. All Rights Reserved.**

---

## Overview

The **Travel Planner Web App** is a comprehensive platform designed to simplify planning and managing trips. From creating itineraries to collaborating with friends, the app offers all the tools you need to organize your travels seamlessly. It’s perfect for solo travelers, group planners, and frequent flyers, providing an intuitive and feature-rich experience.

With collaborative tools like a live chat feature and shared itineraries, this app helps you stay connected with your travel companions. The interface uses a navy (`#222946`) and gold (`#f3ab03`) theme across navigation, forms, chat, and the travel guide.

---

## Features

### Accounts
- Sign up and log in with email and password, or with Google.
- An Apple button is on the login and signup pages for when Apple sign-in is available.
- New email accounts are asked to verify their address before signing in.
- Forgot-password sends a reset email from the login page.
- Passwords need 8 or more characters, an uppercase letter, a number, and a symbol.
- Login and signup sit on a navy page with wide landscape photos of famous places. Portrait shots are left out so towers are not cropped. Labels include Big Ben (London, UK), the Eiffel Tower (Paris, France), Pisa (Pisa, Italy), and the Statue of Liberty (New York, USA).

### Home
- A welcome dashboard after you sign in.
- Shortcuts to create an itinerary, open your upcoming trip, split expenses, and read notifications.
- Recent alerts can jump straight to chat, friends, expenses, or the trip they belong to.

### Itinerary Management
- Create and customize detailed travel itineraries, then open them from the itinerary list.
- Filter upcoming and past trips, edit a trip you host, invite friends, or leave a trip you were invited to.
- Each trip has Overview, Bookings, My Bookings, Expenses, Notes, and Live Chat.
- A dock on the trip page can open **Ask Leo** for that destination.

### Overview
- A day-by-day view of what is booked, with pins for places that have an address.
- The same map appears above Bookings and My Bookings and refreshes when a booking is added, changed, or removed.
- Directions between stops cover walking, transit, and driving, with distance and time.
- Maps use Google Maps when it is available, and a backup map when it is not.

### Bookings
- Add flights, hotels, restaurants, activities, and transportation.
- Forms stay short and check that dates fit the trip.
- Upload a confirmation and pull details into the form.
- My Bookings lists what you have already saved, grouped by type.
- Guests can look through a shared trip. Hosts manage edits and who is on the trip.

### Expenses
- Log a cost for a trip, with a title, amount, date, and a category (flight, hotel, restaurant, activity, transport, or other).
- Split evenly across the group, or enter custom shares.
- See each person’s balance so it is clear who owes what.
- Upload a receipt when you add an expense.
- Open expenses for every trip, or from inside one itinerary.

### Friends
- Add a friend by email and send, accept, or decline requests.
- See friends you already travel with, and shared trips you have finished together.
- Invite a friend onto one of your itineraries from their profile on this page.

### Notifications and Email
- An in-app feed for trips, expenses, bookings, and friends, with filters for each.
- Unread chat messages are pulled into the same feed.
- On your profile, choose which emails you want:
  - **Bookings & Updates** for changes to flights, stays, reservations, and activities.
  - **Countdowns & Summaries** for upcoming-trip reminders and post-trip wrap-ups.
  - **Expenses & Payments** for shared costs and balances.
  - **Invites & Friends** for trip invitations and friend requests.
  - **Trip Chat** for an email when someone messages a trip you are on.

### Live Chat
- A live chat tab on every itinerary, for everyone on that trip.
- Send messages, reply to a message, and drop a GIF from the picker (trending, travel, and other categories, plus search).
- A lone image or GIF link is sent as a picture.
- **Seen** shows who has viewed your latest message.

### Ask Leo Travel Guide
- A full-screen guide at Ask Leo.
- Pick a country and city, then ask about that place.
- When a trip is open, Leo can use the saved itinerary for context.
- Add a suggestion to a trip from the guide.

### Profile
- Update your first and last name, date of birth, and profile photo.
- Crop an upload or choose one of the built-in avatars.
- The navbar uses that photo, and falls back if a link fails to load.
- Email preferences for the categories above live on this page.

### Footer
- On login and signup, a short footer with the logo and “Plan every day. Split every cost. Travel together.”
- When you are signed in, the footer links to Home, Create Itinerary, View Itineraries, Ask Leo, Friends, Expenses, Notifications, and Profile.
- Short tips cover planning together, splitting costs, and asking Leo.
- Ask Leo hides the footer so the guide can use the full screen.

### Itinerary Sharing
- Share itineraries with assigned host and guest roles:
  - **Host**: Full control over itinerary edits, participant management, and deletions.
  - **Guests**: View and interact with shared itineraries without editing rights.
- Guests can leave shared itineraries independently.
- Shared notes stay on the trip, including packing lists, day plans, food lists, and important info.

---

## Technology Stack

### Frontend
- **React.js**: For a dynamic and responsive user interface.
- **Material-UI**: Modern, customizable components.
- **React DatePicker**: Simplifies date and time selection.
- **Google Maps API**: Location search, trip pins, and directions, with a backup map when Maps is unavailable.

### Backend
- **Node.js**: Server-side operations and API management.
- **Express.js**: Simplified API routing and middleware functionality.
- **PostgreSQL**: Database for managing user data, itineraries, bookings, friends, and expenses.
- **Firebase**: Secure authentication, profile data, and real-time updates for chat and notes.
- **Gemini**: Powers Ask Leo, the travel guide.

---

## How It Works

1. **Sign Up**: Create an account with email or use Google. Verify your email when you sign up with a password.
2. **Create Itineraries**: Add the trip title, destination, and dates, then open it from Home or the itinerary list.
3. **Build the Trip**: Use Overview to see the days, add bookings, write notes, and check the map and directions.
4. **Collaborate with Friends**: Add friends, invite them onto a trip, and share host or guest access.
5. **Live Chat**: Talk in the trip’s Live Chat tab, send a GIF, and see when your message has been seen.
6. **Ask Leo**: Open the travel guide for ideas about a city, then add a suggestion to the trip.
7. **Manage Money**: Log expenses, split them evenly or with custom shares, and turn email alerts on or off from your profile.

---

## Key Use Cases

- **Solo Travelers**: Keep all trip details, bookings, notes, and maps organized in one place.
- **Group Planners**: Collaborate with friends, chat in real time, and manage shared itineraries easily.
- **Frequent Flyers**: Track flights, hotel bookings, transport, and who owes what on each trip.

---

## License
Copyright © 2024 Abel Mesfin. All Rights Reserved.

Permission is NOT granted to use, copy, modify, or distribute this software or its documentation without prior written consent from the author. Unauthorized use of this project is strictly prohibited.

By using this repository, you agree to respect the intellectual property rights of the creator.

---

## Support

Have questions or suggestions? Reach out to me:
- **Email**: abelstar10@gmail.com
- **GitHub**: [Abel0217](https://github.com/Abel0217)

---

## Enjoy Your Travel Planning!
