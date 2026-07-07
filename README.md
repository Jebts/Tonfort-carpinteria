# SaaS Atención al Cliente + Agendamiento (n8n + Supabase)

SaaS multi-tenant de atención al cliente por WhatsApp y agendamiento en Google Calendar,
orquestado en n8n con Supabase como fuente de verdad y **Gemini 2.5 Flash** (Google AI
Studio free tier) como LLM conversacional.

## Documentación

- `docs/Constitucion_del_Proyecto.md` — principios no negociables (fuente de autoridad máxima).
- `docs/Esquema_de_Base_de_Datos_v9.md` — DDL + RLS + triggers (versión vigente del esquema).
- `docs/Estructura_Logica_de_Solicitudes.md` — flujos A/B/C/D (v5, vigente).
- `docs/Herramientas_del_Proyecto.md` — stack y variables de entorno (v5, vigente).
- `docs/Instrucciones_del_Proyecto.md` — reglas de construcción n8n (v4, vigente).

Jerarquía de autoridad: Constitución > Esquema vigente > Estructura vigente > Herramientas > conversación actual.

## Variables de entorno y secretos

Matriz de secretos (fuente: `docs/Herramientas_del_Proyecto.md` §10, v5). Todos los secretos
viven en un gestor de secretos / variables de entorno de n8n; nada se commitea.

| Variable / secreto | Dónde vive | Propósito |
|---|---|---|
| `META_VERIFY_TOKEN` | Variable de entorno en n8n | Verificación inicial del webhook de Meta (A1) |
| `META_APP_SECRET` | Variable de entorno en n8n | Validación HMAC `X-Hub-Signature-256` en A2 (fallback si la integración no tiene `webhook_secret`) |
| Credencial `Postgres - app_router` | Credencial de n8n | Excepciones documentadas a RLS |
| Credencial `Postgres - app_tenant` | Credencial de n8n | Operaciones con RLS |
| `SUPABASE_URL` | Variable de entorno en n8n | Endpoint Supabase (DB + Auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Credencial de n8n (máxima sensibilidad) | Admin API Supabase Auth |
| `SUPABASE_ANON_KEY` | Configuración del dashboard | Login contra Supabase Auth |
| Clave de cifrado de `credenciales_encriptadas` | Variable de entorno / gestor de secretos | Cifrar/descifrar tokens OAuth e integraciones |
| `webhook_secret` por integración | Tabla `integraciones` | Firma HMAC por línea de WhatsApp activa |
| `GEMINI_API_KEY` | Credencial de n8n | LLM conversacional (Gemini 2.5 Flash vía Google AI Studio) |
| API key del proveedor de embeddings | Credencial de n8n | Embeddings de 1536d para `contenido_rag` |
| `WOMPI_PRIVATE_KEY` | Credencial de n8n | Crear transacciones (B11) |
| `WOMPI_PUBLIC_KEY` | Configuración del dashboard | Widget/checkout frontend (si aplica) |
| `WOMPI_EVENTS_SECRET` | Variable de entorno en n8n | Validar firma del webhook de Wompi (B12) |
| Credencial de Resend (o SES) | Credencial de n8n | Notificaciones internas por email |
| `SUPABASE_DB_URL` | Variable de entorno / credencial de n8n | Conexión Postgres Supabase |
| Webhook de monitoreo (UptimeRobot) | Configuración externa | Alertar si n8n deja de responder |

## Estado de implementación

Ruta crítica sugerida: `F0 → F1 → F2 → F3 → F4 → F5`.

- **F0** (documentación y entorno base): en progreso — Gemini 2.5 Flash reflejado en docs; repo inicializado.
- **F1–F10**: pendientes.

## Convenciones

- Un workflow de n8n por solicitud documentada (A1, A2, B1, C5, …); sub-workflows (Agente IA, D) aparte.
- Nombre de workflow: `{sección}{número} - {nombre corto en minúsculas con guiones}`.
- Cada nodo se nombra con el número de paso del documento: `{número de paso}. {qué hace}`.
- Credenciales Postgres fijas: `Postgres - app_router` / `Postgres - app_tenant`.
- Error Workflow común: `_Error Handler - notificacion`.
