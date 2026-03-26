"""Unit tests for Drift research agent — Firecrawl integration."""
import os
import sys

# Set required env vars BEFORE importing agent (it reads them at module level)
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test-dummy")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "eyJ-test-dummy")

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch, MagicMock, call
import agent


def test_firecrawl_extract_success():
    """FR1: firecrawl_extract returns markdown on successful scrape."""
    mock_result = {"markdown": "# Sandoz Investors\n\nContent here..."}
    with patch.object(agent, "_FIRECRAWL_AVAILABLE", True):
        with patch("agent.FirecrawlApp") as MockApp:
            MockApp.return_value.scrape_url.return_value = mock_result
            result = agent.firecrawl_extract("https://example.com", api_key="fc-test")
    assert result == "# Sandoz Investors\n\nContent here..."


def test_firecrawl_extract_failure():
    """FR5: firecrawl_extract returns None when API raises exception."""
    with patch.object(agent, "_FIRECRAWL_AVAILABLE", True):
        with patch("agent.FirecrawlApp") as MockApp:
            MockApp.return_value.scrape_url.side_effect = Exception("API error")
            result = agent.firecrawl_extract("https://example.com", api_key="fc-test")
    assert result is None


def test_firecrawl_extract_no_key():
    """FR1: firecrawl_extract returns None when API key is empty."""
    result = agent.firecrawl_extract("https://example.com", api_key="")
    assert result is None


def test_firecrawl_extract_truncation():
    """NFR2: content is truncated to max_chars."""
    long_content = "x" * 50000
    mock_result = {"markdown": long_content}
    with patch.object(agent, "_FIRECRAWL_AVAILABLE", True):
        with patch("agent.FirecrawlApp") as MockApp:
            MockApp.return_value.scrape_url.return_value = mock_result
            result = agent.firecrawl_extract("https://example.com", api_key="fc-test", max_chars=100)
    assert result is not None
    assert len(result) == 100


def test_firecrawl_retry_logic():
    """FR4: firecrawl_extract retries on transient errors before giving up."""
    mock_result = {"markdown": "# Success after retry"}
    with patch.object(agent, "_FIRECRAWL_AVAILABLE", True):
        with patch("agent.FirecrawlApp") as MockApp:
            # Fail twice, succeed on third attempt
            MockApp.return_value.scrape_url.side_effect = [
                Exception("429 Rate limit"),
                Exception("503 Service unavailable"),
                mock_result,
            ]
            result = agent.firecrawl_extract("https://example.com", api_key="fc-test")
    assert result == "# Success after retry"
    assert MockApp.return_value.scrape_url.call_count == 3


def test_save_signal_defaults_draft_true():
    """NFR3: save_signal sets is_draft=True by default (draft-only workflow)."""
    mock_db = MagicMock()
    mock_db.table.return_value.insert.return_value.execute.return_value.data = [{"id": "test-id"}]
    signal = {
        "objective_id": "obj-1",
        "company_id": "comp-1",
        "signal_date": "2026-03-26",
        "source_type": "other",
        "source_name": "Test",
        "classification": "stated",
    }
    agent.save_signal(mock_db, signal)
    assert signal["is_draft"] is True


def test_api_key_not_in_logs(capsys):
    """NFR4: API key never appears in print output on failure."""
    secret_key = "fc-SUPER-SECRET-KEY-12345"
    with patch.object(agent, "_FIRECRAWL_AVAILABLE", True):
        with patch("agent.FirecrawlApp") as MockApp:
            MockApp.return_value.scrape_url.side_effect = Exception("Connection refused")
            agent.firecrawl_extract("https://example.com", api_key=secret_key)
    captured = capsys.readouterr()
    assert secret_key not in captured.out
    assert secret_key not in captured.err
