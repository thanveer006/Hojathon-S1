import "dotenv/config";
import { connectDB } from "../db";
import { Applicant } from "../models/Applicant";
import { AnalysisLog } from "../models/AnalysisLog";
import { applicantFixtures } from "./fixtures";
import mongoose from "mongoose";

async function seed() {
  await connectDB();
  await Applicant.deleteMany({});
  await AnalysisLog.deleteMany({});
  await Applicant.insertMany(applicantFixtures);
  console.log(`[seed] inserted ${applicantFixtures.length} applicants`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
