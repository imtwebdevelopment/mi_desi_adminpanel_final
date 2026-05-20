const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post("/sendNotificationProxy", async (req, res) => {
  try {
    const { title, body, fcmToken, screen } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ error: "Missing FCM token" });
    }

    const message = {
      token: fcmToken,
      notification: {
        title: title,
        body: body,
      },
      data: {
        screen: screen || "Notification",
      },
    };

    const messageId = await admin.messaging().send(message);
    return res.status(200).json({ success: true, messageId });

  } catch (error) {
    console.error("FCM SEND ERROR:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/updatePassword", async (req, res) => {
  try {
    const { uid, newPassword } = req.body;

    if (!uid || !newPassword) {
      return res.status(400).json({ error: "Missing uid or password" });
    }

    await admin.auth().updateUser(uid, {
      password: newPassword,
    });

    return res.status(200).json({ success: true, message: "Password updated successfully" });

  } catch (error) {
    console.error("Password update error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

exports.createPartnerUser = functions.https.onCall(async (request) => {
  try {
    console.log("Full request:", request);
    console.log("Request data:", request.data);

    const { email, password, name, mobileNumber } = request.data;

    if (!email || !password) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email and password required"
      );
    }

    const userRecord = await admin.auth().createUser({
      email: email.trim().toLowerCase(),
      password: password,
    });

    await admin.firestore().collection("partners").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email.trim().toLowerCase(),
      name: name || "",
      mobileNumber: mobileNumber || "",
      role: "employee",
      status: "Active",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      fcmToken: "",
    });

    return { uid: userRecord.uid };

  } catch (error) {
    console.error("CREATE USER ERROR:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.api = functions.https.onRequest(app);
