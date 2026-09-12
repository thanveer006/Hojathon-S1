import {
  AnalysisLogEntry,
  ApplicantDocuments,
  ApplicantSummary,
  DocCategory,
  DynamicPipelineResult,
  PipelineResult,
} from "../types";

const BASE = "/api/applicants";
const UPLOAD_BASE = "/api/upload";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export const api = {
  listApplicants: () => fetch(BASE).then((r) => json<ApplicantSummary[]>(r)),
  getDocuments: (id: string) =>
    fetch(`${BASE}/${id}/documents`).then((r) => json<ApplicantDocuments>(r)),
  analyze: (id: string) =>
    fetch(`${BASE}/${id}/analyze`, { method: "POST" }).then((r) => json<PipelineResult>(r)),
  getLog: (id: string) => fetch(`${BASE}/${id}/log`).then((r) => json<AnalysisLogEntry[]>(r)),

  analyzeUpload: (
    files: { file: File; category: DocCategory; label: string }[]
  ): Promise<DynamicPipelineResult> => {
    const form = new FormData();
    for (const f of files) {
      form.append("files", f.file);
      form.append("categories", f.category);
      form.append("labels", f.label);
    }
    return fetch(`${UPLOAD_BASE}/analyze`, { method: "POST", body: form }).then((r) =>
      json<DynamicPipelineResult>(r)
    );
  },
};
