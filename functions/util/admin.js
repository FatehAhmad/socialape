const admin = require('firebase-admin');
const firebase = require('firebase');
const serviceAccount = require('../socialape-5de9f-firebase-adminsdk-jlz9u-59bc687893.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://console.firebase.google.com/project/socialape-5de9f/database/firestore/data~2Fscreams~2FwoaydxzxFhpNwKKMjn7D",
    storageBucket: "https://console.firebase.google.com/project/socialape-5de9f/storage/socialape-5de9f.appspot.com"
});

// admin.initializeApp();


const db = admin.firestore();

module.exports = { admin, db };