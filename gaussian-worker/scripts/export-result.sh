#!/usr/bin/env bash
set -e

OUTPUT_DIR="$1"

if [ -z "$OUTPUT_DIR" ]; then
  echo "Uso: bash scripts/export-result.sh <output-dir>"
  exit 1
fi

echo "Exportacion pendiente. Dependera del viewer elegido."
echo "TODO: exportar .ply"
echo "TODO: generar preview"
echo "TODO: subir assets a S3/R2/Vercel Blob"
echo "TODO: retornar viewerUrl al frontend"
