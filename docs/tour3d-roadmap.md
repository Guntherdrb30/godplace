# Tour 3D Roadmap

## MVP actual

- Upload visual desde frontend.
- Preview de imagenes y video.
- Simulacion de procesamiento.
- Resultado demo con viewer visual falso.
- Intento de client upload directo a Vercel Blob para archivos grandes.
- Contrato de job mock listo para enviarse a un worker GPU.

## Siguiente fase

- Persistir jobs y metadata de uploads.
- Guardar metadata en base de datos.
- Enviar job a worker GPU.
- Procesar con Nerfstudio Splatfacto.
- Devolver `viewerUrl`.
- Mostrar viewer real en frontend.

## Arquitectura futura

Next.js frontend  
→ Vercel Blob / S3 / Cloudflare R2  
→ Job queue  
→ GPU worker  
→ Nerfstudio Splatfacto / gsplat  
→ outputs 3D  
→ viewer web  
→ propiedad inmobiliaria

## Notas de implementacion

- Vercel no es el lugar para entrenar Gaussian Splatting real.
- Para archivos grandes, usar client uploads; no enviar binarios pesados a una API route serverless.
- Esta fase valida UX, narrativa comercial y preparacion de arquitectura.
- En local, si Blob no esta configurado o el upload directo falla, la UI cae a modo demo local para no romper la experiencia.
