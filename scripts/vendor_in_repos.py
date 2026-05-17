"""One-shot vendoring of nusasiaga (dashboard) and gallery (android app)
into the gemma-disaster-grid monorepo.

Run once from the gemma4 repo root:
    python scripts/vendor_in_repos.py

Source repos (deployment mirrors, kept live):
    d:/Projects/hackathon/nusasiaga  → gemma4/dashboard/
    d:/Projects/hackathon/gallery    → gemma4/android/   (replaces scaffolding)

Excluded everywhere: VCS metadata (.git), IDE state (.idea, .vscode),
build artifacts (build/, .gradle/, .next/, .vercel/, node_modules/),
crash logs, OS detritus (.DS_Store, Thumbs.db).

The script is destructive on the target dirs — confirmed by the
TARGET_EXISTS check below, prints a warning, and proceeds. Re-runs are
idempotent (existing target is removed first).
"""
from __future__ import annotations

import io
import shutil
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]

SOURCES = [
    {
        "name": "dashboard (nusasiaga)",
        "src": Path("d:/Projects/hackathon/nusasiaga"),
        "dst": ROOT / "dashboard",
        "exclude_dirs": {
            ".git", "node_modules", ".next", ".vercel", "out",
            ".idea", ".vscode", "coverage",
        },
        "exclude_files": {
            "tsconfig.tsbuildinfo", ".env.local", ".env",
            ".DS_Store", "Thumbs.db", "npm-debug.log",
            "yarn-debug.log", "yarn-error.log",
        },
    },
    {
        "name": "android app (gallery fork)",
        "src": Path("d:/Projects/hackathon/gallery"),
        "dst": ROOT / "android",   # replaces the old scaffolding dir
        "exclude_dirs": {
            ".git", "build", ".gradle", ".idea", ".vscode",
            "captures", ".cxx", "outputs",
        },
        "exclude_files": {
            ".DS_Store", "Thumbs.db", "local.properties",
        },
        # Anything ending with one of these is dropped (covers JVM crash logs).
        "exclude_suffixes": (".log",),
    },
]


def should_skip(p: Path, rel: Path, spec: dict) -> bool:
    if any(part in spec["exclude_dirs"] for part in rel.parts):
        return True
    if p.name in spec["exclude_files"]:
        return True
    if any(p.name.endswith(suf) for suf in spec.get("exclude_suffixes", ())):
        return True
    return False


def vendor_one(spec: dict) -> tuple[int, int]:
    src: Path = spec["src"]
    dst: Path = spec["dst"]
    if not src.is_dir():
        print(f"  ! source missing: {src}")
        return 0, 0

    if dst.exists():
        print(f"  removing existing target: {dst}")
        shutil.rmtree(dst)
    dst.mkdir(parents=True)

    n_copied = 0
    n_skipped = 0
    bytes_copied = 0
    for p in src.rglob("*"):
        rel = p.relative_to(src)
        if p.is_dir():
            if any(part in spec["exclude_dirs"] for part in rel.parts):
                # Don't descend
                continue
            (dst / rel).mkdir(parents=True, exist_ok=True)
            continue
        if should_skip(p, rel, spec):
            n_skipped += 1
            continue
        (dst / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, dst / rel)
        n_copied += 1
        bytes_copied += p.stat().st_size

    mb = bytes_copied / (1024 * 1024)
    print(f"  {spec['name']}: copied {n_copied} files ({mb:.1f} MB), skipped {n_skipped}")
    return n_copied, n_skipped


def main() -> int:
    print(f"Repo root: {ROOT}")
    total_copied = 0
    for spec in SOURCES:
        print(f"\n→ {spec['name']}")
        print(f"  src: {spec['src']}")
        print(f"  dst: {spec['dst']}")
        copied, _ = vendor_one(spec)
        total_copied += copied
    print(f"\nTotal files copied: {total_copied}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
