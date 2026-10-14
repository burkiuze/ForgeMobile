# Forge AI proxy

Tiny Vercel Edge function so Forge Mobile users can use the owner's OpenRouter key
without the key ever being in the app or this repo.

- `POST /api/v1/chat/completions` → OpenRouter (free models only, max 8000 tokens, ~20 req/min/IP)
- `GET /api/v1/models` → free model list
- `GET /api/health`

Set `OPENROUTER_API_KEY` in the Vercel project's environment variables (Sensitive), then redeploy.
