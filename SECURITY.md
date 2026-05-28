# Security Notes

## Active issues

### 🔴 FAL_KEY leaked into git history (pending rotation)

The Fal AI API key was committed to this repository at commit
`de9cb75957de30ee52ebc8de29d1f5bf7243a1b4` inside the following files:

- `ENV_SETUP_UPDATED.txt`
- `FAL_AI_SETUP.md`
- `FAL_KEY_CLIENT_SIDE_FIX.md`
- `FAL_KEY_TROUBLESHOOTING.md`
- `QUICK_FIX_FAL_KEY.md`
- `SETUP_FAL_KEY.md`
- `VIDEO_GENERATION_FLOW.md`

The current files on `main`/`furk` have been sanitized
(`REDACTED_ROTATE_BEFORE_USING`), but the original value is still visible to
anyone who clones the repo and runs `git log -p`.

**The key is therefore considered compromised.** Anyone with access to the
GitHub repo (or its history) can use it to bill our Fal account. The cost
exposure is bounded only by the Fal plan's budget cap.

**Mitigations already applied (this commit):**

1. `.env` is now in `.gitignore` (was missing — only `.env*.local` was
   ignored before). No new env file can leak.
2. The env var was renamed `NEXT_PUBLIC_FAL_KEY` → `FAL_KEY` so it is **not
   inlined into the client JavaScript bundle**. Before this change every
   page-load shipped the key in plaintext to every visitor's browser. Now
   only server-side route handlers can read it.
3. All `*.md` / `*.txt` files in the working tree have the key replaced with
   `REDACTED_ROTATE_BEFORE_USING`.

**Required action (cannot be done from this environment — needs Fal
dashboard credentials):**

1. Log into <https://fal.ai/dashboard/keys>.
2. Revoke key `7dcf...961dc`.
3. Generate a fresh key.
4. Update `.env` locally and all hosted environments (Vercel, Modal secrets).
5. (Optional but recommended) Rewrite git history with `git filter-repo`
   to scrub the secret from past commits:
   ```bash
   git filter-repo --replace-text <(echo '7dcf629c-939b-48d3-ba96-299fd859f478:c86206360cf31e2cfdf23665972961dc==>REDACTED')
   git push --force-with-lease origin --all
   ```
   This rewrites every collaborator's branches — coordinate before doing it.

Until the key is rotated, **all video-generation traffic is at risk of
abuse**. Add a Fal budget cap as a stopgap.

### 🟠 Supabase anon key is in plaintext in the bundle

This is expected behaviour (the anon key is designed to be public, RLS is
the security boundary). Verify RLS policies are exhaustive — see
`supabase/*.sql`.

## Hygiene checklist (run before any commit)

- [ ] `git diff --cached | grep -iE "(api[_-]?key|secret|password|token)"`
      returns nothing
- [ ] No `process.env.NEXT_PUBLIC_*` for credentials (only public IDs / URLs)
- [ ] New env vars are listed in this file and `.env.example`
