const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, './credentials/serviceAccountKey.json'));

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://travel-planner-20f6c.firebaseio.com"
    });
}

// Middleware to verify Firebase token and attach user info to req
const verifyToken = async (req, res, next) => {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const idToken = authorizationHeader.split('Bearer ')[1]; 

    try {
        // Verify the token using Firebase Admin SDK
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken; 
        next(); 
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({ error: 'Unauthorized: Token verification failed' });
    }
};

module.exports = verifyToken;
