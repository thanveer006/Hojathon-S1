import {
  AnalysisLogEntry,
  ApplicantDocuments,
  ApplicantSummary,
  PipelineResult,
} from "../types";

const BASE = "/api/applicants";

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
};
