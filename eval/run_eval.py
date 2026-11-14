"""Evaluate manually reviewed relationship labels from CSV.
The repo does not ship synthetic evaluation scores as real metrics.
"""
import csv
from pathlib import Path
rows=list(csv.DictReader((Path(__file__).parent/'gold_set.csv').open()))
reviewed=[r for r in rows if r.get('expected_label')]
print(f'Gold pairs annotated: {len(reviewed)}')
print('For actual agreement, export model predictions to a second column and compare against reviewer labels.')
