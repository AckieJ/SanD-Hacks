from redis import Redis
from rq import Queue
from config.settings import settings

def queue():
    return Queue('researchlens',connection=Redis.from_url(settings().redis_url),default_timeout=3600)

def run_task(workspace_id,uploads=None,incremental=False):
    from pipeline.orchestrator import run_workspace
    run_workspace(workspace_id,uploads,incremental)
