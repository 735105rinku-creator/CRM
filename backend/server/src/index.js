import http from "http";

import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./socket/socket.js";

const startServer = async () => {
  try {
    console.clear();

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 Starting OPAS CRM Backend...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Connect Database
    console.log("📦 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ MongoDB Connected");

    // Create HTTP Server
    const httpServer = http.createServer(app);

    // Initialize Socket.IO
    initSocket(httpServer);
    console.log("🔌 Socket.IO Initialized");

    // Start Server
    httpServer.listen(env.PORT, () => {
      console.log("");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎉 OPAS CRM Backend Started Successfully");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🌍 Environment : ${env.NODE_ENV}`);
      console.log(`🚪 Port        : ${env.PORT}`);
      console.log(`🔗 API URL     : ${env.API_PUBLIC_URL || `http://localhost:${env.PORT}`}`);
      console.log(`⚡ Socket.IO   : Enabled`);
      console.log(`🕒 Started At  : ${new Date().toLocaleString()}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("");
    });

    httpServer.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error("");
        console.error("❌ Server Startup Failed");
        console.error(`Port ${env.PORT} is already in use.`);
      } else {
        console.error("");
        console.error("❌ Server Startup Failed");
        console.error(error);
      }

      process.exit(1);
    });
  } catch (error) {
    console.error("");
    console.error("❌ Failed to Start Server");
    console.error(error);
    process.exit(1);
  }
};

startServer();