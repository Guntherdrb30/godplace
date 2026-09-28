# PRD — METRORA
## Plataforma PropTech SaaS multiempresa + Marketplace Inmobiliario

**Versión:** 0.1  
**Estado:** Draft operativo  
**Producto:** METRORA  
**Empresa:** Trends172Tech  
**Repositorio base:** Guntherdrb30/godplace  
**Base técnica:** evolución de Good Place, no reescritura desde cero  
**Baseline revisado:** rama main, commit 49587d1092f51c0837b57b14937ec2da786e8341  
**Deployment baseline:** godplace / Vercel, estado READY al momento de la revisión

---

# 1. Resumen ejecutivo

METRORA será una plataforma PropTech SaaS multiempresa que permitirá a múltiples inmobiliarias operar de manera independiente dentro de una misma infraestructura tecnológica y publicar sus propiedades en un marketplace inmobiliario compartido.

El producto evolucionará directamente desde Good Place. Se conservarán los módulos, flujos, modelos de datos, componentes, servicios y aprendizajes ya implementados siempre que sean reutilizables. La transformación a METRORA se hará de manera incremental y reversible, evitando una reescritura total.

METRORA tendrá dos superficies principales:

1. **METRORA Marketplace**
   - Catálogo público de propiedades provenientes de múltiples inmobiliarias.
   - Búsqueda, filtros, IA, fichas de propiedades, recorridos 3D, contacto, solicitudes, reservas y generación de leads.
   - Identificación visible de la inmobiliaria responsable de cada publicación.

2. **METRORA Business**
   - SaaS privado para cada inmobiliaria.
   - Gestión de agentes, clientes, propietarios, propiedades, leads, CRM, visitas, ofertas, ventas, alquileres, reservas, documentos, comisiones, marketing, IA, recorridos 3D y analítica.

METRORA contará además con una capa global de administración de Trends172Tech:

3. **METRORA ROOT**
   - Administración de tenants/inmobiliarias.
   - Planes y suscripciones.
   - Usuarios y límites.
   - Costos y consumo de IA.
   - Procesamiento 3D.
   - Configuración global.
   - Seguridad.
   - Auditoría.
   - Métricas globales.
   - Facturación SaaS.
   - Proveedores y servicios.

El objetivo estratégico es convertir la base actual de Good Place en una plataforma comercializable a múltiples inmobiliarias sin perder el trabajo ya realizado.

---

# 2. Principio de migración

## Regla principal

**Good Place no se descarta. METRORA nace de Good Place.**

Toda funcionalidad existente debe clasificarse en una de estas categorías:

- **CONSERVAR:** se mantiene prácticamente igual.
- **ADAPTAR:** se reutiliza pero debe hacerse tenant-aware o ajustarse al nuevo dominio.
- **MIGRAR:** cambia de modelo o proveedor sin perder datos ni flujo.
- **REEMPLAZAR DESPUÉS:** permanece operativa hasta que exista un equivalente validado.
- **NUEVO:** funcionalidad que no existe actualmente.

## Regla de no pérdida

No se eliminará ninguna ruta, tabla, flujo o servicio funcional de Good Place hasta que:

1. exista un reemplazo equivalente en METRORA;
2. el reemplazo tenga pruebas mínimas;
3. los datos hayan sido migrados o mapeados;
4. se valide el flujo en preview;
5. exista plan de rollback.

---

# 3. Problema

Las inmobiliarias suelen operar con herramientas fragmentadas:

- WhatsApp para prospectos;
- hojas de cálculo para propiedades;
- archivos independientes para propietarios;
- calendarios separados para visitas;
- portales externos para publicaciones;
- redes sociales para marketing;
- sistemas distintos para alquileres;
- documentación sin trazabilidad;
- poca automatización del seguimiento;
- ausencia de experiencias inmersivas;
- poca integración entre ventas, alquileres y marketing.

METRORA unificará estos procesos en una sola plataforma y, simultáneamente, ofrecerá un marketplace compartido que aumente la exposición de las propiedades de las inmobiliarias participantes.

---

# 4. Visión de producto

Convertirse en una red inmobiliaria digital donde distintas inmobiliarias puedan:

