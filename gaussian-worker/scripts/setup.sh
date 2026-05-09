#!/usr/bin/env bash
set -e

if [ ! -d ".venv" ]; then
  python -m venv .venv
fi

source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo "Entorno listo. Recuerda instalar CUDA y COLMAP en el sistema antes de procesar datos reales."
