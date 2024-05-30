const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Ensure this path is correct

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://travel-planner-20f6c.firebaseio.com' // Replace with your actual database URL
});

const db = admin.firestore();
module.exports = db;
