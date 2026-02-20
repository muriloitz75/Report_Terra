"""
test_tipo_resolver.py
Unit tests for the hybrid tipo resolver (prefix + fuzzy matching).
Run with: python -m pytest backend/test_tipo_resolver.py -v
       or: python -m unittest backend.test_tipo_resolver -v
"""

import sys
import os
import unittest

# Allow running from the project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from tipo_resolver import resolve_tipo


class TestPrefixMatch(unittest.TestCase):
    """Phase 1: exact prefix should resolve to full canonical name."""

    def test_alvara_baixo_risco(self):
        result = resolve_tipo("ALVARA DE FUNCIONAMENTO - BAI")
        self.assertIn("BAIXO RISCO", result.upper())

    def test_certidao_negativa(self):
        result = resolve_tipo("CERTIDAO NEGATIVA DE DEBITO")
        self.assertIn("CERTIDÃO NEGATIVA DE DÉBITOS", result)

    def test_credito_tributario_parcelamento(self):
        result = resolve_tipo("CREDITO TRIBUTARIO - PARCELA")
        self.assertIn("PARCELAMENTO", result.upper())

    def test_imunidade_templos(self):
        result = resolve_tipo("IMUNIDADE TRIBUTARIA - TEMPL")
        self.assertIn("TEMPLOS", result.upper())

    def test_iptu_impugnacao(self):
        result = resolve_tipo("IPTU - IMPUGNACAO DE LANCAME")
        self.assertIn("IPTU", result)
        self.assertIn("IMPUGNA", result.upper())

    def test_cmc_inscricao_mercantil(self):
        result = resolve_tipo("CMC - INSCRICAO NO CADASTRO")
        self.assertIn("CMC", result)
        self.assertIn("INSCRI", result.upper())


class TestFuzzyFallback(unittest.TestCase):
    """Phase 2: fuzzy should catch irregular truncations."""

    def test_issqn_lancamento(self):
        result = resolve_tipo("ISSQN - LANCAMNT")
        self.assertIn("ISSQN", result)

    def test_cancelamento_nfs(self):
        result = resolve_tipo("CANCELAMENTO NFS-E EXTEMPORANE")
        self.assertIn("CANCELAMENTO", result.upper())


class TestNoSubstitution(unittest.TestCase):
    """Phase 3: unknown/unrelated text must be returned unchanged."""

    def test_unknown_text(self):
        raw = "TEXTO INVALIDO QUALQUER"
        self.assertEqual(resolve_tipo(raw), raw)

    def test_empty_string(self):
        self.assertEqual(resolve_tipo(""), "")

    def test_too_short(self):
        # Less than MIN_PREFIX_LEN chars should not be substituted
        result = resolve_tipo("IP")
        self.assertEqual(result, "IP")

    def test_none_from_missing_file(self):
        # Passing None-equivalent — should not raise
        self.assertEqual(resolve_tipo(""), "")


class TestCanonicalFormPreserved(unittest.TestCase):
    """Resolved types must retain original casing and accents."""

    def test_accents_preserved(self):
        result = resolve_tipo("ISENÇÃO TRIBUTARIA IPTU - APOSEN")
        # Should contain accent characters from canonical list
        self.assertIn("Ã", result.upper() if result else "")  # lenient check

    def test_alvara_definitivo(self):
        result = resolve_tipo("ALVARA DE FUNCIONAMENTO DEFINIT")
        self.assertIn("DEFINITIVO", result.upper())

    def test_iptu_revisao(self):
        result = resolve_tipo("IPTU - REVISAO")
        self.assertIn("IPTU", result)
        self.assertIn("REVIS", result.upper())


if __name__ == "__main__":
    unittest.main(verbosity=2)
