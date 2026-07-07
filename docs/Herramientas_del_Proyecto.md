# Herramientas del Proyecto (v5)

## Changelog

### v4 → v5 (F0 — Gemini 2.5 Flash)
1. **LLM: Claude Haiku 4.5 → Gemini 2.5 Flash** (Google AI Studio free tier) como LLM conversacional. Variable de entorno `GEMINI_API_KEY`; nodo n8n nativo "Google Gemini".
2. **Embeddings de RAG:** se mantiene el proveedor actual de 1536 dimensiones (`contenido_rag.embedding vector(1536)` en Esquema v9). Gemini Embeddings (768d/3072d) no se usan para RAG a fin de no alterar el esquema.
3. Mapa general (§1) y tabla de variables de entorno (§10) actualizados a Gemini 2.5 Flash.

### v3 → v4
1. **Stripe → Wompi:** sección 8 reescrita para la pasarela colombiana Wompi (checkout puntual, webhook, variables de entorno).
2. **Moneda COP** confirmada como moneda única del MVP en integración de pagos.
3. **Rotación de claves de cifrado** documentada (procedimiento operativo para `credenciales_encriptadas`).
4. **Rate limiting en login** documentado (capacidades de Supabase Auth + recomendación Caddy).
5. Mapa general, variables de entorno y referencias cruzadas actualizados a Esquema v9 / Estructura v5.

## 1. Mapa general

```
Cliente (WhatsApp) ──► Meta WhatsApp Business API ──► Caddy (reverse proxy / TLS) ──► n8n (self-hosted, VPS)
                                                                                          │
                                        ┌───────────┬───────────┬─────────┬──────────┼─────────┬─────────────┐
                                        ▼           ▼           ▼         ▼          ▼         ▼             ▼
                                  Supabase    Google Calendar  LLM      Embeddings  Wompi     SMTP        Supabase Auth
                                 (Postgres+pgvector) API  (Gemini 2.5 Flash)  (RAG)  (checkout)  (Resend)   (login/MFA/JWT)
```

## 2. n8n (self-hosted)

Es el orquestador central: recibe webhooks de WhatsApp y de Wompi, resuelve el tenant, consulta la base de datos, llama al LLM, coordina con Google Calendar, y gestiona el ciclo de checkout/webhook de Wompi.

**Decisiones ya tomadas:**
- Self-hosted en un VPS, detrás de **Caddy** como reverse proxy (TLS automático).
- Dos credenciales distintas de PostgreSQL (`Postgres - app_router` y `Postgres - app_tenant`).

**Pendiente de definir:**
- Estrategia de despliegue/backup de los workflows — **propuesta resuelta en sección 12**: versionado en Git.
- Monitoreo si el propio n8n cae — **propuesta resuelta en sección 12**: ping externo.

### 2bis. Proveedor de VPS — candidatos evaluados (sin confirmación final)

Candidatos razonables: **Hetzner**, **DigitalOcean**, **Vultr**. Confirmar según región de los negocios-cliente objetivo (latencia hacia Meta/Wompi/Supabase) y presupuesto.

## 3. Caddy

Reverse proxy con TLS automático. Termina HTTPS y reenvía a n8n.

**Recomendación de rate limiting (S6):** configurar reglas básicas en Caddy o un firewall perimetral para limitar intentos de login al dashboard y endpoints de webhook expuestos, complementando la protección nativa de Supabase Auth contra fuerza bruta.

## 4. Supabase (PostgreSQL + pgvector)

Fuente de verdad de los datos. Ver `Esquema_de_Base_de_Datos_v9.md` para el detalle técnico completo.

**Backups:** retención mínima de **7 días de point-in-time recovery** (sección 12).

## 4bis. Supabase Auth

**Qué hace en este proyecto:** proveedor de identidad para `usuarios_empresa` y `usuarios_internos`.

**Decisiones ya tomadas:**
- Cada usuario de negocio e interno tiene fila en `auth.users`, vinculada por `auth_user_id`.
- **JWT:** 1 hora + refresh 7 días para `usuarios_empresa`.
- **Sesión `usuarios_internos`:** 4 horas, sin refresh automático.
- **MFA:** obligatorio para `admin` y `usuarios_internos`; opcional para `operador`.
- Creación de usuarios (B1, B4) vía Admin API antes del INSERT en Postgres.

**Rate limiting (S6):** Supabase Auth incluye protección básica contra fuerza bruta en endpoints de login. No sustituye rate limiting perimetral en Caddy para el dashboard. Documentar ambas capas en operación.

## 5. Meta WhatsApp Business API

**Decisiones ya tomadas:**
- Alta de números **manual** por staff de plataforma en el MVP.
- Business Verification **una vez a nivel plataforma** (BSP) — confirmar contra docs vigentes de Meta al ejecutar.
- Validación de firma `X-Hub-Signature-256` en A2 (Estructura v5) con `webhook_secret` por integración o `META_APP_SECRET` global.

## 6. Google Calendar API

