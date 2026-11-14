"""Run inside backend container: python /app/../scripts/check_sources.py only if mounted.
Instead use app logs and /api/health for production health."""
print('Run: docker compose logs --tail=100 worker api')
