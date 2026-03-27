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


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2b TESTS: Markdown Parsing Functions (TDD RED phase)
# ─────────────────────────────────────────────────────────────────────────────


def test_extract_tables_from_markdown_single_table():
    """Extract single markdown table into list of dicts."""
    markdown = """
# Header

| Name | Value | Status |
|------|-------|--------|
| Alice | 100 | Active |
| Bob | 200 | Inactive |
"""
    tables = agent.extract_tables_from_markdown(markdown)
    assert len(tables) == 1
    assert len(tables[0]) == 2  # 2 data rows
    assert tables[0][0] == {"Name": "Alice", "Value": "100", "Status": "Active"}
    assert tables[0][1] == {"Name": "Bob", "Value": "200", "Status": "Inactive"}


def test_extract_tables_from_markdown_no_tables():
    """Return empty list when markdown has no tables."""
    markdown = """
# Header
This is just plain text.
No tables here.
"""
    tables = agent.extract_tables_from_markdown(markdown)
    assert tables == []


def test_extract_tables_from_markdown_malformed():
    """Gracefully handle malformed tables (return [])."""
    markdown = """
| Broken
Table without separator
| Row |
"""
    tables = agent.extract_tables_from_markdown(markdown)
    assert tables == []


def test_extract_tables_from_markdown_multiple_tables():
    """Extract multiple tables from same markdown."""
    markdown = """
## Table 1
| A | B |
|---|---|
| 1 | 2 |

Some text in between.

## Table 2
| X | Y |
|---|---|
| 10 | 20 |
| 30 | 40 |
"""
    tables = agent.extract_tables_from_markdown(markdown)
    assert len(tables) == 2
    assert len(tables[0]) == 1  # Table 1: 1 data row
    assert len(tables[1]) == 2  # Table 2: 2 data rows


def test_extract_timestamp_from_markdown_published():
    """Extract 'Published: <date>' format."""
    markdown = "Published: March 26, 2024\n\nSome content."
    ts = agent.extract_timestamp_from_markdown(markdown)
    assert ts is not None
    assert ts.year == 2024
    assert ts.month == 3
    assert ts.day == 26


def test_extract_timestamp_from_markdown_last_updated():
    """Extract 'Last Updated: <date>' format."""
    markdown = "Last Updated: December 15, 2023\n\nContent."
    ts = agent.extract_timestamp_from_markdown(markdown)
    assert ts is not None
    assert ts.year == 2023
    assert ts.month == 12
    assert ts.day == 15


def test_extract_timestamp_from_markdown_date_label():
    """Extract 'Date: <date>' format."""
    markdown = "Date: 2026-01-05\n\nContent."
    ts = agent.extract_timestamp_from_markdown(markdown)
    assert ts is not None
    assert ts.year == 2026
    assert ts.month == 1
    assert ts.day == 5


def test_extract_timestamp_from_markdown_posted():
    """Extract 'Posted: <date>' format."""
    markdown = "Posted: January 1, 2025\n\nContent."
    ts = agent.extract_timestamp_from_markdown(markdown)
    assert ts is not None
    assert ts.year == 2025
    assert ts.month == 1
    assert ts.day == 1


def test_extract_timestamp_from_markdown_none():
    """Return None when no recognizable date found."""
    markdown = "This document has no date information."
    ts = agent.extract_timestamp_from_markdown(markdown)
    assert ts is None


def test_extract_timestamp_from_markdown_multiple_dates():
    """Return first valid date when multiple found."""
    markdown = "Published: March 26, 2024\nLast Updated: March 20, 2024\n\nContent."
    ts = agent.extract_timestamp_from_markdown(markdown)
    assert ts is not None
    # Should return the first one found (Published)
    assert ts.month == 3 and ts.day == 26


def test_parse_firecrawl_content_full_extraction():
    """Parse Firecrawl markdown into structured output."""
    markdown = """
# Sandoz Company Info

Published: March 1, 2024

## Financial Targets

| Metric | 2023 | 2024 Target |
|--------|------|-------------|
| Revenue Growth (%) | 5 | 7-9 |
| Margin (%) | 22 | 23 |

## ESG Commitments

- Global Biosimilar Leadership
- Manufacturing network consolidation
"""
    result = agent.parse_firecrawl_content(markdown)

    # Verify structure
    assert "content_text" in result
    assert "tables" in result
    assert "timestamp" in result
    assert "has_structured_data" in result

    # Verify content_text is plain (no markdown syntax)
    assert "## Financial Targets" not in result["content_text"]
    assert "Sandoz Company Info" in result["content_text"]

    # Verify tables extracted
    assert len(result["tables"]) == 1
    assert len(result["tables"][0]) == 2  # 2 data rows

    # Verify timestamp extracted
    assert result["timestamp"] is not None
    assert result["timestamp"].year == 2024
    assert result["timestamp"].month == 3

    # Verify has_structured_data flag
    assert result["has_structured_data"] is True


