"""Basic tests for VibeLine to ensure the testing infrastructure works."""

import pytest


def test_imports():
    """Test that we can import the main modules."""
    try:
        from src import extract, plugin_manager, post_process, watch_voice_memos
        assert True
    except ImportError as e:
        pytest.fail(f"Failed to import modules: {e}")


def test_basic_functionality():
    """Basic test to ensure pytest is working."""
    assert 1 + 1 == 2


def test_string_operations():
    """Test basic string operations."""
    test_string = "vibeline"
    assert test_string.upper() == "VIBELINE"
    assert len(test_string) == 8
