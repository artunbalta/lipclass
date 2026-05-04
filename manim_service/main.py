"""
LipClass — Manim Animation Service (Modal.com)

Deploy:  modal deploy manim_service/main.py
Test:    modal run   manim_service/main.py

Secrets required (create via `modal secret create lipclass-supabase`):
  SUPABASE_URL          — your Supabase project URL
  SUPABASE_SERVICE_KEY  — service_role key (not anon key)

The deployed HTTPS endpoint URL becomes MODAL_MANIM_URL in your .env.local.
"""

from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path

import modal

# ---------------------------------------------------------------------------
# Image: official Manim image only — httpx is already pre-installed there.
# Deliberately avoids the supabase Python client (it pulls in storage3 →
# pyiceberg, which requires gcc to compile — not present in the Manim image).
# We call the Supabase Storage REST API directly with httpx instead.
# ---------------------------------------------------------------------------
manim_image = (
    modal.Image.from_registry("manimcommunity/manim:stable")
    .pip_install("fastapi[standard]")
)

app = modal.App("lipclass-manim")

SKIP_RESPONSE: dict = {"animation_url": None, "skipped": True, "error": None}


def _upload_to_supabase(video_bytes: bytes, storage_path: str) -> str:
    """
    Upload MP4 bytes to Supabase Storage via the REST API and return the public URL.
    Uses httpx (pre-installed in the Manim image) instead of the supabase Python
    client to avoid its heavy dependency chain (pyiceberg needs gcc to compile).
    """
    import httpx

    supabase_url: str = os.environ["SUPABASE_URL"].rstrip("/")
    service_key: str = os.environ["SUPABASE_SERVICE_KEY"]
    bucket = "generated-videos"

    upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{storage_path}"
    headers = {
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "video/mp4",
        "x-upsert": "true",
    }

    response = httpx.post(upload_url, content=video_bytes, headers=headers, timeout=120)
    response.raise_for_status()

    # Public URL is deterministic — no need for a separate API call
    return f"{supabase_url}/storage/v1/object/public/{bucket}/{storage_path}"


def _run_manim(script: str, tmpdir: str) -> Path:
    """Write script to disk, invoke Manim, return path to the rendered MP4."""
    script_path = os.path.join(tmpdir, "scene.py")
    with open(script_path, "w") as f:
        f.write(script)

    result = subprocess.run(
        [
            "manim",
            "-qm",                    # medium quality — good balance of speed/clarity
            "--output_file", "output",
            "--media_dir", tmpdir,
            script_path,
            "SlideScene",             # LLM must always name the class SlideScene
        ],
        capture_output=True,
        text=True,
        cwd=tmpdir,
        timeout=240,
    )

    if result.returncode != 0:
        raise RuntimeError(f"Manim render failed:\n{result.stderr[-800:]}")

    mp4_files = list(Path(tmpdir).rglob("*.mp4"))
    if not mp4_files:
        raise RuntimeError("Manim produced no MP4 output")

    return mp4_files[0]


# ---------------------------------------------------------------------------
# Core render function — callable with .remote() for testing
# ---------------------------------------------------------------------------
@app.function(
    image=manim_image,
    timeout=300,
    memory=2048,
    secrets=[modal.Secret.from_name("lipclass-supabase")],
)
def render_animation_fn(data: dict) -> dict:
    """
    Render a Manim animation from LLM-generated Python code.

    Input:  { manim_code, slide_number, video_id }
    Output: { animation_url, skipped, error }
    """
    manim_code: str = data.get("manim_code", "").strip()
    slide_number: int = data.get("slide_number", 0)
    video_id: str = data.get("video_id", "unknown")

    if not manim_code or manim_code.upper() == "SKIP":
        return SKIP_RESPONSE

    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            mp4_path = _run_manim(manim_code, tmpdir)
        except RuntimeError as render_err:
            return {"animation_url": None, "skipped": False, "error": str(render_err)}

        video_bytes = mp4_path.read_bytes()

    storage_path = f"manim-animations/{video_id}/slide_{slide_number}.mp4"

    try:
        public_url = _upload_to_supabase(video_bytes, storage_path)
    except Exception as upload_err:
        return {
            "animation_url": None,
            "skipped": False,
            "error": f"Upload failed: {upload_err}",
        }

    return {"animation_url": public_url, "skipped": False, "error": None}


# ---------------------------------------------------------------------------
# Web endpoint — thin wrapper so Next.js can POST to it over HTTPS
# ---------------------------------------------------------------------------
@app.function(
    image=manim_image,
    secrets=[modal.Secret.from_name("lipclass-supabase")],
)
@modal.fastapi_endpoint(method="POST")
def render_animation(data: dict) -> dict:
    return render_animation_fn.remote(data)


# ---------------------------------------------------------------------------
# Local test entrypoint — `modal run manim_service/main.py`
# ---------------------------------------------------------------------------
@app.local_entrypoint()
def test_render() -> None:
    sample_code = """
from manim import *

class SlideScene(Scene):
    def construct(self):
        title = Text("Newton's Second Law", font_size=40, color=WHITE)
        title.to_edge(UP)
        self.play(Write(title))

        formula = MathTex(r"F = ma", font_size=72, color=YELLOW)
        self.play(Write(formula))
        self.wait(1)

        parts = VGroup(
            MathTex(r"m", color=YELLOW),
            Text("= mass (kg)", color=WHITE, font_size=28),
            MathTex(r"v", color=YELLOW),
            Text("= velocity (m/s)", color=WHITE, font_size=28),
        )
        parts.arrange_in_grid(rows=2, cols=2, buff=0.4)
        parts.next_to(formula, DOWN, buff=0.7)
        self.play(FadeIn(parts))
        self.wait(2)
"""
    result = render_animation_fn.remote(
        {"manim_code": sample_code, "slide_number": 1, "video_id": "test-run"}
    )
    print("Result:", result)
