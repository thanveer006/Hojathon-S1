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

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] SETU server listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("[db] connection failed:", err);
    process.exit(1);
  });
