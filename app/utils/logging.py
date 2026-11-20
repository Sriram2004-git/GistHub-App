import logging
import os
import sys

from app.core.config import settings

LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
DEFAULT_LOG_FILE = "logs/app.log"


def setup_logging(
    log_level: str | None = None,
    log_file: str | None = None,
    to_console: bool | None = None,
) -> None:
    """
    Configure application logging using Python standard library logging.
    Supports either console output (e.g. Docker container) or persistent file logging.
    """
    level_name = (log_level or settings.log_level or "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    console_mode = (
        to_console
        if to_console is not None
        else getattr(settings, "log_to_console", False)
    )

    app_logger = logging.getLogger("app")
    app_logger.setLevel(level)
    app_logger.propagate = False

    # Close and remove existing handlers to cleanly reconfigure without leaking descriptors
    for existing_handler in list(app_logger.handlers):
        app_logger.removeHandler(existing_handler)
        existing_handler.close()

    formatter = logging.Formatter(fmt=LOG_FORMAT, datefmt=DATE_FORMAT)

    if console_mode and log_file is None:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        console_handler.setFormatter(formatter)
        app_logger.addHandler(console_handler)
    else:
        file_path = log_file or getattr(settings, "log_file", None) or DEFAULT_LOG_FILE
        dir_name = os.path.dirname(file_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)

        file_handler = logging.FileHandler(file_path, mode="a", encoding="utf-8")
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        app_logger.addHandler(file_handler)


def get_logger(name: str) -> logging.Logger:
    """
    Retrieve a logger namespaced under the application logger.
    """
    if not name.startswith("app.") and name != "app":
        name = f"app.{name}"
    return logging.getLogger(name)
