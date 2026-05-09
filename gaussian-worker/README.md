# Gaussian Worker Experimental

Este worker es experimental.

- No corre en Vercel.
- Debe correr en Linux/Ubuntu con GPU NVIDIA, CUDA, Python y COLMAP.
- Usa Nerfstudio Splatfacto para Gaussian Splatting.
- `gsplat` es el backend de rasterizacion.

Referencias:

- https://github.com/graphdeco-inria/gaussian-splatting
- https://docs.nerf.studio/nerfology/methods/splat.html
- https://github.com/nerfstudio-project/gsplat

## Flujo sugerido

1. Crear entorno:

```bash
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

2. Colocar video:

```bash
gaussian-worker/data/input.mp4
```

3. Procesar video:

```bash
bash scripts/process-video.sh data/input.mp4 data/demo
```

4. Entrenar:

```bash
bash scripts/train-splatfacto.sh data/demo outputs/demo-tour
```

5. Exportar:

```bash
bash scripts/export-result.sh outputs/demo-tour
```

## Notas

- El frontend principal solo simula el recorrido 3D en esta fase.
- La integracion real futura deberia enviar archivos ya almacenados en Blob/S3/R2 a este worker.
- El resultado final deberia devolver un `viewerUrl` consumible por la aplicacion Next.js.