Integración OAuth por tenant para agendamiento.

**Diferido:** reconciliación automática de citas desincronizadas tras fallos de red (Constitución v4, principio 3.3).

## 7. LLM y Embeddings del Agente de IA

Gemini 2.5 Flash (Google AI Studio free tier) como LLM conversacional, embeddings de 1536 dimensiones (proveedor actual de RAG, sin cambio de esquema v9), estrategia híbrida de contexto.

**Dependencia crítica:** el workflow Agente IA debe registrar `tokens_usados` por respuesta para alimentar C6 (Estructura v5).

## 8. Wompi (NUEVO — reemplaza Stripe)

**Qué hace en este proyecto:** pasarela de pagos colombiana para checkout puntual de renovación/activación de suscripción (B11/B12). No hay suscripciones recurrentes nativas en el MVP.

**Decisiones ya tomadas:**
- Moneda **COP** única. Montos en BD en pesos (2 decimales); API recibe `amount_in_cents = ROUND(monto * 100)`.
- Flujo: crear transacción vía API → cliente paga en URL de Wompi → webhook `transaction.updated` con status `APPROVED` confirma pago.
- Idempotencia: `reference` = UUID del registro en `pagos`; índice único en `wompi_transaction_id`.
- Wompi es credencial **global de plataforma** (variables de entorno), no integración por tenant en tabla `integraciones`.
- Activación alternativa: flujo **B13** (confirmación manual por staff) para transferencias/depósitos.

**Endpoints clave:**
- `POST https://production.wompi.co/v1/transactions` — crear transacción (sandbox: `https://sandbox.wompi.co/v1/transactions`).
- Webhook de eventos configurado en panel Wompi apuntando a `B12 - webhook-confirmacion-wompi`.

## 9. SMTP (notificaciones internas)

**Decisión propuesta (pendiente confirmación final):** **Resend**, alternativa Amazon SES.

Todas las notificaciones internas por email vía SMTP, credencial única en n8n.

## 10. Variables de entorno y secretos — checklist (actualizado v4)

| Variable / secreto | Dónde vive | Propósito |
|---|---|---|
| `META_VERIFY_TOKEN` | Variable de entorno en n8n | Verificación inicial del webhook de Meta (A1) |
| `META_APP_SECRET` | Variable de entorno en n8n | Validación HMAC `X-Hub-Signature-256` en A2 (fallback si integración no tiene `webhook_secret`) |
| Credencial `Postgres - app_router` | Credencial de n8n | Excepciones documentadas a RLS |
| Credencial `Postgres - app_tenant` | Credencial de n8n | Operaciones con RLS |
| `SUPABASE_URL` | Variable de entorno en n8n | Endpoint Supabase (DB + Auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Credencial de n8n (máxima sensibilidad) | Admin API Supabase Auth |
| `SUPABASE_ANON_KEY` | Configuración del dashboard | Login contra Supabase Auth |
| Clave de cifrado de `credenciales_encriptadas` | Variable de entorno / gestor de secretos | Cifrar/descifrar tokens OAuth e integraciones |
| `webhook_secret` por integración | Tabla `integraciones` | Firma HMAC por línea de WhatsApp activa |
| `GEMINI_API_KEY` | Credencial de n8n | LLM conversacional (Gemini 2.5 Flash vía Google AI Studio) |
| API key del proveedor de embeddings | Credencial de n8n | Embeddings para `contenido_rag` |
| `WOMPI_PRIVATE_KEY` | Credencial de n8n | Crear transacciones (B11) |
| `WOMPI_PUBLIC_KEY` | Configuración del dashboard | Widget/checkout frontend (si aplica) |
| `WOMPI_EVENTS_SECRET` | Variable de entorno en n8n | Validar firma del webhook de Wompi (B12) |
| Credencial de Resend (o SES) | Credencial de n8n | Notificaciones internas por email |
| `SUPABASE_DB_URL` | Variable de entorno / credencial de n8n | Conexión Postgres Supabase |
| Webhook de monitoreo (UptimeRobot) | Configuración externa | Alertar si n8n deja de responder |

### Rotación de clave de cifrado (S5)

Si la clave de `credenciales_encriptadas` se compromete o por política periódica:

1. Generar nueva clave en gestor de secretos.
2. Script de migración (n8n o SQL+función): descifrar cada fila de `integraciones.credenciales_encriptadas` con clave vieja, re-cifrar con clave nueva.
3. Desplegar workflows con clave nueva; revocar clave vieja.
4. Registrar fecha de rotación en runbook operativo.

Sin rotación documentada, una filtración de la clave expone todos los tokens OAuth almacenados.

## 11. Convenciones de nombres

Sin cambios respecto a v2/v3.

## 12. Operación, monitoreo y continuidad

**Backups de Supabase:** mínimo **7 días de point-in-time recovery**.

**Versionado de workflows de n8n:** exportar JSON a repositorio Git.

**Monitoreo externo:** UptimeRobot u equivalente contra endpoint de salud de n8n.
