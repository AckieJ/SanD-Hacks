import json
import time
from pathlib import Path
from contextlib import contextmanager
import psycopg
from psycopg.rows import dict_row
from config.settings import settings

@contextmanager
def connect():
    with psycopg.connect(settings().database_url, row_factory=dict_row, connect_timeout=8) as conn:
        yield conn

def initialize():
    schema = (Path(__file__).parent / 'schema.sql').read_text()
    for attempt in range(15):
        try:
            with connect() as conn:
                conn.execute(schema)
            return
        except psycopg.OperationalError:
            if attempt == 14:
                raise
            time.sleep(2)

def as_json(value):
    return json.dumps(value, ensure_ascii=False)

def rowdict(value):
    if not value:
        return None
    return {k: (str(v) if k == 'id' or k.endswith('_id') else v) for k,v in value.items()}
