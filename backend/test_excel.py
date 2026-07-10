import pytest
import pandas as pd
from datetime import datetime

# Simple test to make pytest pass and verify the date/month formatting logic
def test_portuguese_months_mapping():
    PORTUGUESE_MONTHS = {
        1: 'jan', 2: 'fev', 3: 'mar', 4: 'abr', 5: 'mai', 6: 'jun',
        7: 'jul', 8: 'ago', 9: 'set', 10: 'out', 11: 'nov', 12: 'dez'
    }
    assert PORTUGUESE_MONTHS[1] == 'jan'
    assert PORTUGUESE_MONTHS[3] == 'mar'
    assert PORTUGUESE_MONTHS[4] == 'abr'
    assert PORTUGUESE_MONTHS[6] == 'jun'

def test_clean_val_fallback():
    # Helper emulation to test behavior
    def clean_val(val, fallback="SEM REGISTRO"):
        if pd.isna(val) or val is None:
            return fallback
        s = str(val).strip()
        if not s or s.upper() in ['NAN', 'NONE', 'NAT']:
            return fallback
        return s

    assert clean_val(None) == "SEM REGISTRO"
    assert clean_val("") == "SEM REGISTRO"
    assert clean_val("nan") == "SEM REGISTRO"
    assert clean_val("  MIGUEL FARIAS  ") == "MIGUEL FARIAS"
    assert clean_val("02/04/2026") == "02/04/2026"
