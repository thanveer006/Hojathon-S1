import { Router } from "express";
import { Applicant } from "../models/Applicant";
import { AnalysisLog } from "../models/AnalysisLog";
import { runPipeline } from "../engine/pipeline";

export const applicantsRouter = Router();

applicantsRouter.get("/", async (_req, res) => {
  const applicants = await Applicant.find({}, "applicantId displayName scenario").sort({
    applicantId: 1,
  });
  res.json(applicants);
});

applicantsRouter.get("/:id/documents", async (req, res) => {
  const applicant = await Applicant.findOne({ applicantId: req.params.id });
  if (!applicant) return res.status(404).json({ error: "Applicant not found" });
  res.json({
    applicantId: applicant.applicantId,
    displayName: applicant.displayName,
    scenario: applicant.scenario,
    documents: applicant.documents,
  });
});

applicantsRouter.post("/:id/analyze", async (req, res) => {
  const applicant = await Applicant.findOne({ applicantId: req.params.id });
  if (!applicant) return res.status(404).json({ error: "Applicant not found" });
  try {
    const result = await runPipeline(applicant);
    res.json(result);
  } catch (err) {
    console.error("[analyze] pipeline failed:", err);
    res.status(500).json({ error: "Pipeline execution failed", detail: String(err) });
  }
});

applicantsRouter.get("/:id/log", async (req, res) => {
  const logs = await AnalysisLog.find({ applicantId: req.params.id }).sort({ runNumber: 1 });
  res.json(logs);
});