- tener un espacio privado e independiente;
- gestionar su operación;
- incorporar agentes y usuarios;
- gestionar propietarios y clientes;
- registrar propiedades;
- administrar venta y alquiler;
- crear publicaciones;
- usar IA para búsqueda, atención y operación;
- crear recorridos 3D;
- generar marketing;
- gestionar leads y oportunidades;
- manejar reservas;
- medir desempeño;
- publicar propiedades en un marketplace común.

METRORA no será una inmobiliaria. Será la infraestructura tecnológica de las inmobiliarias.

---

# 5. Objetivos

## 5.1 Objetivos de producto

1. Transformar Good Place en un SaaS inmobiliario multitenant.
2. Mantener y aprovechar las funciones existentes.
3. Permitir el onboarding de múltiples inmobiliarias.
4. Crear un marketplace público común.
5. Gestionar venta, alquiler temporal, alquiler residencial y alquiler comercial.
6. Incorporar CRM inmobiliario.
7. Convertir el pipeline 3D actual en procesamiento real.
8. Consolidar un agente de IA conectado a inventario real.
9. Incorporar una capa ROOT para operación del SaaS.
10. Preparar el producto para comercialización nacional y posterior expansión regional.

## 5.2 Objetivos de negocio

- Suscripciones SaaS por inmobiliaria.
- Posibles cargos por usuarios/agentes.
- Límites por propiedades publicadas.
- Consumo de IA.
- Créditos o cargos por generación de recorridos 3D.
- Servicios de marketing.
- Comisiones opcionales por reservas.
- Servicios premium y white-label en fases posteriores.

---

# 6. No objetivos del MVP inicial

El primer MVP de METRORA no pretende:

- reemplazar sistemas contables completos;
- convertirse en banco o custodio financiero;
- ofrecer escrituración digital completa;
- automatizar decisiones legales;
- garantizar valoración financiera de inmuebles;
- permitir que propietarios independientes operen fuera de una inmobiliaria como modelo principal;
- lanzar simultáneamente en múltiples países;
- sustituir validaciones jurídicas locales.

Estos puntos podrán evaluarse en fases posteriores.

---

# 7. Usuarios y roles

## 7.1 ROOT Trends172Tech

Operador global de METRORA.

Capacidades:

- crear, suspender y administrar tenants;
- gestionar planes;
- administrar billing;
- controlar límites;
- revisar consumo;
- monitorear IA;
- monitorear procesamiento 3D;
- gestionar proveedores;
- ver auditoría global;
- gestionar configuración de plataforma;
- supervisar incidentes;
- controlar features por plan;
- acceder a métricas agregadas;
- administrar dominios y branding;
- asistencia operativa.

## 7.2 Tenant / Inmobiliaria

Entidad empresarial independiente dentro de METRORA.

Cada tenant tendrá:

- razón social;
- nombre comercial;
- logo;
- colores;
- datos fiscales;
- dirección;
- teléfonos;
- WhatsApp;
- email;
- dominio o subdominio;
- plan;
- límites;
- estado;
- sucursales;
- usuarios;
- agentes;
- propietarios/clientes;
- propiedades;
- leads;
- operaciones;
- documentos;
- métricas.

## 7.3 Administrador de inmobiliaria

Gestiona la operación del tenant:

- usuarios;
- agentes;
- propiedades;
- propietarios;
- clientes;
- publicaciones;
- CRM;
- visitas;
- alquileres;
- ventas;
- marketing;
- reportes;
- documentos;
- configuración permitida.

## 7.4 Agente inmobiliario

- recibe leads;
- gestiona cartera;
- crea o actualiza propiedades;
- registra prospectos;
- programa visitas;
- registra seguimiento;
- carga notas;
- registra ofertas;
- avanza oportunidades;
- genera material de marketing;
- puede iniciar captura 3D si su plan lo permite.

## 7.5 Propietario

Persona o empresa que entrega una propiedad a una inmobiliaria.

Puede tener acceso opcional para:

- ver sus propiedades;
- revisar estado de publicación;
- consultar leads agregados;
- revisar visitas;
- consultar reservas;
- ver ingresos cuando aplique;
- consultar documentos autorizados;
- recibir notificaciones.

