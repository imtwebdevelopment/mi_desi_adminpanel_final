import admin from "firebase-admin";

// Initialize admin
if (!admin.apps.length) {
  // Ensure that environment variables exist before initializing
  const projectId = process.env.PROJECT_ID;
  const clientEmail = process.env.CLIENT_EMAIL;
  const privateKey = process.env.PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  } else {
    // If credentials are not present (e.g., local development without Vercel config),
    // initialize using default application credentials (falls back to local gcloud/firebase environment)
    admin.initializeApp();
  }
}

export default async function handler(req, res) {
  // CORS HEADERS — REQUIRED
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { title, body, fcmToken, screen } = req.body;

  if (!title || !body || !fcmToken) {
    return res.status(400).json({ error: "Missing required fields (title, body, fcmToken)" });
  }

  try {
    const messageId = await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: { screen: screen || "Notification" },
    });

    return res.status(200).json({
      success: true,
      messageId,
    });
  } catch (error) {
    console.error("FCM SEND ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
