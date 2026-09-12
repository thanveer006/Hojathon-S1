import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db";
import { applicantsRouter } from "./routes/applicants";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/applicants", applicantsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[server] unhandled error:", err);
  // Throwing after a response has already been sent would mask the real error.
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] SETU server listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("[db] connection failed:", err);
    process.exit(1);
  });
