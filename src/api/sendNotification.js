import admin from "firebase-admin";

// Initialize admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.PROJECT_ID,
      clientEmail: process.env.CLIENT_EMAIL,
      privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, "\n")
    })
  });
}

export default async function handler(req, res) {
  // 🔥 CORS HEADERS — REQUIRED
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(400).json({ error: "POST only" });
  }

  const { title, body, fcmToken, screen } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ error: "Missing FCM token" });
  }

  try {
    const messageId = await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: { screen: screen || "OrderDetails" }
    });

    return res.status(200).json({
      success: true,
      messageId
    });

  } catch (error) {
    console.error("FCM SEND ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
