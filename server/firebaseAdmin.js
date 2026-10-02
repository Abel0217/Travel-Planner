const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    admin.initializeApp({
      projectId: process.env.REACT_APP_PROJECT_ID || 'travel-planner-20f6c',
    });
    console.log(`Firebase Admin using Auth emulator at ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
  } else {
    const serviceAccount = require('./credentials/serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.REACT_APP_DATABASE_URL || `https://${process.env.REACT_APP_PROJECT_ID}.firebaseio.com`,
    });
  }
}

module.exports = admin;
