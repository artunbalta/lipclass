# Audio Extract Service

Modal-deployed FFmpeg microservice that pulls the audio track out of a
teacher's reference video and stores a clean MP3 in Supabase Storage, ready
for ElevenLabs Instant Voice Cloning.

## One-time setup

1. Make sure the `lipclass-supabase` Modal secret already exists (it was
   created for the Manim service — same keys reused):

   ```bash
   modal secret list
   ```

   If missing:
   ```bash
   modal secret create lipclass-supabase \
     SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
     SUPABASE_SERVICE_KEY=eyJ...service_role_key
   ```

2. Apply the SQL migration that creates the `voice-samples` bucket:

   ```bash
   psql "$SUPABASE_DB_URL" -f supabase/add-voice-clones.sql
   ```

3. Deploy:

   ```bash
   modal deploy audio_extract_service/main.py
   ```

   Modal prints an HTTPS endpoint URL. Copy it.

4. Add to `.env.local`:

   ```
   MODAL_AUDIO_EXTRACT_URL=https://...modal.run
   ```

## Smoke test

```bash
TEST_VIDEO_URL="https://...mp4" modal run audio_extract_service/main.py
```

Expected output:
```json
{ "audio_url": "https://...signed.mp3", "duration_seconds": 120, "error": null }
```

## Limits & assumptions

- Reference video must be ≥ 60 seconds (ElevenLabs IVC minimum).
- Audio is capped at 180 seconds in the MP3 (longer doesn't help quality).
- Source video must be ≤ 500 MB.
- Function timeout 240s; ffmpeg subprocess timeout 150s.
