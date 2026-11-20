import logging
from pathlib import Path

from app.utils.logging import (
    DEFAULT_LOG_FILE,
    LOG_FORMAT,
    get_logger,
    setup_logging,
)


def test_get_logger_namespacing():
    logger1 = get_logger("auth")
    assert logger1.name == "app.auth"

    logger2 = get_logger("app.gist")
    assert logger2.name == "app.gist"


def test_setup_logging_configures_file_handler_and_level(tmp_path: Path):
    log_file = tmp_path / "custom_app.log"
    setup_logging(log_level="DEBUG", log_file=str(log_file))

    app_logger = logging.getLogger("app")
    assert app_logger.level == logging.DEBUG
    assert len(app_logger.handlers) == 1
    assert isinstance(app_logger.handlers[0], logging.FileHandler)

    logger = get_logger("debug_module")
    logger.debug("Debug event payload_id=%s", 101)

    # Force flush/close to ensure content is written to disk
    for handler in app_logger.handlers:
        handler.flush()

    content = log_file.read_text(encoding="utf-8")
    assert "DEBUG" in content
    assert "app.debug_module" in content
    assert "Debug event payload_id=101" in content


def test_automatic_log_directory_creation(tmp_path: Path):
    nested_log_file = tmp_path / "nested" / "deep" / "app.log"
    assert not nested_log_file.parent.exists()

    setup_logging(log_level="INFO", log_file=str(nested_log_file))
    assert nested_log_file.parent.exists()

    logger = get_logger("nested_module")
    logger.info("Nested directory log test")

    for handler in logging.getLogger("app").handlers:
        handler.flush()

    assert nested_log_file.exists()
    content = nested_log_file.read_text(encoding="utf-8")
    assert "Nested directory log test" in content


def test_logging_appends_and_preserves_across_restarts(tmp_path: Path):
    log_file = tmp_path / "persistent.log"

    # First session / run
    setup_logging(log_level="INFO", log_file=str(log_file))
    logger = get_logger("session1")
    logger.info("First run log entry")

    for handler in logging.getLogger("app").handlers:
        handler.flush()

    content_run1 = log_file.read_text(encoding="utf-8")
    assert "First run log entry" in content_run1

    # Second session / run (simulate backend restart calling setup_logging again)
    setup_logging(log_level="INFO", log_file=str(log_file))
    logger = get_logger("session2")
    logger.info("Second run appended log entry")

    for handler in logging.getLogger("app").handlers:
        handler.flush()

    content_run2 = log_file.read_text(encoding="utf-8")
    # Both entries must exist
    assert "First run log entry" in content_run2
    assert "Second run appended log entry" in content_run2


def test_logging_output_format(tmp_path: Path):
    log_file = tmp_path / "format_test.log"
    setup_logging(log_level="INFO", log_file=str(log_file))
    logger = get_logger("test_format")
    logger.info("Test log message payload_id=%s", 42)

    for handler in logging.getLogger("app").handlers:
        handler.flush()

    lines = log_file.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1

    # Format: timestamp | level | logger | message
    parts = [part.strip() for part in lines[0].split("|")]
    assert len(parts) == 4
    assert parts[1] == "INFO"
    assert parts[2] == "app.test_format"
    assert parts[3] == "Test log message payload_id=42"
