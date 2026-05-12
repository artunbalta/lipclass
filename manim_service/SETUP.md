# Manim Service — Modal.com Setup

## Prerequisites

```bash
pip install modal
modal setup          # opens browser to authenticate
```

## 1. Create Modal secret

```bash
modal secret create lipclass-supabase \
  SUPABASE_URL="https://umnuapjlipxxcstgcyzt.supabase.co" \
  SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbnVhcGpsaXB4eGNzdGdjeXp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc2ODQ5OSwiZXhwIjoyMDg0MzQ0NDk5fQ.Byxb_BnZVHPjM1j20PWJC2NebyxFXt-t1bow5YM_6NE"
```

Get `SUPABASE_SERVICE_KEY` from:
Supabase Dashboard → Project Settings → API → `service_role` (secret) key

## 2. Deploy

```bash
cd /path/to/lipclass
modal deploy manim_service/main.py
```

After deploy, Modal prints your endpoint URL, e.g.:
```
https://YOUR_USERNAME--lipclass-manim-render-animation.modal.run
```

## 3. Add to .env.local

```
MODAL_MANIM_URL=https://komacyus--lipclass-manim-render-animation.modal.run

```

## 4. Test locally

```bash
modal run manim_service/main.py
```

This renders a sample Newton's law animation and uploads it to Supabase.

## Notes

- Each animation render takes 30–90 seconds depending on complexity.
- Animations run in parallel across slides during lesson generation.
- If Manim render fails for a slide, the slide falls back gracefully to the static KaTeX view.
- `MODAL_MANIM_URL` not set → Manim step is silently skipped, all slides show KaTeX only.
