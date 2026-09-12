"""
FastAPI sidecar serving the fine-tuned explanation model. explain.ts calls
POST /explain with the same shape it used to send to Anthropic.

Usage: uvicorn serve:app --port 8001
"""
from pathlib import Path

import torch
from fastapi import FastAPI
from peft import PeftModel
from pydantic import BaseModel
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from shared import TASK_PREFIX, serialize_input

BASE_MODEL = "google/flan-t5-small"
ADAPTER_DIR = Path(__file__).parent / "model"

app = FastAPI()
_tokenizer = None
_model = None


def get_model():
    global _tokenizer, _model
    if _model is None:
        if not ADAPTER_DIR.exists():
            raise RuntimeError("No fine-tuned adapter found — run train.py first.")
        _tokenizer = AutoTokenizer.from_pretrained(ADAPTER_DIR)
        base = AutoModelForSeq2SeqLM.from_pretrained(BASE_MODEL)
        _model = PeftModel.from_pretrained(base, ADAPTER_DIR)
        _model.eval()
    return _tokenizer, _model


class ContradictionValue(BaseModel):
    source: str
    value: object


class Contradiction(BaseModel):
    field: str
    values: list[ContradictionValue]
    authoritativeSource: str
    resolvedValue: object
    rationale: str


class ExplainRequest(BaseModel):
    applicantName: str
    contradictions: list[Contradiction]
    correctionsApplied: list[str]


class ExplainResponse(BaseModel):
    text: str


@app.post("/explain", response_model=ExplainResponse)
def explain(req: ExplainRequest):
    tokenizer, model = get_model()
    input_text = serialize_input(
        req.applicantName,
        [c.model_dump() for c in req.contradictions],
        req.correctionsApplied,
    )
    prompt = TASK_PREFIX + input_text
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
    with torch.no_grad():
        output_ids = model.generate(**inputs, max_new_tokens=320, num_beams=4)
    text = tokenizer.decode(output_ids[0], skip_special_tokens=True).strip()
    return ExplainResponse(text=text)


@app.get("/health")
def health():
    return {"ok": ADAPTER_DIR.exists()}
