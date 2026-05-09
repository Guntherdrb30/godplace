#!/usr/bin/env bash
set -e

INPUT_VIDEO="$1"
OUTPUT_DIR="$2"

if [ -z "$INPUT_VIDEO" ] || [ -z "$OUTPUT_DIR" ]; then
  echo "Uso: bash scripts/process-video.sh <input-video> <output-dir>"
  exit 1
fi

if [ ! -f "$INPUT_VIDEO" ]; then
  echo "No existe el video de entrada: $INPUT_VIDEO"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

ns-process-data video \
  --data "$INPUT_VIDEO" \
  --output-dir "$OUTPUT_DIR"
