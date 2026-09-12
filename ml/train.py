"""
Fine-tune a small open model (google/flan-t5-small) with LoRA on the
bootstrapped dataset from generate_dataset.py. Trains fine on CPU in a
hackathon time budget.

Usage: python train.py [--data data/train.jsonl] [--epochs 3] [--out model]
"""
import argparse
import json
import random
from pathlib import Path

from datasets import Dataset
from peft import LoraConfig, get_peft_model, TaskType
from transformers import (
    AutoModelForSeq2SeqLM,
    AutoTokenizer,
    DataCollatorForSeq2Seq,
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
)

from shared import TASK_PREFIX

BASE_MODEL = "google/flan-t5-small"
# Must match serve.py — and be long enough that the "Corrections applied"
# block, which serialize_input puts last, is never truncated away.
MAX_INPUT_LEN = 768
MAX_TARGET_LEN = 320


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, default="data/train.jsonl")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--out", type=str, default="model")
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--resume", type=str, default=None, help="checkpoint dir to resume from")
    args = parser.parse_args()

    here = Path(__file__).parent
    rows = load_jsonl(here / args.data)
    if len(rows) < 20:
        raise SystemExit(f"Only {len(rows)} examples found — run generate_dataset.py first.")

    # Shuffle before splitting — rows are appended in generation order, so an
    # unshuffled head would make the val set the oldest block only.
    random.Random(42).shuffle(rows)
    split = max(1, int(len(rows) * 0.1))
    val_rows, train_rows = rows[:split], rows[split:]
    print(f"{len(train_rows)} train / {len(val_rows)} val examples")

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    base_model = AutoModelForSeq2SeqLM.from_pretrained(BASE_MODEL)

    lora_config = LoraConfig(
        task_type=TaskType.SEQ_2_SEQ_LM,
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        target_modules=["q", "v"],
    )
    model = get_peft_model(base_model, lora_config)
    model.print_trainable_parameters()

    def to_dataset(rows):
        return Dataset.from_dict({
            "input": [TASK_PREFIX + r["input"] for r in rows],
            "target": [r["target"] for r in rows],
        })

    def tokenize(batch):
        model_inputs = tokenizer(batch["input"], max_length=MAX_INPUT_LEN, truncation=True)
        labels = tokenizer(text_target=batch["target"], max_length=MAX_TARGET_LEN, truncation=True)
        model_inputs["labels"] = labels["input_ids"]
        return model_inputs

    train_ds = to_dataset(train_rows).map(tokenize, batched=True, remove_columns=["input", "target"])
    val_ds = to_dataset(val_rows).map(tokenize, batched=True, remove_columns=["input", "target"])

    collator = DataCollatorForSeq2Seq(tokenizer, model=model)

    training_args = Seq2SeqTrainingArguments(
        output_dir=str(here / "checkpoints"),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        learning_rate=3e-4,
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=1,
        predict_with_generate=False,  # no compute_metrics — would just burn CPU
        logging_steps=10,
        report_to=[],
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        data_collator=collator,
        processing_class=tokenizer,
    )

    trainer.train(resume_from_checkpoint=args.resume)

    out_dir = here / args.out
    model.save_pretrained(out_dir)
    tokenizer.save_pretrained(out_dir)
    print(f"Saved LoRA adapter + tokenizer to {out_dir}")


if __name__ == "__main__":
    main()
