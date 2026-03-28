"""Integration test: RLS enforcement — anon key cannot write to signals.

DB-04 requirement: The anon role must have no INSERT policy on the signals table.
Any insert attempt with the anon key must raise an exception or return an error.
"""
import os
import sys
import pytest
from pathlib import Path

# Load frontend/.env.local for NEXT_PUBLIC_SUPABASE_ANON_KEY
from dotenv import load_dotenv

FRONTEND_ENV = Path(__file__).parents[2] / "frontend" / ".env.local"
load_dotenv(FRONTEND_ENV, override=False)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
ANON_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

skip_if_no_creds = pytest.mark.skipif(
    not SUPABASE_URL or not ANON_KEY or "placeholder" in (ANON_KEY or ""),
    reason="Live Supabase credentials not available — skipping RLS integration test",
)


@skip_if_no_creds
def test_anon_cannot_insert_signal():
    """DB-04: RLS enforced — anon key must not be able to insert into signals."""
    from supabase import create_client

    anon_client = create_client(SUPABASE_URL, ANON_KEY)

    # Minimal signal payload — all required fields
    payload = {
        "objective_id": "00000000-0000-0000-0000-000000000000",  # non-existent UUID
        "company_id": "00000000-0000-0000-0000-000000000000",
        "signal_date": "2026-01-01",
        "source_type": "other",
        "source_name": "RLS Test",
        "source_url": "https://example.com",
        "classification": "stated",
        "confidence": 5,
        "excerpt": "RLS test — should be rejected",
        "is_draft": True,
    }

    try:
        result = anon_client.table("signals").insert(payload).execute()
        # If we reach here, the insert succeeded — RLS is NOT enforced
        pytest.fail(
            f"Anon key was able to insert into signals table — RLS policy missing or "
            f"misconfigured. Response: {result}"
        )
    except Exception as e:
        # Any exception means the insert was blocked — this is the expected outcome
        error_str = str(e).lower()
        # Confirm it's an auth/RLS error, not a network error
        assert any(
            term in error_str
            for term in ["403", "401", "rls", "policy", "permission", "denied", "violates", "jwt"]
        ), (
            f"Insert raised an exception but not a clear RLS/auth error. Got: {e}"
        )
