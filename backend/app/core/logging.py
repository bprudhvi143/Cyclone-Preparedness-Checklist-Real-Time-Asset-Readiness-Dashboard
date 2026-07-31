import logging
import sys

def setup_logging():
    """Configure core system log handlers and levels."""
    logger = logging.getLogger("gvmc_api")
    logger.setLevel(logging.INFO)

    # Standard out console logger
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "module": "%(module)s", "message": %(message)s}'
    )
    # Fallback to plain text formatter if JSON structure fails in context
    plain_formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    )
    
    # Use plain formatter for standard local dev visibility, JSON in prod
    handler.setFormatter(plain_formatter)
    logger.addHandler(handler)
    
    # Suppress verbose logs from external packages
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

setup_logging()