def test_parse_firecrawl_content_no_structured_data():
    """Return has_structured_data=False when no tables or timestamps."""
    markdown = """
# Plain Content

Just some text here.
No tables, no dates.
Just prose.
"""
    result = agent.parse_firecrawl_content(markdown)

    assert result["tables"] == []
    assert result["timestamp"] is None
    assert result["has_structured_data"] is False
    assert "Plain Content" in result["content_text"]


def test_parse_firecrawl_content_only_tables():
    """has_structured_data=True if tables exist (no timestamp)."""
    markdown = """
| A | B |
|---|---|
| 1 | 2 |
"""
    result = agent.parse_firecrawl_content(markdown)

    assert len(result["tables"]) == 1
    assert result["timestamp"] is None
    assert result["has_structured_data"] is True


def test_parse_firecrawl_content_only_timestamp():
    """has_structured_data=True if timestamp exists (no tables)."""
    markdown = "Published: March 26, 2024\n\nJust text."
    result = agent.parse_firecrawl_content(markdown)

    assert result["tables"] == []
    assert result["timestamp"] is not None
    assert result["has_structured_data"] is True


def test_confidence_with_structured_data():
    """Confidence scoring includes +1 bonus for structured data."""
    # Base confidence without structured data
    conf_base = agent.calculate_signal_confidence(
        evidence_type="stated",
        source_type="web_search",
        has_tables=False,
        has_timestamp=False,
    )

    # Confidence with tables
    conf_with_tables = agent.calculate_signal_confidence(
        evidence_type="stated",
        source_type="web_search",
        has_tables=True,
        has_timestamp=False,
    )

    # Confidence with timestamp
    conf_with_timestamp = agent.calculate_signal_confidence(
        evidence_type="stated",
        source_type="web_search",
        has_tables=False,
        has_timestamp=True,
    )

    # Confidence with both
    conf_with_both = agent.calculate_signal_confidence(
        evidence_type="stated",
        source_type="web_search",
        has_tables=True,
        has_timestamp=True,
    )

    # Verify bonus is applied (max once, +1)
    assert conf_with_tables == conf_base + 1
    assert conf_with_timestamp == conf_base + 1
    assert conf_with_both == conf_base + 1  # Only +1 even with both


def test_sandoz_firecrawl_markdown_parsing():
    """Integration test: realistic Sandoz markdown parsing and confidence."""
    # Realistic Sandoz IR page markdown
    sandoz_markdown = """
# Sandoz Company Information

Published: March 1, 2024
Last Updated: March 20, 2024

## Financial Targets

| Metric | 2023 | 2024 Target | 2025 Target |
|--------|------|-------------|-------------|
| Revenue Growth (%) | 5 | 7-9 | 8-10 |
| Margin (%) | 22 | 23 | 24-26 |
| Biosimilar Market Share (%) | 35 | 38 | 40 |

## Strategic Commitments

### Global Biosimilar Leadership
- Target: 40% global market share by 2027
- Current status: 35% (2023)
- Growth trajectory: +1-2% annually

### Manufacturing Network
- Consolidation from 12 to 8 facilities by 2026
- Investment in high-throughput facilities
- Focus on emerging markets: India, Brazil, Mexico

### Margin Expansion
- Current: 22% (2023), Target: 24-26% by 2025
- Key driver: biosimilar volume growth
- Generic optimization underway
"""

    # Parse the markdown
    parsed = agent.parse_firecrawl_content(sandoz_markdown)

    # Verify extraction
    assert parsed["has_structured_data"] is True
    assert len(parsed["tables"]) == 1
    assert parsed["timestamp"] is not None
    assert parsed["timestamp"].year == 2024

    # Verify table content
    table = parsed["tables"][0]
    assert len(table) == 3  # 3 metric rows
    assert table[0]["Metric"] == "Revenue Growth (%)"
    assert table[0]["2024 Target"] == "7-9"

    # Verify plain text extraction
    assert "Global Biosimilar Leadership" in parsed["content_text"]
    assert "40% global market share by 2027" in parsed["content_text"]
    assert "## Financial Targets" not in parsed["content_text"]  # Markdown removed

    # Calculate confidence
    conf = agent.calculate_signal_confidence(
        evidence_type="stated",
        source_type="firecrawl",
        has_tables=True,
        has_timestamp=True,
    )

    # Should be: stated base (7) + firecrawl (0) + structured bonus (+1) = 8
    assert conf == 8
