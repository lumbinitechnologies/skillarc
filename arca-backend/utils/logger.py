import logging
import sys
import re

_SENSITIVE = re.compile(r"(?i)(authorization|access[_ -]?token|refresh[_ -]?token|secret|api[_ -]?key|password|raw[_ -]?(question|content)|academic record)[^\n]*")


class PrivacyFilter(logging.Filter):
    """Keep operational logs useful without copying request or record data."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            rendered = record.getMessage()
        except Exception:
            rendered = "operational event"
        if _SENSITIVE.search(rendered):
            record.msg = "sensitive operational detail redacted"
            record.args = ()
        return True


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.addFilter(PrivacyFilter())
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
