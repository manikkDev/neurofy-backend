import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import http from "http";
import app from "./app";
import { env, connectDatabase } from "./config";
import { initializeSocket } from "./sockets";
import { startSerialIngestion, stopSerialIngestion } from "./modules/serial";

async function startServer(): Promise<void> {
  // Connect to MongoDB
  await connectDatabase();

  // Create HTTP server from Express app
  const httpServer = http.createServer(app);

  // Initialize Socket.IO
  initializeSocket(httpServer);

  // Start listening
  httpServer.listen(env.PORT, () => {
    console.log(`[Server] Neurofy backend running on port ${env.PORT}`);
    console.log(`[Server] Environment: ${env.NODE_ENV}`);
    console.log(`[Server] Health check: http://localhost:${env.PORT}/api/health`);

    // Start serial ingestion after server is ready
    startSerialIngestion();
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("[Server] Shutting down...");
    stopSerialIngestion();
    httpServer.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch((error) => {
  console.error("[Server] Failed to start:", error);
  process.exit(1);
});
