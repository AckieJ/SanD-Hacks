"""
RQ task for live mode. In mock mode routers/workspaces.py runs the
pipeline inline instead (no Redis needed for a local demo).
Run a worker with: `rq worker -u $REDIS_URL researchlens`
"""
from rq import Queue
from redis import Redis

from app.config import get_settings
from app.db import SessionLocal
from app.pipeline.orchestrator import run_full_pipeline

settings = get_settings()
_redis = Redis.from_url(settings.redis_url)
queue = Queue("researchlens", connection=_redis)


def _run(workspace_id: str) -> None:
    db = SessionLocal()
    try:
        run_full_pipeline(db, workspace_id)
    finally:
        db.close()


class _Job:
    @staticmethod
    def delay(workspace_id: str):
        return queue.enqueue(_run, workspace_id)


run_pipeline_job = _Job()