## 7.6 Cliente / Prospecto

Usuario que:

- busca propiedades;
- guarda favoritas;
- consulta;
- conversa con IA;
- solicita contacto;
- agenda visita;
- solicita reserva;
- realiza ofertas o solicitudes;
- gestiona reservas;
- consulta su historial.

---

# 8. Modelo multi-tenant

METRORA será multi-tenant real.

## Requisitos

- Toda entidad operacional debe pertenecer a un tenant.
- Los usuarios pueden pertenecer a uno o más tenants mediante membresías.
- Un agente no podrá consultar datos de otro tenant salvo permisos ROOT explícitos.
- Toda consulta backend sensible debe filtrar por tenantId.
- Las rutas privadas deben resolver tenant y membership.
- Los registros de auditoría deben guardar tenantId.
- Los archivos privados deben estar separados lógicamente por tenant.
- Los jobs de IA y 3D deben incluir tenantId y límites de consumo.
- Las métricas de un tenant no deben incluir datos de otros tenants.

## Modelo objetivo mínimo

- Tenant
- TenantMembership
- Branch
- User
- Role
- Permission
- OwnerProfile
- ClientProfile
- AgentProfile
- Property
- Listing
- Lead
- Visit
- Deal
- Offer
- Booking
- Payment
- Payout
- Document
- Tour3DJob
- MarketingCampaign
- Subscription
- Plan
- UsageRecord
- AuditEvent

---

# 9. Marketplace público

## 9.1 Objetivo

Crear un marketplace nacional donde se muestren propiedades de distintas inmobiliarias dentro de una experiencia unificada.

## 9.2 Tipos de propiedad

Mínimo:

- apartamento;
- casa;
- townhouse;
- terreno;
- parcela;
- oficina;
- local comercial;
- galpón;
- edificio;
- finca;
- hotel/posada;
- propiedad industrial;
- propiedad vacacional;
- otros configurables.

## 9.3 Operaciones

- venta;
- alquiler temporal;
- alquiler residencial;
- alquiler comercial;
- opción configurable de venta/alquiler simultáneo.

## 9.4 Búsqueda y filtros

- estado;
- ciudad;
- zona;
- tipo;
- operación;
- rango de precio;
- moneda;
- habitaciones;
- baños;
- estacionamientos;
- superficie;
- amoblado;
- servicios;
- amenidades;
- acepta mascotas;
- disponibilidad;
- recorrido 3D;
- inmobiliaria;
- agente;
- palabras clave.

## 9.5 Ficha de propiedad

Debe incluir:

- galería;
- video;
- recorrido 3D;
- ubicación;
- mapa;
- descripción;
- características;
- amenidades;
- superficie;
- precio;
- moneda;
- operación;
- disponibilidad;
- inmobiliaria responsable;
- agente responsable cuando corresponda;
- CTA WhatsApp;
- solicitar información;
- agendar visita;
- reservar si aplica;
- compartir;
- favoritos;
- propiedades similares.

---

# 10. Gestión de propiedades

## 10.1 Captación

Una propiedad puede ser creada por:

- administrador;
- agente;
- personal autorizado;
- propietario mediante onboarding controlado.

## 10.2 Estados

Propuesta inicial:

- DRAFT
- INCOMPLETE
- PENDING_REVIEW
- APPROVED
- PUBLISHED
- PAUSED
- RESERVED
- UNDER_NEGOTIATION
- RENTED
- SOLD
- REJECTED
- ARCHIVED

## 10.3 Datos

- propietario;
- inmobiliaria;
- agente;
- tipo;
- operación;
- ubicación;
- dirección privada;
- ubicación pública aproximada;
- precio;
- moneda;
- comisión;
- características;
- imágenes;
- video;
- documentos;
- tour 3D;
- condiciones;
- disponibilidad;
- publicación;
- SEO;
- tags;
- estado comercial.

---

# 11. CRM inmobiliario

METRORA incluirá un CRM nativo.

## 11.1 Leads

Un lead puede originarse desde:

