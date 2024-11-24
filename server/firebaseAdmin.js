const admin = require('firebase-admin');
const serviceAccount = require('./credentials/serviceAccountKey.json');

// Check if Firebase has already been initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://travel-planner-20f6c.firebaseio.com' // Replace with your Firebase URL
  });
}

module.exports = admin;
