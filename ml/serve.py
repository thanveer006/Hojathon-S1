"""
FastAPI sidecar serving the fine-tuned explanation model. explain.ts calls
POST /explain with the same shape it used to send to Anthropic.

Usage: uvicorn serve:app --port 8001
"""
import threading
from contextlib import asynccontextmanager
from pathlib import Path

import torch
from fastapi import FastAPI
from peft import PeftModel
from pydantic import BaseModel
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from shared import TASK_PREFIX, serialize_input

BASE_MODEL = "google/flan-t5-small"
ADAPTER_DIR = Path(__file__).parent / "model"

_tokenizer = None
_model = None
_load_lock = threading.Lock()


def get_model():
    global _tokenizer, _model
    # FastAPI runs sync endpoints in a threadpool, so two cold requests can
    # race here and each load a full copy of the model.
    with _load_lock:
        if _model is None:
            if not ADAPTER_DIR.exists():
                raise RuntimeError("No fine-tuned adapter found — run train.py first.")
            tokenizer = AutoTokenizer.from_pretrained(ADAPTER_DIR)
            base = AutoModelForSeq2SeqLM.from_pretrained(BASE_MODEL)
            model = PeftModel.from_pretrained(base, ADAPTER_DIR)
            model.eval()
            _tokenizer, _model = tokenizer, model
    return _tokenizer, _model


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Load at startup, not on first request — otherwise the first (demo)
    # request pays the whole model-load cost and trips the caller's timeout.
    if ADAPTER_DIR.exists():
        try:
            get_model()
            print("[serve] model loaded and ready")
        except Exception as e:  # keep serving /health so the caller can fall back
            print(f"[serve] model failed to load: {e}")
    else:
        print("[serve] no adapter in ml/model — run train.py first")
    yield


app = FastAPI(lifespan=lifespan)


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
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=768)
    with torch.no_grad():
        # Greedy decoding: beam search on CPU takes tens of seconds, far past
        # the caller's timeout, which silently forces the template fallback.
        output_ids = model.generate(**inputs, max_new_tokens=240, num_beams=1)
    text = tokenizer.decode(output_ids[0], skip_special_tokens=True).strip()
    return ExplainResponse(text=text)


@app.get("/health")
def health():
    return {"ok": _model is not None, "adapter_present": ADAPTER_DIR.exists()}