- marketplace;
- WhatsApp;
- formulario;
- llamada;
- visita;
- campaña;
- redes sociales;
- importación;
- registro manual;
- IA.

## 11.2 Datos del lead

- nombre;
- contacto;
- fuente;
- propiedad de interés;
- presupuesto;
- tipo de operación;
- ubicación deseada;
- criterios;
- agente asignado;
- estado;
- prioridad;
- notas;
- actividades;
- siguiente acción.

## 11.3 Pipeline

Estados iniciales configurables:

- NUEVO
- CONTACTADO
- CALIFICADO
- VISITA_PROGRAMADA
- VISITA_REALIZADA
- OFERTA
- NEGOCIACIÓN
- CERRADO_GANADO
- CERRADO_PERDIDO

## 11.4 Automatización

- asignación de leads;
- recordatorios;
- seguimiento;
- alertas por inactividad;
- respuestas IA;
- recomendaciones de propiedades;
- tareas de agente;
- notificaciones.

---

# 12. Ventas inmobiliarias

Flujo objetivo:

Lead  
→ calificación  
→ selección de propiedad  
→ visita  
→ oferta  
→ contraoferta  
→ negociación  
→ documentación  
→ cierre  
→ vendido

Funciones:

- oferta;
- historial de ofertas;
- notas;
- documentos;
- monto;
- comisión;
- agente;
- propietario;
- cliente;
- etapas;
- fechas;
- cierre;
- auditoría.

---

# 13. Alquiler residencial y comercial

Funciones:

- precio mensual;
- depósito;
- duración;
- condiciones;
- disponibilidad;
- prospecto;
- visita;
- aprobación;
- contrato;
- renovación;
- estado;
- historial.

La gestión de cobros recurrentes podrá ser una fase posterior si no es necesaria para el MVP comercial.

---

# 14. Alquiler temporal

Se conservará y evolucionará el flujo existente de Good Place.

Funciones objetivo:

- calendario;
- disponibilidad;
- tarifa por noche;
- ocupación máxima;
- noches mínimas;
- fechas bloqueadas;
- cotización;
- cargos;
- reserva;
- estados;
- cancelación;
- pago;
- liquidación;
- historial;
- notificaciones.

Estados objetivo:

- DRAFT
- PENDING_PAYMENT
- CONFIRMED
- CANCELLED
- COMPLETED
- REFUNDED

---

# 15. METRORA AI

## 15.1 Asistente público

La IA podrá entender búsquedas naturales.

Ejemplo:

“Busco apartamento de tres habitaciones en Valencia, dos puestos de estacionamiento, menos de 120.000 dólares y con recorrido 3D.”

La IA consultará datos reales.

Nunca inventará:

- propiedades;
- precios;
- disponibilidad;
- características;
- inmobiliarias;
- agentes.

## 15.2 Tools iniciales

Se reutilizarán y evolucionarán las tools existentes de Good Place:

- search_properties
- get_property
- quote_booking
- create_booking_draft
- get_policies

Nuevas tools:

- search_listings
- search_by_natural_language
- compare_properties
- create_lead
- assign_agent
- schedule_visit
- create_offer_draft
- check_availability
- recommend_similar
- get_agency
- create_contact_request

## 15.3 IA interna

Para administradores y agentes:

- redactar descripción;
- mejorar anuncio;
- extraer características desde documentos;
- sugerir etiquetas;
- resumir lead;
- preparar seguimiento;
- comparar propiedades;
- recomendar propiedades;
- generar textos de marketing;
- analizar desempeño.

Toda acción que modifique datos críticos deberá requerir confirmación o reglas explícitas.

---

# 16. METRORA 3D

## 16.1 Base existente a conservar

Good Place ya contiene:

- UI de carga;
- preview de imágenes/video;
- client upload a Blob;
- pipeline visual;
- creación de job;
- contrato para worker;
- scripts experimentales;
- Nerfstudio Splatfacto;
- gsplat;
- modo video-to-3d-tour;
- modo images-to-3d-tour.

Esto se conserva.

## 16.2 Estado actual

Actualmente el recorrido es una demo preparada para procesamiento real.

No debe comunicarse internamente como función terminada hasta conectar:

