#!/usr/bin/env bash
set -e

DATASET_DIR="$1"
OUTPUT_DIR="$2"

if [ -z "$DATASET_DIR" ] || [ -z "$OUTPUT_DIR" ]; then
  echo "Uso: bash scripts/train-splatfacto.sh <dataset-dir> <output-dir>"
  exit 1
fi

if [ ! -d "$DATASET_DIR" ]; then
  echo "No existe el dataset procesado: $DATASET_DIR"
  exit 1
fi

ns-train splatfacto \
  --data "$DATASET_DIR" \
  --output-dir "$OUTPUT_DIR"
