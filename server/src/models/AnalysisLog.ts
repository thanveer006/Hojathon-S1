import { Schema, model, Document } from "mongoose";

export interface ContradictionRecord {
  field: string;
  values: { source: string; value: string | number }[];
  authoritativeSource: string;
  resolvedValue: string | number;
  rationale: string;
  fieldHash: string; // hash of field+values, used to detect "already resolved" repeats
}

export interface AnalysisLogAttrs {
  applicantId: string;
  runNumber: number;
  contradictions: ContradictionRecord[];
  newContradictions: ContradictionRecord[]; // contradictions not seen in prior runs
  repeatedButResolved: ContradictionRecord[]; // previously flagged+resolved, still present in source docs but already handled
  correctedApplication: Record<string, unknown>;
  explanation: string;
  pipelineTrace: { stage: string; detail: string; timestamp: string }[];
}

export interface AnalysisLogDocument extends AnalysisLogAttrs, Document {}

const ContradictionSchema = new Schema(
  {
    field: String,
    values: [{ source: String, value: Schema.Types.Mixed }],
    authoritativeSource: String,
    resolvedValue: Schema.Types.Mixed,
    rationale: String,
    fieldHash: String,
  },
  { _id: false }
);

const AnalysisLogSchema = new Schema<AnalysisLogDocument>(
  {
    applicantId: { type: String, required: true, index: true },
    runNumber: { type: Number, required: true },
    contradictions: [ContradictionSchema],
    newContradictions: [ContradictionSchema],
    repeatedButResolved: [ContradictionSchema],
    correctedApplication: { type: Schema.Types.Mixed },
    explanation: { type: String },
    pipelineTrace: [
      {
        stage: String,
        detail: String,
        timestamp: String,
      },
    ],
  },
  { timestamps: true }
);

export const AnalysisLog = model<AnalysisLogDocument>("AnalysisLog", AnalysisLogSchema);
