"""
tipo_resolver.py
Resolves truncated 'Tipo de Solicitação' text extracted from PDF columns
against the canonical reference list in tipos/Tipos de Solicitação.md.

Strategy (Hybrid):
  1. Exact prefix match (normalized, accent-free, uppercase)
  2. Fuzzy fallback via difflib (cutoff=0.72)
  3. If no confident match → return raw value unchanged
"""

import os
import unicodedata
from difflib import get_close_matches

# Minimum length for prefix matching to avoid spurious hits
_MIN_PREFIX_LEN = 5

# Fuzzy similarity threshold
_FUZZY_CUTOFF = 0.72

# Path to the reference file relative to this module
_REFERENCE_PATH = os.path.join(
    os.path.dirname(__file__),
    "..", "tipos", "Tipos de Solicitação.md"
)


def _normalize(text: str) -> str:
    """Remove accents, collapse whitespace, uppercase."""
    nfkd = unicodedata.normalize("NFKD", text)
    no_accents = "".join(c for c in nfkd if not unicodedata.combining(c))
    return " ".join(no_accents.upper().split())


def _load_reference(path: str) -> list[str]:
    """Parse the Markdown list and return canonical tipo strings."""
    entries: list[str] = []
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                # Lines like "- SOME TIPO TEXT"
                if line.startswith("- "):
                    entry = line[2:].strip()
                    if entry:
                        entries.append(entry)
    except FileNotFoundError:
        # Graceful degradation: resolver returns raw if file missing
        pass
    return entries


# Load once at import time
_CANONICAL: list[str] = _load_reference(_REFERENCE_PATH)
_NORMALIZED: list[str] = [_normalize(e) for e in _CANONICAL]


def resolve_tipo(raw: str) -> str:
    """
    Resolve a (possibly truncated) raw tipo string to its canonical form.

    Args:
        raw: Text as extracted from the PDF column (may be truncated).

    Returns:
        The canonical tipo string from the reference list, or `raw` unchanged
        when no confident match is found.
    """
    if not raw or not _CANONICAL:
        return raw

    normalized_raw = _normalize(raw)

    if len(normalized_raw) < _MIN_PREFIX_LEN:
        return raw

    # Phase 1: Exact prefix match —— fastest & most reliable
    for idx, norm_entry in enumerate(_NORMALIZED):
        if norm_entry.startswith(normalized_raw):
            return _CANONICAL[idx]

    # Phase 2: Fuzzy fallback for irregular truncations
    matches = get_close_matches(normalized_raw, _NORMALIZED, n=1, cutoff=_FUZZY_CUTOFF)
    if matches:
        idx = _NORMALIZED.index(matches[0])
        return _CANONICAL[idx]

    # Phase 3: No confident match — keep original to avoid wrong substitution
    return raw