- worker GPU;
- cola;
- persistencia;
- procesamiento;
- exportación;
- almacenamiento de output;
- viewer;
- callback;
- manejo de errores;
- costo por job.

## 16.3 Arquitectura objetivo

Navegador  
→ upload directo  
→ almacenamiento  
→ creación Tour3DJob  
→ cola  
→ worker GPU  
→ procesamiento fotogrametría / Gaussian Splatting  
→ Splatfacto / gsplat  
→ exportación  
→ almacenamiento  
→ viewerUrl  
→ Property / Listing  
→ Marketplace

## 16.4 Estados del job

- UPLOADING
- QUEUED
- PREPROCESSING
- TRAINING
- EXPORTING
- READY
- FAILED
- CANCELLED

## 16.5 Requisitos comerciales

- plan o créditos;
- costo por procesamiento;
- límite de duración;
- calidad mínima de captura;
- guía de grabación;
- preview;
- reintento;
- historial;
- borrado;
- asociación a propiedad.

---

# 17. Marketing inmobiliario

METRORA permitirá generar material desde una propiedad.

Funciones iniciales:

- descripción;
- copy para Instagram;
- copy para Facebook;
- texto para WhatsApp;
- ficha comercial;
- carrusel;
- guion de Reel;
- guion de video;
- email;
- landing copy.

Fases posteriores:

- generación de video;
- publicación asistida;
- campañas;
- Meta Ads;
- atribución;
- analítica de campañas.

---

# 18. Branding por tenant

Cada inmobiliaria podrá configurar:

- logo;
- nombre;
- colores;
- datos;
- WhatsApp;
- email;
- redes;
- dominio/subdominio;
- firma;
- información comercial.

El marketplace conservará identidad METRORA, pero las fichas mostrarán claramente la inmobiliaria responsable.

Fase posterior:

- micrositio white-label;
- dominio personalizado;
- landing propia;
- catálogo de la inmobiliaria.

---

# 19. ROOT global

Área exclusiva de Trends172Tech.

## Módulos

### Dashboard
- tenants activos;
- usuarios;
- propiedades;
- publicaciones;
- leads;
- bookings;
- ventas;
- actividad;
- uso IA;
- jobs 3D;
- MRR/ARR cuando aplique;
- costos de proveedores;
- alertas.

### Tenants
- crear;
- editar;
- suspender;
- límites;
- plan;
- branding;
- usuarios;
- soporte.

### Planes
- precio;
- límites;
- módulos;
- usuarios;
- propiedades;
- IA;
- 3D;
- marketing;
- features.

### Billing
- suscripciones;
- estado de pagos;
- facturas;
- créditos;
- consumo;
- ajustes.

### IA
- proveedor;
- modelo;
- límites;
- consumo;
- costo;
- margen;
- logs operativos seguros.

### 3D
- jobs;
- cola;
- proveedor GPU;
- costo;
- duración;
- errores;
- reintentos.

### Seguridad
- sesiones;
- rate limiting;
- auditoría;
- incidentes;
- configuraciones.

### Proveedores
- Vercel;
- Neon/PostgreSQL;
- email;
- almacenamiento;
- IA;
- GPU;
- pagos;
- mapas.

---

# 20. Planes SaaS

El modelo económico se definirá posteriormente.

El sistema debe soportar desde arquitectura:

- plan;
- ciclo;
- límite de agentes;
- límite de usuarios;
- límite de propiedades;
- límite de publicaciones;
- créditos IA;
- créditos 3D;
- almacenamiento;
- dominio personalizado;
- features;
- overages;
- add-ons.

No se fijan precios en esta versión del PRD.

---

# 21. Pagos

La pasarela final es una decisión pendiente.

El diseño debe desacoplar proveedor de pago mediante una capa PaymentsProvider.

Casos:

1. Suscripción de inmobiliaria a METRORA.
2. Reserva de alquiler temporal.
3. Cargos opcionales por marketing.
4. Créditos 3D.
5. Créditos IA.
6. Add-ons.

Opciones a evaluar:

- Stripe;
- Unopago;
- pasarela bancaria propia;
- combinación por país.

Ningún booking debe marcarse como pagado únicamente por respuesta del frontend.

