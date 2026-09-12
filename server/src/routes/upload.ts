import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import multer from "multer";
import { runDynamicPipeline, UploadedDocInput } from "../engine/dynamicPipeline";
import { DocCategory } from "../engine/dynamicRules";

export const uploadRouter = Router();

// Uploads are OCR'd in memory only, never written to disk or a database —
// they exist for the lifetime of a single request (analyze-without-saving).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 12 },
});

function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const VALID_CATEGORIES: DocCategory[] = ["identity", "income", "eligibility", "application", "other"];

/**
 * Analyzes an arbitrary set of citizen-supplied documents: any file type,
 * any number of them, no fixed schema. Each file is tagged by the client
 * with a broad category (identity / income / eligibility / application /
 * other) used for authority resolution — see engine/dynamicRules.ts.
 * multipart/form-data: repeated "files" fields, plus parallel "categories"
 * and "labels" fields (one of each per file, same order).
 */
uploadRouter.post(
  "/analyze",
  upload.array("files", 12),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "Upload at least one document." });
    }

    const categoriesRaw = req.body.categories;
    const labelsRaw = req.body.labels;
    const categories: string[] = Array.isArray(categoriesRaw)
      ? categoriesRaw
      : categoriesRaw
      ? [categoriesRaw]
      : [];
    const labels: string[] = Array.isArray(labelsRaw) ? labelsRaw : labelsRaw ? [labelsRaw] : [];

    if (categories.length !== files.length) {
      return res.status(400).json({ error: "Each file must have a matching category." });
    }
    for (const c of categories) {
      if (!VALID_CATEGORIES.includes(c as DocCategory)) {
        return res
          .status(400)
          .json({ error: `Invalid category "${c}". Must be one of: ${VALID_CATEGORIES.join(", ")}` });
      }
    }
    for (const f of files) {
      if (!ALLOWED_MIMES.includes(f.mimetype)) {
        return res
          .status(400)
          .json({ error: `Unsupported file type ${f.mimetype} for "${f.originalname}". Use PDF, JPEG, PNG, or WEBP.` });
      }
    }

    const inputs: UploadedDocInput[] = files.map((f, i) => ({
      fileName: f.originalname,
      mimeType: f.mimetype,
      buffer: f.buffer,
      category: categories[i] as DocCategory,
      label: labels[i]?.trim() || f.originalname,
    }));

    try {
      const result = await runDynamicPipeline(inputs);
      res.json(result);
    } catch (err) {
      console.error("[upload/analyze] pipeline failed:", err);
      res.status(500).json({ error: "Pipeline execution failed", detail: String(err) });
    }
  })
);
