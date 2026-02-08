
import re

line = "40011952 - 2025 100879658 - CENTRO BRASILEIRO DE 29/12/2025 / 29/12/2025 SETOR DE CADASTRO IMOB DEFERIDO DIRETORIA DE ARRECADAÇ CANCELAMENTO DE NOTAS"
# Simulate potential leading space
line_with_space = " " + line

# Original regex
original_pattern = re.compile(r"^(\d+ - \d{4})\s+(.+?)(\d{2}/\d{2}/\d{4} \/ \d{2}/\d{2}/\d{4})")

print(f"Testing Line: '{line}'")
match = original_pattern.search(line)
print(f"Original Match (No Space): {match}")

print(f"Testing Line with Space: '{line_with_space}'")
match_space = original_pattern.search(line_with_space)
print(f"Original Match (With Space): {match_space}")

# Proposed fix: Strip line or Allow leading whitespace
# Fix 1: RegEx with ^\s*
fix_pattern = re.compile(r"^\s*(\d+ - \d{4})\s+(.+?)(\d{2}/\d{2}/\d{4} \/ \d{2}/\d{2}/\d{4})")

match_fix = fix_pattern.search(line_with_space)
print(f"Fix Match (With Space): {match_fix}")

if match_fix:
    print(f"Group 1: {match_fix.group(1)}")
    print(f"Group 2: {match_fix.group(2)}")
    print(f"Group 3: {match_fix.group(3)}")