---

# 22. Datos y arquitectura

## 22.1 Stack base que se conserva inicialmente

- Next.js
- React
- TypeScript
- Tailwind
- shadcn/ui
- Prisma
- PostgreSQL / Neon
- Vercel
- Vercel Blob en la fase de migración

## 22.2 Evolución

Evaluar:

- Clerk para autenticación SaaS con Organizations;
- Redis para rate limiting, colas ligeras, locks y caché;
- almacenamiento privado/firma de URLs;
- cola externa para jobs 3D;
- GPU provider externo;
- observabilidad centralizada.

La migración de autenticación no bloqueará el avance inicial. El sistema actual seguirá funcionando hasta que el nuevo flujo esté probado.

---

# 23. Seguridad

Requisitos mínimos:

- aislamiento por tenant;
- RBAC;
- autorización server-side;
- validación Zod;
- rate limiting;
- auditoría;
- protección de documentos;
- URLs privadas o firmadas para KYC/contratos;
- secretos solo server-side;
- backups;
- restauración;
- no exponer cuentas completas;
- protección de webhooks;
- idempotencia en pagos;
- control de subida de archivos;
- antivirus/validación donde aplique;
- logs sin secretos.

---

# 24. Documentos y KYC

La funcionalidad KYC existente se conserva y se adapta.

## Inmobiliaria
- identificación fiscal;
- datos legales;
- representante;
- validación administrativa.

## Propietario
- identidad;
- documento de propiedad/poder;
- datos de contacto.

## Agente
- identificación;
- relación con tenant;
- documentos opcionales.

El acceso a documentos sensibles debe abandonar el modelo de URL pública directa.

---

# 25. Auditoría

Eventos importantes:

- login;
- cambio de roles;
- creación/edición de propiedad;
- publicación;
- cambios de precio;
- modificación de propietario;
- booking;
- pago;
- payout;
- oferta;
- cierre;
- acceso a documentos;
- cambio de tenant;
- cambios ROOT;
- consumo de créditos;
- jobs 3D.

---

# 26. SEO

Marketplace:

- metadata por propiedad;
- sitemap;
- canonical;
- Open Graph;
- schema.org;
- páginas indexables por ciudad/tipo;
- URLs amigables;
- rendimiento;
- imágenes optimizadas.

Los dashboards privados no deben indexarse.

---

# 27. Notificaciones

Canales:

- in-app;
- email;
- WhatsApp en fase correspondiente;
- push/PWA en fase posterior.

Eventos:

- nuevo lead;
- lead asignado;
- visita;
- oferta;
- cambio de propiedad;
- reserva;
- pago;
- documento;
- aprobación;
- job 3D listo;
- límite de plan;
- renovación.

---

# 28. Analítica

## Inmobiliaria

- propiedades activas;
- propiedades publicadas;
- vistas;
- leads;
- conversión;
- visitas;
- ofertas;
- cierres;
- alquileres;
- reservas;
- agentes;
- desempeño;
- fuentes;
- campañas.

## ROOT

- tenants;
- crecimiento;
- uso;
- activación;
- propiedades;
- consumo;
- IA;
- 3D;
- ingresos SaaS;
- costos;
- margen;
- retención.

---

# 29. Migración desde Good Place

## 29.1 Conservar

- estructura Next.js;
- componentes UI;
- catálogo público;
- búsqueda;
- Property;
- PropertyImage;
- amenidades;
- reservas;
- disponibilidad;
- pricing existente como base;
- KYC;
- contratos;
- Blob;
- wallet/payout como referencia;
- auditoría;
- branding ROOT;
- IA y tools existentes;
- pipeline tour3D;
- worker experimental;
- SEO;
- accesibilidad;
- layout;
- dashboards reutilizables.

## 29.2 Adaptar

- ALIADO → concepto de propietario/miembro vinculado a tenant;
- ADMIN → administrador por tenant;
- ROOT → ROOT global Trends172Tech;
- Property → tenant-aware;
- Booking → tenant-aware;
- Wallet → tenant/owner aware;
- branding → configuración por tenant + branding global;
- chat IA → contexto tenant y marketplace;
- search → resultados multi-tenant;
- documentos → almacenamiento privado.

