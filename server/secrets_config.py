"""Read server secrets from a mounted file or, for local development, an env var."""
import os
from pathlib import Path


def secret_value(name):
    inline = os.getenv(name)
    path = os.getenv(name + "_FILE")
    if inline and path:
        raise RuntimeError(f"Configure only one of {name} and {name}_FILE")
    if path:
        value = Path(path).read_text(encoding="utf-8").strip()
        if not value:
            raise RuntimeError(f"Empty secret file for {name}")
        return value
    return inline or ""
