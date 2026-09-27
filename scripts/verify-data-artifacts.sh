#!/usr/bin/env bash
set -euo pipefail

violations="$(find data capaServidor/data -type f \( -iname '*.pdf' -o -iname '*.sql' -o -iname '*.dump' -o -iname '*.bak' \) -print)"
if [[ -n "$violations" ]]; then
  echo "No se permiten PDF ni volcados de base de datos en directorios de datos:"
  echo "$violations"
  exit 1
fi
