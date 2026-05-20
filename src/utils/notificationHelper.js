import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * Sends a push notification to a customer's FCM token.
 * If fcmToken is not provided, it fetches it from the customer's document in Firestore.
 * Triggers the Vercel serverless function with a fallback to the Firebase Cloud Function.
 * 
 * @param {Object} params
 * @param {string} params.customerId - Firestore UID of the customer
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification description message
 * @param {string} [params.screen] - Redirect screen name in the customer app (e.g., 'OrderDetails')
 * @param {string} [params.fcmToken] - Pre-fetched FCM token (optional)
 * @returns {Promise<boolean>} Resolves to true if successful, false otherwise
 */
export const sendPushNotification = async ({ customerId, title, body, screen = "Notification", fcmToken = null }) => {
  let targetFcmToken = fcmToken;

  // 1. Fetch token from Firestore if not provided
  if (!targetFcmToken && customerId) {
    try {
      const customerDoc = await getDoc(doc(db, "customers", customerId));
      if (customerDoc.exists()) {
        targetFcmToken = customerDoc.data().fcmToken || null;
      }
    } catch (error) {
      console.error(`[NotificationHelper] Error fetching FCM token for customer ${customerId}:`, error);
    }
  }

  if (!targetFcmToken) {
    console.warn(`[NotificationHelper] Skipping notification: No FCM Token found for customer ID ${customerId}`);
    return false;
  }

  const payload = {
    title,
    body,
    fcmToken: targetFcmToken,
    screen,
  };

  // 2. Try local Vercel serverless endpoint first (relative route /api/sendNotification)
  try {
    const response = await fetch("/api/sendNotification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log(`[NotificationHelper] Notification sent successfully via Vercel endpoint to ${customerId}`);
      return true;
    }
  } catch (error) {
    console.warn("[NotificationHelper] Vercel endpoint call failed, attempting Cloud Function fallback...", error);
  }

  // 3. Fallback to Cloud Function proxy endpoint
  try {
    const cfResponse = await fetch("https://us-central1-midesi-65562.cloudfunctions.net/api/sendNotificationProxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await cfResponse.json();
    if (cfResponse.ok && result.success) {
      console.log(`[NotificationHelper] Notification sent successfully via Cloud Function fallback to ${customerId}`);
      return true;
    } else {
      console.error("[NotificationHelper] Cloud Function fallback returned failure:", result);
    }
  } catch (cfError) {
    console.error("[NotificationHelper] All notification endpoints failed:", cfError);
  }

  return false;
};
