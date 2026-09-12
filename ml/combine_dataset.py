"""
Combine the real Gemini-written examples (data/train.jsonl) with the
template-based synthetic augmentation (data/train_synthetic.jsonl) into a
single training file, oversampling the real examples so they remain the
dominant signal rather than being diluted by the larger synthetic set.

Usage: python combine_dataset.py [--real data/train.jsonl]
                                  [--synthetic data/train_synthetic.jsonl]
                                  [--out data/train_combined.jsonl]
                                  [--real-oversample 3]
"""
import argparse
import json
import random
from pathlib import Path


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--real", type=str, default="data/train.jsonl")
    parser.add_argument("--synthetic", type=str, default="data/train_synthetic.jsonl")
    parser.add_argument("--out", type=str, default="data/train_combined.jsonl")
    parser.add_argument("--real-oversample", type=int, default=3)
    parser.add_argument("--seed", type=int, default=13)
    args = parser.parse_args()

    here = Path(__file__).parent
    real = load_jsonl(here / args.real)
    synthetic = load_jsonl(here / args.synthetic)

    for r in real + synthetic:
        assert set(r.keys()) == {"input", "target"}, f"unexpected keys: {r.keys()}"

    combined = real * args.real_oversample + synthetic
    random.Random(args.seed).shuffle(combined)

    out_path = here / args.out
    with out_path.open("w", encoding="utf-8") as f:
        for row in combined:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(
        f"{len(real)} real x{args.real_oversample} + {len(synthetic)} synthetic "
        f"= {len(combined)} rows -> {out_path}"
    )


if __name__ == "__main__":
    main()
