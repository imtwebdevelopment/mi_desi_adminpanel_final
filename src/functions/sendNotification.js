const functions = require('firebase-functions');
const fetch = require('node-fetch');

exports.sendNotification = functions.https.onCall(async (data, context) => {
  try {
    const response = await fetch('https://mi-desi-notification-service.vercel.app/api/sendNotification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return { success: response.ok, data: result };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});