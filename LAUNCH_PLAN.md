# Launch Plan

## Estado actual

El proyecto ya tiene una base funcional importante:

- autenticacion y roles (`ROOT`, `ADMIN`, `ALIADO`, `CLIENTE`)
- alta y revision de aliados
- alta, edicion y aprobacion de propiedades
- carga de imagenes y contratos
- busqueda publica y detalle de propiedad
- cotizacion y creacion de reservas en borrador
- panel operativo para retiros, KYC y catalogo

Los bloqueos principales antes de un lanzamiento real son:

- documentos KYC y contratos en Blob publico
- pagos reales no integrados
- falta de validacion fuerte de disponibilidad/solapamientos
- textos legales aun en placeholder
- `npm run lint` no esta en verde
- sin pruebas automatizadas minimas

## Fase 1 - Beta privada

Objetivo: operar con pocos usuarios reales, flujo manual en reservas, sin exponer riesgos legales o de privacidad.

### Alcance

- acceso restringido o lanzamiento por invitacion
- reservas permitidas solo como solicitud/borrador
- aprobacion manual por el equipo
- sin pasarela de pago todavia

### Trabajo

1. Seguridad documental
- mover KYC y contratos a acceso privado o firmado
- dejar de exponer URLs directas publicas en UI
- agregar expiracion o proxy autenticado para descarga

2. Legal minimo
- reemplazar `/terminos` y `/privacidad` por textos reales
- definir politica de verificacion de aliados
- definir politica de cancelacion y reservas en beta

3. Reserva controlada
- renombrar UX de "Reservar" a "Solicitar reserva" mientras no haya cobro real
- impedir sobreventa validando cruces contra `booking` y `availability`
- dejar claro el estado `DRAFT` y el paso manual posterior

4. Calidad minima
- dejar `npm run lint` en verde
- agregar smoke tests de:
  - login
  - crear propiedad
  - subir contrato
  - publicar propiedad
  - crear borrador de reserva

5. Operacion
- obligar `RESEND_API_KEY` y `EMAIL_FROM` en produccion
- agregar checklist de entorno para Vercel
- verificar seed/bootstrap del aliado interno y ROOT inicial

### Criterio de salida

- KYC y contratos ya no son publicos
- textos legales definitivos publicados
- reservas no generan sobreventa
- lint limpio
- smoke tests de flujos criticos funcionando

## Fase 2 - Beta operativa

Objetivo: permitir operacion continua con aliados reales y seguimiento administrativo confiable.

### Alcance

- onboarding de aliados estable
- aprobacion de propiedades con notificaciones reales
- reservas trazables end-to-end aunque el cobro siga manual o semimanual

### Trabajo

1. Flujo de propiedad completo
- checklist visible de completitud de propiedad
- notas de rechazo/aprobacion consistentes
- historial operativo o auditoria mas legible para admin

2. Reserva operativa
- estados claros: `DRAFT`, `PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED`, `COMPLETED`
- pagina de seguimiento de reserva para cliente
- email de confirmacion/rechazo/cancelacion

3. Finanzas internas
- revisar billetera y retiros con reglas mas estrictas
- conciliacion de ganancias por reserva confirmada
- comprobantes y referencias obligatorias

4. Observabilidad
- panel de errores operativos
- alertas para 500/401/413 recurrentes
- logs estructurados para acciones criticas

### Criterio de salida

- aliados pueden operar sin soporte constante
- admin puede aprobar/rechazar y rastrear cambios
- reservas tienen estados claros y notificaciones confiables

## Fase 3 - Lanzamiento publico

Objetivo: abrir captacion real de usuarios y conversion de reservas con riesgo acotado.

### Alcance

- experiencia publica consistente
- conversion con pago real o flujo comercial formal
- monitoreo y soporte minimo definidos

### Trabajo

1. Pagos reales
- integrar proveedor
- persistir `payments` y confirmaciones reales
- pasar booking de borrador a confirmada solo con cobro valido

2. Politicas finales
- terminos finales revisados por legal
- privacidad final
- politica de reembolsos, cancelaciones y disputas

3. SEO y marketing
- revisar metadata, Open Graph e imagenes reales
- completar home, hero y catalogo con contenido real
- verificar indexacion y rendimiento basico

4. Hardening
- rate limiting en auth y endpoints sensibles
- revision de sesiones, expiracion y recuperacion de password
- backup/restore y procedimiento de incidentes

### Criterio de salida

- un cliente puede reservar y pagar sin intervencion manual
- documentos y datos sensibles estan protegidos
- legal, soporte y monitoreo estan definidos

## Orden recomendado de ejecucion

1. Privacidad de documentos
2. Terminos y privacidad finales
3. Validacion de disponibilidad
4. Lint limpio
5. Smoke tests
6. Renombrar UX de reserva a solicitud si aun no hay pagos
7. Notificaciones y entorno productivo
8. Pagos reales

## Primer bloque recomendado

Si empezamos hoy, el bloque con mejor retorno es:

1. privacidad de KYC/contratos
2. validacion de solapamientos de reserva
3. limpiar lint de ChatKit

Ese bloque reduce riesgo real y deja el sistema mas serio para beta privada.
