import https from "https";

export default function handler(req, res) {

  // ✅ Add CORS headers for every request
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle browser preflight
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  // ✅ Allow only POST
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end("Only POST allowed");
  }

  let body = "";

  req.on("data", chunk => body += chunk);
  req.on("end", () => {

    try {
      const data = JSON.parse(body || "{}");

      const { title, body: message, fcmToken, screen } = data;

      if (!title || !message || !fcmToken) {
        res.statusCode = 400;
        return res.end("Missing fields");
      }

      const payload = JSON.stringify({
        title,
        body: message,
        fcmToken,
        screen
      });

      const request = https.request(
        "https://mi-desi-notification-service.vercel.app/api/sendNotification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload)
          }
        },
        response => {
          let result = "";
          response.on("data", chunk => result += chunk);
          response.on("end", () => {
            res.statusCode = response.statusCode || 200;
            res.end(result);
          });
        }
      );

      request.on("error", err => {
        console.error("Proxy error:", err);
        res.statusCode = 500;
        res.end("Proxy failed");
      });

      request.write(payload);
      request.end();

    } catch (err) {
      console.error("Parse error:", err);
      res.statusCode = 500;
      res.end("Invalid JSON");
    }

  });
}
