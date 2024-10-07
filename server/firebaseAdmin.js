const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://travel-planner-20f6c.firebaseio.com' 
});

const db = admin.firestore();
module.exports = db;