## 29.3 Nuevo

- Tenant;
- Membership;
- Branch;
- Agent;
- CRM;
- Lead;
- Visit;
- Deal;
- Offer;
- Listing independiente de Property;
- Subscription;
- Plan;
- Usage;
- entitlements;
- tenant billing;
- marketplace federation;
- micrositios;
- 3D real;
- jobs persistentes;
- cola GPU;
- reporting SaaS.

---

# 30. Estrategia de datos

No realizar una migración destructiva inicial.

Secuencia:

1. respaldar;
2. introducir Tenant;
3. crear tenant interno para los datos existentes;
4. asociar registros actuales;
5. agregar nuevas relaciones como opcionales;
6. backfill;
7. validar;
8. volver obligatorios los campos cuando toda la data esté migrada;
9. retirar estructuras antiguas solo después de validación.

---

# 31. Fases

## Fase 0 — Baseline y protección

Objetivo: congelar y documentar el estado actual.

- identificar deployment canónico;
- eliminar confusión godplace/godpalce sin borrar antes de decidir;
- backup;
- inventario de rutas;
- inventario de modelos;
- tests de smoke;
- checklist de módulos existentes.

## Fase 1 — Rebranding técnico a METRORA

- nombre;
- branding;
- variables;
- metadata;
- textos;
- assets;
- documentación;
- no cambiar comportamiento funcional.

## Fase 2 — Tenant foundation

- Tenant;
- Membership;
- tenant context;
- RBAC tenant-aware;
- migración de registros;
- aislamiento;
- ROOT tenants;
- pruebas de aislamiento.

## Fase 3 — Marketplace multiempresa

- listings;
- inmobiliaria visible;
- filtro por inmobiliaria;
- tenant publication;
- búsqueda unificada;
- micrositio básico.

## Fase 4 — CRM

- leads;
- agentes;
- pipeline;
- visitas;
- tareas;
- seguimiento;
- reporting.

## Fase 5 — Venta + alquiler completo

- deals;
- offers;
- venta;
- long rent;
- commercial rent;
- short rent;
- estados separados.

## Fase 6 — METRORA 3D real

- persistencia jobs;
- cola;
- GPU;
- Nerfstudio;
- export;
- viewer;
- créditos;
- monitoreo.

## Fase 7 — IA ampliada

- búsqueda avanzada;
- creación de lead;
- visitas;
- recomendación;
- IA interna;
- controles de consumo.

## Fase 8 — Billing SaaS

- planes;
- suscripciones;
- entitlements;
- créditos;
- consumo;
- ROOT billing.

## Fase 9 — Marketing y escala

- campañas;
- automatización;
- PWA;
- dominios;
- white-label;
- observabilidad;
- expansión.

---

# 32. MVP comercial recomendado

El primer MVP comercial de METRORA debe permitir:

1. Crear una inmobiliaria.
2. Crear administradores y agentes.
3. Registrar propietarios.
4. Registrar propiedades.
5. Publicar propiedades.
6. Mostrar propiedades en marketplace.
7. Identificar inmobiliaria responsable.
8. Recibir leads.
9. Asignar leads.
10. Gestionar pipeline.
11. Agendar visitas.
12. Gestionar venta o alquiler.
13. Usar búsqueda IA sobre inventario real.
14. Mantener el demo 3D y posteriormente activar el procesamiento real.
15. ROOT puede administrar tenant y límites.

---

# 33. Criterios de aceptación del MVP

## Multi-tenant
- Tenant A no puede leer ni modificar datos privados de Tenant B.
- ROOT puede administrar ambos con auditoría.

## Marketplace
- Propiedades publicadas de distintos tenants aparecen en resultados.
- Cada ficha muestra inmobiliaria responsable.

## CRM
- Lead puede crearse, asignarse y moverse de etapa.

## Propiedades
- CRUD funcional por tenant.
- Publicación controlada.
- imágenes.
- tipo/operación.
- agente/propietario.

## Venta
- se puede crear oportunidad y oferta.

## Alquiler
- se puede administrar disponibilidad y solicitud/reserva.

