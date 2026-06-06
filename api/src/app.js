"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");

const { testConnection } = require("./config/db");
const { error } = require("./utils/response");

const authRoutes = require("./routes/auth.routes");
const reportRoutes = require("./routes/reports.routes");
const withdrawalRoutes = require("./routes/withdrawals.routes");
const categoryRoutes = require("./routes/categories.routes");
const userRoutes = require("./routes/users.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const notificationRoutes = require("./routes/notifications.routes");

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use(limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.resolve(process.env.UPLOAD_DIR || 'src/uploads')));

app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", require("./routes/notifications.routes"));

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "pasifik-api" }),
);

app.use((_req, res) => error(res, "Route not found", 404));

// error handling middleware
app.use((err, _req, res, _next) => {
  console.error("[Unhandled]", err);
  error(res, err.message || "Internal Server Error", err.status || 500);
});

app.post('/api/debug/withdrawal', async (req, res) => {
  const { pool } = require('./config/db');
  try {
    const [[user]] = await pool.query(
      'SELECT id, balance, locked_balance FROM users WHERE id = 3'
    );
    res.json({ ok: true, user });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

(async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`[API] Pasifik running on http://localhost:${PORT}`);
  });
})();

module.exports = app;
