"""Transactional SQLite migrations. Bump file number, never edit an applied migration."""
from pathlib import Path

MIGRATIONS = Path(__file__).with_name("migrations")


def migrate(connection):
    connection.execute("PRAGMA journal_mode=WAL")
    files = sorted(MIGRATIONS.glob("[0-9][0-9][0-9]_*.sql"))
    versions = [int(path.name[:3]) for path in files]
    if versions != list(range(1, len(files) + 1)):
        raise RuntimeError("Migration files must have consecutive version numbers")
    connection.execute("BEGIN IMMEDIATE")
    try:
        current = connection.execute("PRAGMA user_version").fetchone()[0]
        if current > len(files):
            raise RuntimeError(f"Database version {current} is newer than this build ({len(files)})")
        for version, path in enumerate(files, start=1):
            if version <= current:
                continue
            sql = path.read_text(encoding="utf-8")
            for statement in sql.split(";"):
                if statement.strip():
                    connection.execute(statement)
            if version == 1 and "context" not in [row[1] for row in connection.execute("PRAGMA table_info(missions)")]:
                connection.execute("ALTER TABLE missions ADD COLUMN context TEXT NOT NULL DEFAULT '{}'")
            connection.execute(f"PRAGMA user_version={version}")
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    return len(files)
