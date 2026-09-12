import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/setu";

export async function connectDB(): Promise<void> {
  await mongoose.connect(MONGO_URI);
  console.log(`[db] connected to ${redactCredentials(MONGO_URI)}`);
}

/** Connection strings carry the DB password — never print it. */
function redactCredentials(uri: string): string {
  return uri.replace(/\/\/[^@/]+@/, "//<credentials>@");
}