## IA
- responde con inventario real.
- no inventa propiedades.

## 3D
- demo actual no se rompe.
- pipeline real se habilita mediante feature flag cuando esté listo.

## Seguridad
- KYC y documentos sensibles no deben quedar expuestos mediante URL pública sin control.

---

# 34. Métricas de producto

Iniciales:

- tenants creados;
- tenants activados;
- agentes activos;
- propiedades creadas;
- propiedades publicadas;
- leads;
- lead-to-contact;
- visitas;
- operaciones cerradas;
- reservas;
- uso IA;
- recorridos 3D;
- tiempo medio de publicación;
- retención tenant;
- uso por módulo.

---

# 35. Riesgos

## Riesgo: reescritura innecesaria
Mitigación: migración incremental.

## Riesgo: fuga cross-tenant
Mitigación: tenantId obligatorio, guards y pruebas específicas.

## Riesgo: 3D costoso
Mitigación: créditos, límites, cola y proveedor desacoplado.

## Riesgo: pagos locales
Mitigación: adapter por proveedor y decisión por país.

## Riesgo: documentos sensibles
Mitigación: storage privado/URLs firmadas.

## Riesgo: exceso de alcance
Mitigación: MVP por fases y feature flags.

## Riesgo: duplicación Property/Listing
Mitigación: separar activo inmobiliario de publicación comercial.

---

# 36. Decisiones tomadas

- Nombre provisional de producto: METRORA.
- Good Place es la base del producto.
- No se crea un repositorio nuevo.
- Arquitectura objetivo: SaaS multiempresa.
- Marketplace común.
- Las inmobiliarias son tenants.
- Sus usuarios/agentes operan dentro de su tenant.
- Las propiedades publicadas pueden aparecer en el marketplace común.
- ROOT pertenece a Trends172Tech.
- Se preserva el pipeline 3D existente.
- Se evoluciona hacia procesamiento Gaussian Splatting real.
- Se preserva la IA existente y se amplía.
- Se soportan venta y múltiples modalidades de alquiler.

---

# 37. Decisiones pendientes

No bloquean el inicio:

1. modelo de precios SaaS;
2. pasarela de pago;
3. límites por plan;
4. proveedor GPU definitivo;
5. viewer 3D definitivo;
6. dominio final;
7. disponibilidad legal definitiva del nombre METRORA;
8. autenticación final: conservar actual o migración gradual a Clerk;
9. WhatsApp provider;
10. mapas/geocoding;
11. si habrá propietarios con acceso directo desde MVP.

---

# 38. Próximo bloque técnico recomendado

Sin cambiar todavía el negocio existente:

1. crear inventario técnico de Good Place;
2. agregar tests de smoke sobre flujos actuales;
3. crear Tenant + Membership en migración no destructiva;
4. crear tenant interno para datos existentes;
5. agregar tenantId progresivamente;
6. crear tenant context server-side;
7. validar aislamiento;
8. iniciar rebranding visual y textual a METRORA;
9. mantener tour3D bajo feature flag;
10. construir nuevo dashboard ROOT de tenants.

---

# 39. Definition of Done de la transformación inicial

La primera transformación Good Place → METRORA se considerará completada cuando:

- el sistema se identifique como METRORA;
- no se haya perdido ningún flujo funcional existente;
- exista Tenant;
- los datos actuales estén asociados a un tenant seguro;
- puedan crearse al menos dos inmobiliarias;
- cada una tenga usuarios separados;
- ambas puedan publicar propiedades;
- el marketplace muestre publicaciones de ambas;
- no haya acceso cross-tenant;
- ROOT administre ambas;
- el CRM mínimo funcione;
- la IA busque inventario real;
- el pipeline 3D existente siga operativo;
- exista plan para activación de 3D real;
- preview y producción estén verificadas.

---

# 40. Registro de continuidad

Este PRD debe evolucionar con el producto.

Toda decisión material debe registrar:

- fecha;
- decisión;
- motivo;
- alcance;
- impacto;
- migración;
- riesgos;
- aprobación.

El propósito es evitar que METRORA pierda capacidades existentes de Good Place durante su evolución.
