import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config";
import { errorHandler, notFoundHandler } from "./middlewares";
import { sanitizeQuery, apiLimiter } from "./middlewares/security";
import apiRouter from "./routes";

const app = express();

// --- Security Middlewares ---
app.use(helmet({
  contentSecurityPolicy: false, // Allow frontend to load resources
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// --- Body Parsing with Size Limits ---
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// --- Query Sanitization ---
app.use(sanitizeQuery);

// --- Root Welcome Route ---
app.get("/", (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Neurofy API Server</title>
      <style>
        :root {
          --bg-color: #0B0F19;
          --card-bg: #111827;
          --border: #1F2937;
          --text-main: #F3F4F6;
          --text-muted: #9CA3AF;
          --brand-color: #4F46E5;
          --brand-hover: #4338CA;
          --accent-green: #10B981;
        }
        body {
          margin: 0; padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background-color: var(--bg-color);
          color: var(--text-main);
          line-height: 1.6;
        }
        .container { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem; }
        header { border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: flex-start; }
        h1 { margin: 0; font-size: 2rem; color: #fff; font-weight: 700; }
        p.subtitle { color: var(--text-muted); margin-top: 0.5rem; font-size: 1.05rem; }
        
        .status-badge {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--accent-green); padding: 0.25rem 0.75rem; border-radius: 9999px;
          font-weight: 600; font-size: 0.875rem;
        }
        .status-badge::before { content: ""; width: 8px; height: 8px; background: var(--accent-green); border-radius: 50%; display: block; box-shadow: 0 0 8px var(--accent-green); }
        
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem; }
        .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; transition: transform 0.2s; }
        .card h2 { margin-top: 0; margin-bottom: 1rem; font-size: 1.25rem; color: #fff; display: flex; align-items: center; gap: 0.5rem; }
        .endpoint-list { list-style: none; padding: 0; margin: 0; }
        .endpoint-list li { margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px dashed var(--border); }
        .endpoint-list li:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
        .method { display: inline-block; width: 60px; font-weight: 700; font-size: 0.75rem; padding: 0.15rem 0.4rem; border-radius: 4px; text-align: center; margin-right: 0.5rem; }
        .method.get { background: rgba(59, 130, 246, 0.15); color: #60A5FA; }
        .method.post { background: rgba(16, 185, 129, 0.15); color: #34D399; }
        .method.patch { background: rgba(245, 158, 11, 0.15); color: #FBBF24; }
        .method.delete { background: rgba(239, 68, 68, 0.15); color: #F87171; }
        .path { font-family: monospace; font-size: 0.9rem; color: #D1D5DB; text-decoration: none; }
        a.path:hover { color: var(--brand-color); text-decoration: underline; }
        .desc { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; display: block; margin-left: 75px; }
        
        footer { margin-top: 3rem; text-align: center; font-size: 0.875rem; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 1.5rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <div>
            <h1>Neurofy API Server</h1>
            <p class="subtitle">Protected REST interface for healthcare telemetry operations</p>
          </div>
          <div style="text-align: right;">
            <div class="status-badge">System Online</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; font-family: monospace;">
              Env: ${env.NODE_ENV}<br/>
              Time: ${new Date().toISOString()}
            </div>
          </div>
        </header>

        <div class="grid">
          <div class="card">
            <h2>🔐 Authentication</h2>
            <ul class="endpoint-list">
              <li><span class="method post">POST</span><a href="/api/auth/signup" target="_blank" class="path">/api/auth/signup</a><span class="desc">Register a new patient or doctor</span></li>
              <li><span class="method post">POST</span><a href="/api/auth/login" target="_blank" class="path">/api/auth/login</a><span class="desc">Authenticate user and get tokens</span></li>
              <li><span class="method get">GET</span><a href="/api/auth/me" target="_blank" class="path">/api/auth/me</a><span class="desc">Get current authed user profile</span></li>
              <li><span class="method post">POST</span><a href="/api/auth/refresh" target="_blank" class="path">/api/auth/refresh</a><span class="desc">Refresh access token</span></li>
            </ul>
          </div>

          <div class="card">
            <h2>👨‍⚕️ Core Users</h2>
            <ul class="endpoint-list">
              <li><span class="method get">GET</span><a href="/api/patients" target="_blank" class="path">/api/patients</a><span class="desc">List patients (doctors only)</span></li>
              <li><span class="method get">GET</span><a href="/api/patients/:id" target="_blank" class="path">/api/patients/:id</a><span class="desc">Get rigorous patient details</span></li>
              <li><span class="method get">GET</span><a href="/api/doctors" target="_blank" class="path">/api/doctors</a><span class="desc">List available doctors for directory</span></li>
            </ul>
          </div>

          <div class="card">
            <h2>📅 Appointments</h2>
            <ul class="endpoint-list">
              <li><span class="method post">POST</span><a href="/api/appointments" target="_blank" class="path">/api/appointments</a><span class="desc">Patient requests a slot with a doctor</span></li>
              <li><span class="method get">GET</span><a href="/api/appointments/doctor/pending" target="_blank" class="path">/api/appointments/doctor/pending</a><span class="desc">Doctor views pending incoming requests</span></li>
              <li><span class="method patch">PATCH</span><a href="/api/appointments/:id/accept" target="_blank" class="path">/api/appointments/:id/accept</a><span class="desc">Doctor accepts a request slot</span></li>
              <li><span class="method patch">PATCH</span><a href="/api/appointments/:id/reschedule" target="_blank" class="path">/api/appointments/:id/reschedule</a><span class="desc">Doctor proposes new slot & note</span></li>
            </ul>
          </div>

          <div class="card">
            <h2>📄 Clinical Reports</h2>
            <ul class="endpoint-list">
              <li><span class="method post">POST</span><a href="/api/reports" target="_blank" class="path">/api/reports</a><span class="desc">Doctor generates/finishes a report</span></li>
              <li><span class="method get">GET</span><a href="/api/reports" target="_blank" class="path">/api/reports</a><span class="desc">List reports scoped to auth'd role</span></li>
              <li><span class="method get">GET</span><a href="/api/reports/:id/download" target="_blank" class="path">/api/reports/:id/download</a><span class="desc">Streams medical data as TXT/PDF</span></li>
            </ul>
          </div>

          <div class="card">
            <h2>🔔 Notifications</h2>
            <ul class="endpoint-list">
              <li><span class="method get">GET</span><a href="/api/notifications/unread" target="_blank" class="path">/api/notifications/unread</a><span class="desc">Poll for unread notification count</span></li>
              <li><span class="method patch">PATCH</span><a href="/api/notifications/mark-all-read" target="_blank" class="path">/api/notifications/mark-all-read</a><span class="desc">Clear all active badges</span></li>
              <li><span class="method delete">DELETE</span><a href="/api/notifications/:id" target="_blank" class="path">/api/notifications/:id</a><span class="desc">Hard-delete a specific notification</span></li>
            </ul>
          </div>

          <div class="card">
            <h2>⚡ Hardware & System</h2>
            <ul class="endpoint-list">
              <li><span class="method get">GET</span><a href="/api/health" target="_blank" class="path">/api/health</a><span class="desc">Server alive ping (no-auth)</span></li>
              <li><span class="method get">GET</span><a href="/api/debug/serial" target="_blank" class="path">/api/debug/serial</a><span class="desc">Live telemetry COM port state</span></li>
            </ul>
          </div>
        </div>
        
        <footer>
          &copy; ${new Date().getFullYear()} Neurofy. This is a protected API endpoint directory. 
        </footer>
      </div>
    </body>
    </html>
  `;
  res.status(200).send(html);
});

// --- Health & Readiness Endpoints ---
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

app.get("/api/readiness", async (req, res) => {
  try {
    const mongoose = await import("mongoose");
    const dbReady = mongoose.connection.readyState === 1;
    
    if (!dbReady) {
      return res.status(503).json({
        success: false,
        data: {
          status: "not_ready",
          database: "disconnected",
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      data: {
        status: "error",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// --- API Routes with Rate Limiting ---
app.use("/api", apiLimiter, apiRouter);

// --- 404 Handler ---
app.use(notFoundHandler);

// --- Centralized Error Handler ---
app.use(errorHandler);

export default app;
