"""
LipClass — Audio Extraction Service (Modal.com)

Pulls the audio track out of a teacher's reference video, normalises it for
ElevenLabs IVC (16 kHz mono, 64 kbps mp3, max 3 min) and stores it in the
private `voice-samples` Supabase bucket.

Deploy:  modal deploy audio_extract_service/main.py
Test:    modal run   audio_extract_service/main.py

Secrets required (modal secret create lipclass-supabase):
  SUPABASE_URL          — project URL
  SUPABASE_SERVICE_KEY  — service_role key

The deployed HTTPS endpoint URL becomes MODAL_AUDIO_EXTRACT_URL in .env.local.
"""

from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path

import modal

# ---------------------------------------------------------------------------
# Image: lightweight python base + ffmpeg + httpx. No supabase python client
# (pyiceberg dependency would need gcc).
# ---------------------------------------------------------------------------
audio_image = (
    modal.Image.from_registry("python:3.11-slim")
    .apt_install("ffmpeg")
    .pip_install("fastapi[standard]", "httpx==0.27.0")
)

app = modal.App("lipclass-audio-extract")

# Minimum sample length ElevenLabs IVC needs to produce a usable clone.
MIN_DURATION_SEC = 60
# Cap upload size — IVC sweet spot is 1-3 min; longer doesn't improve quality.
MAX_DURATION_SEC = 180


def _probe_duration(input_path: str) -> float:
    """Return the video duration in seconds, or 0 on failure."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            input_path,
        ],
        capture_output=True, text=True, timeout=20,
    )
    try:
        return float(result.stdout.strip() or 0)
    except ValueError:
        return 0.0


def _extract_audio(input_path: str, output_path: str) -> None:
    """ffmpeg → 16 kHz mono mp3, capped at MAX_DURATION_SEC."""
    result = subprocess.run(
        [
            "ffmpeg",
            "-i", input_path,
            "-vn",                     # drop video stream
            "-ac", "1",                # mono
            "-ar", "16000",            # 16 kHz (ElevenLabs IVC optimal)
            "-b:a", "64k",             # 64 kbps mp3 — small + clean
            "-t", str(MAX_DURATION_SEC),
            "-y",                      # overwrite
            output_path,
        ],
        capture_output=True, text=True, timeout=150,
    )
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {result.stderr[-400:]}")


def _upload_to_supabase(audio_bytes: bytes, storage_path: str) -> str:
    """Upload bytes to the voice-samples bucket and return a signed URL (1h)."""
    import httpx

    supabase_url: str = os.environ["SUPABASE_URL"].rstrip("/")
    service_key: str = os.environ["SUPABASE_SERVICE_KEY"]
    bucket = "voice-samples"

    upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{storage_path}"
    headers = {
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "audio/mpeg",
        "x-upsert": "true",
    }
    r = httpx.post(upload_url, content=audio_bytes, headers=headers, timeout=90)
    r.raise_for_status()

    # Signed URL — ElevenLabs needs a fetchable URL and the bucket is private.
    sign_url = f"{supabase_url}/storage/v1/object/sign/{bucket}/{storage_path}"
    s = httpx.post(
        sign_url,
        headers={"Authorization": f"Bearer {service_key}", "Content-Type": "application/json"},
        json={"expiresIn": 3600},  # 1 hour — ElevenLabs ingestion takes ~30-60s
        timeout=30,
    )
    s.raise_for_status()
    signed = s.json()
    return f"{supabase_url}/storage/v1{signed['signedURL']}"


@app.function(
    image=audio_image,
    timeout=240,
    memory=1024,
    secrets=[modal.Secret.from_name("lipclass-supabase")],
)
def extract_audio_fn(data: dict) -> dict:
    """
    Input:  { video_url, teacher_id }
    Output: { audio_url, duration_seconds, error }
    """
    import httpx

    video_url: str = data.get("video_url", "")
    teacher_id: str = data.get("teacher_id", "")
    if not video_url or not teacher_id:
        return {"audio_url": None, "duration_seconds": 0,
                "error": "video_url and teacher_id are required"}

    with tempfile.TemporaryDirectory() as tmpdir:
        in_path = os.path.join(tmpdir, "input.mp4")
        out_path = os.path.join(tmpdir, "voice.mp3")

        # 1) Download the reference video. We honor redirects (Supabase signed
        #    URLs often redirect) and cap at 500MB defensively.
        try:
            with httpx.stream(
                "GET", video_url, timeout=120, follow_redirects=True
            ) as r:
                r.raise_for_status()
                size = 0
                with open(in_path, "wb") as f:
                    for chunk in r.iter_bytes(chunk_size=1 << 20):
                        size += len(chunk)
                        if size > 500 * 1024 * 1024:
                            return {"audio_url": None, "duration_seconds": 0,
                                    "error": "Reference video exceeds 500MB"}
                        f.write(chunk)
        except httpx.HTTPError as exc:
            return {"audio_url": None, "duration_seconds": 0,
                    "error": f"Download failed: {exc}"}

        # 2) Duration check — ElevenLabs IVC needs at least 60 seconds.
        duration = _probe_duration(in_path)
        if duration < MIN_DURATION_SEC:
            return {
                "audio_url": None,
                "duration_seconds": duration,
                "error": (
                    f"Reference video must be at least {MIN_DURATION_SEC}s "
                    f"for voice cloning. Got {duration:.0f}s."
                ),
            }

        # 3) Extract.
        try:
            _extract_audio(in_path, out_path)
        except RuntimeError as exc:
            return {"audio_url": None, "duration_seconds": duration,
                    "error": str(exc)}

        # 4) Upload + sign.
        try:
            audio_bytes = Path(out_path).read_bytes()
            storage_path = f"{teacher_id}/voice.mp3"
            signed_url = _upload_to_supabase(audio_bytes, storage_path)
        except Exception as exc:  # noqa: BLE001 — surface the message
            return {"audio_url": None, "duration_seconds": duration,
                    "error": f"Upload failed: {exc}"}

        return {
            "audio_url": signed_url,
            "duration_seconds": min(duration, MAX_DURATION_SEC),
            "error": None,
        }


@app.function(
    image=audio_image,
    secrets=[modal.Secret.from_name("lipclass-supabase")],
)
@modal.fastapi_endpoint(method="POST")
def extract_audio(data: dict) -> dict:
    return extract_audio_fn.remote(data)


@app.local_entrypoint()
def test_extract() -> None:
    sample_url = os.environ.get("TEST_VIDEO_URL", "")
    if not sample_url:
        print("Set TEST_VIDEO_URL to run a smoke test.")
        return
    result = extract_audio_fn.remote(
        {"video_url": sample_url, "teacher_id": "test-teacher"}
    )
    print("Result:", result)
