#!/usr/bin/env bash
set -euo pipefail

data_dirs=()
for dir in data capaServidor/data; do
  if [[ -d "$dir" ]]; then data_dirs+=("$dir"); fi
done
violations=""
if ((${#data_dirs[@]})); then
  violations="$(find "${data_dirs[@]}" -type f \( -iname '*.pdf' -o -iname '*.sql' -o -iname '*.dump' -o -iname '*.bak' \) -print)"
fi
if [[ -n "$violations" ]]; then
  echo "No se permiten PDF ni volcados de base de datos en directorios de datos:"
  echo "$violations"
  exit 1
fi
