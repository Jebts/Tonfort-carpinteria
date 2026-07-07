# Estructura Lógica de Solicitudes al Servidor (n8n)

**Versión 5 — consistente con Esquema de Base de Datos v9.**

## Changelog de esta revisión (v4 → v5)

- **Stripe → Wompi:** B11 y B12 rediseñados para la API de transacciones de Wompi (COP, `amount_in_cents`, webhook `transaction.updated`).
- **NUEVO B13:** confirmación manual de transferencia/depósito por `usuarios_internos` (auditoría completa, principio 3.8).
- **A2, paso 2.5:** validación de firma `X-Hub-Signature-256` de Meta antes de procesar el payload.
- **Sub-workflow Agente IA:** se documenta el paso obligatorio de registrar `tokens_usados` en el mensaje `assistant` (alimenta C6).
- **Sección D (Chat Asistente):** regla explícita cuando la suscripción está vencida — el staff mantiene acceso a herramientas internas.
- **C5/C6:** aviso por email al admin cuando vence el ciclo de 30 días (mínimo MVP ante ausencia de cobro recurrente Wompi).
- Referencias cruzadas actualizadas a Esquema v9 y Herramientas v4.

### Ajuste de vigencia (F0 — sin cambio de número de versión)
- **Agente IA, paso 2:** LLM Claude Haiku 4.5 → **Gemini 2.5 Flash** (Google AI Studio). El contador de tokens pasa de `input_tokens + output_tokens` a `usageMetadata.promptTokenCount + candidatesTokenCount`. El campo `mensajes.tokens_usados` y el corte por consumo (C6) se mantienen; con LLM gratis el tope deja de ser costo monetario y pasa a ser límite de uso del plan.

## 0. Contexto del proyecto y de este documento

Este documento pertenece a un **SaaS multi-tenant** de atención al cliente por WhatsApp y agendamiento en Google Calendar, operado por un agente de Inteligencia Artificial (ver `Constitucion_del_Proyecto.md` para el panorama completo). Mientras el Esquema de Base de Datos vigente define **qué datos existen y cómo se relacionan**, este documento define **qué eventos puede recibir o generar el sistema, y qué hace paso a paso con cada uno**.

Todo el sistema se construye sobre **n8n**. Cuando este documento dice "Postgres" o "IF" como parte de un paso, se refiere a un nodo de ese tipo dentro de n8n.

El sistema recibe solicitudes de cuatro orígenes distintos:
- **Sección A** — lo que llega desde WhatsApp/Meta.
- **Sección B** — lo que llega desde el panel de administración (login, pagos Wompi, activación manual).
- **Sección C** — procesos programados.
- **Sección D** — el sub-workflow de autoservicio invocado desde A.

## Convenciones usadas en todo el documento

- **Rol DB `app_router`**: sin RLS (BYPASSRLS). Se usa **solo** en las situaciones documentadas explícitamente aquí.
- **Rol DB `app_tenant`**: sujeto a RLS. Requiere `SET app.tenant_id` antes de cualquier consulta.
- **Nodo "Set Tenant"**: nodo Postgres que corre `SET app.tenant_id = '{{ $json.empresa_id }}';` en la misma sesión que las consultas siguientes.
- **Nodo "Error Trigger"**: cada workflow crítico tiene un workflow de error asociado (ver `Instrucciones_del_Proyecto.md`, sección 5.5).
- **Respond to Webhook**: Meta y Wompi esperan un `200 OK` rápido o reintentan la entrega.
- **Idempotencia de webhooks externos**: Meta y Wompi reintentan. Cada flujo que recibe un webhook de estos debe reconocer "esto ya lo procesé".
- **Supabase Auth**: toda operación de autenticación (crear usuario, login, refresh, MFA) se hace vía la API de Supabase Auth (Admin API con `SUPABASE_SERVICE_ROLE_KEY` para crear/gestionar usuarios; API pública con `SUPABASE_ANON_KEY` para el login que hace el propio dashboard directamente, sin pasar por n8n — ver B0).
- **Moneda COP:** los montos en BD están en pesos con 2 decimales; Wompi recibe `amount_in_cents = ROUND(monto * 100)` como entero.

---

## B0. Autenticación (login) de `usuarios_empresa` y `usuarios_internos`

- **Disparador:** el dashboard (frontend) llama **directamente** a Supabase Auth con `SUPABASE_ANON_KEY` para el login (email + password, y el segundo factor si aplica MFA).
- **Rol DB:** ninguno directamente en este paso; Supabase Auth devuelve un JWT.
- **Pasos lógicos:**
  1. El dashboard envía credenciales a Supabase Auth.
  2. Supabase Auth valida contraseña y, si aplica, el segundo factor MFA.
  3. Devuelve un JWT de sesión (1 hora) + refresh token (7 días) para `usuarios_empresa`, o sesión corta (4 horas, sin refresh automático) para `usuarios_internos`.
  4. **Todas las llamadas subsiguientes del dashboard hacia n8n** (Sección B) incluyen ese JWT en el header de autorización.
  5. **Cada workflow de la Sección B** valida el JWT, extrae `auth_user_id`, y resuelve tenant o rol interno según corresponda.

---

## A. Solicitudes entrantes desde WhatsApp (Meta)

### A1. Verificación del webhook (alta de un número nuevo)

Sin cambios respecto a versiones anteriores — valida `hub.verify_token` contra `META_VERIFY_TOKEN`.

### A2. Mensaje entrante de un cliente (el flujo principal)

- **Disparador n8n:** Webhook node, método `POST`, un solo endpoint para todas las líneas conectadas.
- **Rol DB:** `app_router` → luego `app_tenant`.
- **Pasos lógicos:**
  1. **Webhook** recibe el payload de Meta (conservar el body raw para la firma).
  2. **Code / Set**: extraer `phone_number_id`, `wa_id` del remitente, `mensaje_externo_id`, `contenido`, `timestamp`, y el header `X-Hub-Signature-256`.
  2.5. **Postgres (`app_router`)** — obtener el `webhook_secret` de la integración asociada al `phone_number_id`:
     ```sql
     SELECT empresa_id, usuario_id AS usuario_linea_id, webhook_secret
     FROM integraciones
     WHERE identificador_externo = $1 AND tipo = 'whatsapp' AND deleted_at IS NULL;
     ```
     **Code:** calcular HMAC-SHA256 del body raw con `webhook_secret` (o con `META_APP_SECRET` de plataforma si la integración aún no tiene `webhook_secret` individual) y comparar con `X-Hub-Signature-256` (`sha256=<hex>`). Si no coincide → responder `403 Forbidden` y **detener** — no procesar el payload.
  3. **Respond to Webhook** (200 OK inmediato).
  4. **IF**: ¿la consulta del paso 2.5 devolvió fila con `estado = 'activo'`? (re-ejecutar o filtrar en la consulta):
     ```sql
     SELECT empresa_id, usuario_id AS usuario_linea_id
     FROM integraciones
     WHERE identificador_externo = $1 AND tipo = 'whatsapp' AND estado = 'activo' AND deleted_at IS NULL;
     ```
     **Nota:** las líneas de operadores desactivados quedan excluidas por el trigger `trg_desconectar_integracion_usuario_inactivo` (Esquema v9).
  5. **IF**: ¿la consulta devolvió una fila?
     - **No** → **Error Trigger / notificación**: mensaje llegó a un número no registrado o desactivado. Se descarta con log.
     - **Sí** → continúa. Guardar `usuario_linea_id`.
  6. **Postgres (`app_tenant`)** — fijar tenant y verificar si el remitente es un `usuario_empresa`:
     ```sql
     SET app.tenant_id = '{{ $json.empresa_id }}';
     SELECT id, nombre, rol FROM usuarios_empresa WHERE telefono = $1 AND deleted_at IS NULL;
     ```
  7. **IF**: ¿es un `usuario_empresa`?
     - **Sí** → redirige al **sub-workflow "Chat Asistente"** (ver Sección D). Termina aquí.
     - **No** → continúa a paso 8.
  8. **Postgres** — verificar si es cliente ya registrado.
  9. **IF**: ¿`is_blocked = TRUE`? → descartar silenciosamente.
  10. **IF**: ¿existe el cliente? → si no, crearlo.
  11. **Resolver el contexto activo de la conversación** (estructura híbrida, sin cambios respecto a v3).
  12. **Postgres** — verificar estado de suscripción:
     ```sql
     SELECT estado, periodo_fin FROM suscripciones
     WHERE empresa_id = current_setting('app.tenant_id')::uuid AND estado = 'activa' AND deleted_at IS NULL;
     ```
     **IF**: ¿no hay suscripción activa o `periodo_fin <= NOW()` o tokens agotados (consultar `v_consumo_tokens_empresa`)? → responder al cliente final con mensaje de servicio pausado y **detener** — no invocar Agente IA. El corte definitivo de estado lo ejecuta C6; aquí es solo lectura defensiva.
  13. **Postgres** — resolver/continuar sesión.
  14. **Code**: ventana de 24h para `sesion_id`.
  15. **Postgres** — guardar el mensaje entrante (`rol = 'user'`, `tokens_usados = 0`) de forma idempotente (`ON CONFLICT DO NOTHING`).
  16. **IF**: ¿el INSERT no devolvió fila? → reintento de Meta. Detener el flujo.
  17. Continúa hacia el **sub-workflow "Agente IA"** (ver sección siguiente).

### A3. Webhook de estado de mensaje

Sin cambios respecto a versiones anteriores.

---

## Sub-workflow: Agente IA (invocado desde A2 paso 17)

Este sub-workflow no tiene letra propia en la Sección B/C/D porque es parte del procesamiento de mensajes entrantes. Se implementa como workflow n8n separado invocado con **Execute Workflow**.

- **Rol DB:** `app_tenant` (tenant ya fijado por A2).
- **Pasos lógicos (mínimo documentado para integridad comercial):**
  1. Armar contexto híbrido (instrucciones, identidad, horario directos + RAG si aplica).
   2. **HTTP Request / nodo "Google Gemini"** al LLM (Gemini 2.5 Flash vía Google AI Studio) — obtener respuesta y metadatos de uso (`usageMetadata.promptTokenCount + candidatesTokenCount`).
  3. Ejecutar acciones decididas por el agente (responder, agendar, escalar) según diseño futuro del prompt.
  4. **Postgres** — insertar mensaje `assistant` con el contenido de respuesta.
  5. **Postgres (obligatorio para C6)** — actualizar `tokens_usados` del mensaje `assistant` recién insertado:
     ```sql
     UPDATE mensajes SET tokens_usados = $1
     WHERE id = $2 AND rol = 'assistant';
     ```
     El valor `$1` proviene del contador real devuelto por el LLM en el paso 2. Sin este paso, `v_consumo_tokens_empresa` y el corte por consumo (C6) nunca se disparan.
  6. Enviar respuesta al cliente vía API de WhatsApp.

*(Lógica de redirección/cambio de contexto, RAG y agendamiento: pendiente de detalle en diseño del agente — ver Instrucciones §9.)*

---

## B. Solicitudes de administración (dashboard interno / API)

Todo endpoint de esta sección, salvo B1 (onboarding), B12 (webhook Wompi) y B13 (solo `usuarios_internos`), requiere JWT válido de `usuarios_empresa` resuelto en **B0**.

### B1. Alta de una nueva empresa (onboarding)

- **Disparador n8n:** Webhook `POST /empresas`.
- **Rol DB:** `app_router` → `app_tenant`.
- **Formato de entrada esperado:**
  ```json
  {
    "empresa": { "nombre": "...", "instrucciones_md": "...", "identidad": {}, "horario_atencion": {}, "zona_horaria": "America/Bogota", "duracion_cita_default": 30 },
    "admin_inicial": { "nombre": "...", "email": "...", "telefono": "...", "password": "..." },
    "suscripcion": { "operadores_contratados": 0 }
  }
  ```
- **Pasos lógicos** (compensación Auth si falla Postgres):
  1. **Webhook** recibe el payload.
  2. **Postgres (`app_router`)**: `INSERT INTO empresas (...) RETURNING id`.
  3. **HTTP Request — Supabase Auth Admin API**: crear usuario admin con MFA requerido. Devuelve `auth_user_id`.
  4. **Postgres (`app_tenant`)**: `INSERT INTO usuarios_empresa (...)` + `INSERT INTO suscripciones (...)` con periodo de 30 días.
  5. **IF** fallo → revertir usuario en Auth.
  6. **Respond to Webhook**: `empresa_id` + `usuario_admin_id`.

### B2 – B10

Sin cambios sustanciales respecto a v4, salvo referencias a Esquema v9. B7 confirma que bloquear cliente no cancela citas. B8 confía en trigger de desconexión WhatsApp. B10 mantiene plazo de 7 días resuelto por C7.

### B11. Iniciar checkout de Wompi

- **Disparador n8n:** Webhook `POST /pagos/checkout` (dashboard admin autenticado).
- **Rol DB:** `app_tenant`.
- **Pasos lógicos:**
  1. **Postgres**: leer suscripción activa y calcular monto:
     ```sql
     SELECT s.operadores_contratados FROM suscripciones s
     WHERE s.empresa_id = current_setting('app.tenant_id')::uuid AND s.estado = 'activa';
     ```
     ```sql
     SELECT precio_operador_mensual, moneda FROM v_precio_operador_vigente;
     ```
     `monto = precio_operador_mensual * operadores_contratados` (COP).
  2. **Postgres**: `INSERT INTO pagos (empresa_id, suscripcion_id, tipo, monto, moneda, estado, wompi_reference) VALUES (..., 'wompi', $monto, 'COP', 'pendiente', $pago_id::text) RETURNING id;` — `wompi_reference` es el UUID del pago, usado como `reference` en Wompi para idempotencia.
  3. **Code**: `amount_in_cents = ROUND(monto * 100)::INT`.
  4. **HTTP Request** a Wompi `POST /v1/transactions`:
     - Header: `Authorization: Bearer {{ WOMPI_PRIVATE_KEY }}`
     - Body: `{ "amount_in_cents": ..., "currency": "COP", "reference": "<pago_id>", "customer_data": { "email": "<admin email>" }, "redirect_url": "<dashboard_url>/pagos/resultado" }`
  5. **Postgres**: `UPDATE pagos SET wompi_transaction_id = $1 WHERE id = $2;`
  6. **Respond to Webhook**: URL de pago (`data.payment_link_url` o equivalente de la respuesta Wompi).

### B12. Webhook de confirmación de pago de Wompi

- **Disparador n8n:** Webhook `POST /webhooks/wompi`, sin JWT (externo).
- **Rol DB:** `app_router` → `app_tenant`.
- **Pasos lógicos:**
  1. **Webhook** recibe el evento Wompi (conservar body raw).
  2. **Code**: validar checksum/firma del evento con `WOMPI_EVENTS_SECRET` según documentación Wompi. Si inválido → `403` y detener.
  3. **Respond to Webhook** (200 OK inmediato).
  4. **IF**: ¿evento `transaction.updated` con `status = APPROVED`? → continúa; si no, detener (log para otros estados).
  5. **Postgres (`app_router`)**: resolver pago por `wompi_transaction_id` o `reference`:
     ```sql
     SELECT id, empresa_id, estado FROM pagos
     WHERE (wompi_transaction_id = $1 OR wompi_reference = $2) AND deleted_at IS NULL;
     ```
  6. **IF**: ¿`estado` ya es `'confirmado'`? → detener (idempotencia — reintento de Wompi).
  7. **Postgres (`app_tenant`)** — fijar tenant, confirmar pago y renovar suscripción (BD primero, principio 3.3):
     ```sql
     SET app.tenant_id = '{{ $json.empresa_id }}';
     UPDATE pagos SET estado = 'confirmado', confirmado_at = NOW() WHERE id = $1 AND estado = 'pendiente';
     ```
     Luego renovar o activar `suscripciones` (nuevo periodo de 30 días, reset `aviso_90pct_enviado = FALSE`).
  8. **Send Email (SMTP)** al admin confirmando activación/renovación.

### B13. Confirmación manual de transferencia (staff)

- **Disparador n8n:** Webhook `POST /pagos/manual` — **solo** `usuarios_internos` autenticados (JWT + MFA verificado en B0).
- **Rol DB:** `app_router` (opera sobre cualquier tenant; no hay RLS para staff).
- **Formato de entrada:**
  ```json
  {
    "empresa_id": "uuid",
    "monto": 150000.00,
    "referencia_comprobante": "Transferencia Bancolombia ref 123456",
    "operadores_contratados": 2
  }
  ```
- **Pasos lógicos:**
  1. Validar JWT → resolver `usuarios_internos.id` desde `auth_user_id`. Rechazar si no es staff interno.
  2. **Postgres (`app_router`)** — en una transacción lógica:
     - `INSERT INTO pagos (empresa_id, tipo, monto, moneda, estado, referencia_comprobante, activado_por_usuario_interno_id, confirmado_at) VALUES ($empresa_id, 'manual', $monto, 'COP', 'confirmado', $ref, $staff_id, NOW()) RETURNING id;`
     - Activar o renovar `suscripciones` para `$empresa_id` con `$operadores_contratados` y nuevo periodo de 30 días.
  3. **Send Email (SMTP)** al admin de la empresa confirmando activación.
  4. **Respond to Webhook**: `{ "pago_id": "...", "suscripcion_estado": "activa" }`.

---

## C. Procesos programados

### C1 – C4

Sin cambios respecto a versiones anteriores.

### C5. Aplicar el cambio de operadores pendiente al finalizar el ciclo

- Al aplicar reducción de operadores: fijar `seleccion_operadores_vence_at = NOW() + INTERVAL '7 days'` y notificar al admin.
- **Nuevo (v5):** al detectar suscripciones cuyo `periodo_fin <= NOW()` y aún `estado = 'activa'`, enviar email al admin avisando que el ciclo vence hoy y debe renovar vía B11 o contactar soporte (mínimo MVP ante ausencia de recordatorio proactivo diferido — ver Constitución v4).

### C6. Monitoreo de consumo de tokens

- **Pasos lógicos (sin cambios de fondo, dependencia crítica documentada):**
  1. Consultar `v_consumo_tokens_empresa` para todas las suscripciones activas.
  2. **IF** `tokens_usados_periodo >= limite_tokens_periodo * 0.9` y `aviso_90pct_enviado = FALSE` → email al admin + `UPDATE suscripciones SET aviso_90pct_enviado = TRUE`.
  3. **IF** `tokens_usados_periodo >= limite_tokens_periodo` **OR** `periodo_fin <= NOW()` → `UPDATE suscripciones SET estado = 'vencida'` + email al admin.
- **Dependencia:** el sub-workflow Agente IA **debe** escribir `tokens_usados` en mensajes `assistant` (ver sección Agente IA paso 5). Sin eso, este proceso nunca corta por consumo.

### C7. Vencimiento del plazo de selección de operadores

Sin cambios respecto a v4.

---

## D. Sub-workflow: Chat Asistente

Invocado desde A2 paso 7 cuando el remitente de WhatsApp es un `usuario_empresa` (admin u operador).

- **Rol DB:** `app_tenant`.
- **Regla de suscripción vencida (N2 — resuelto en v5):**
  - Si la suscripción está **vencida** o **agotada en tokens**, el Chat Asistente **sigue operativo** para el staff — pueden consultar citas, horarios y herramientas internas de autoservicio.
  - Lo que se pausa con suscripción vencida es **solo** la IA hacia **clientes finales** (A2 paso 12), no el acceso del negocio a sus propias herramientas.
- **Pasos lógicos:** sin cambios de fondo respecto a v3 (comandos de autoservicio del admin/operador vía WhatsApp).

---

## Tabla resumen (actualizada v5)

| Solicitud | Método/Trigger | Rol DB | Tenant conocido antes de empezar |
|---|---|---|---|
| B0. Login (Supabase Auth) | — (directo desde frontend) | Ninguno | N/A |
| A1. Verificación webhook | GET | Ninguno | N/A |
| A2. Mensaje entrante | POST | `app_router` → `app_tenant` | No |
| A3. Estado de mensaje | POST | `app_router` → `app_tenant` | No |
| Agente IA (sub-workflow) | Invocado desde A2 | `app_tenant` | Sí |
| B1. Alta de empresa | POST | `app_router` → `app_tenant` | No |
| B2. Conectar integración | GET x2 | `app_tenant` | Sí |
| B3. CRUD servicios (+ RAG) | POST/PATCH/DELETE | `app_tenant` | Sí |
| B4. CRUD usuarios_empresa | POST/PATCH/DELETE | `app_tenant` | Sí |
| B5. Editar empresa | PATCH | `app_tenant` | Sí |
| B6. Cancelar/reprogramar cita | PATCH | `app_tenant` | Sí |
| B7. Bloquear cliente | PATCH | `app_tenant` | Sí |
| B8. Activar/desactivar usuario | PATCH | `app_tenant` | Sí |
| B9. Ajustar operadores contratados | PATCH | `app_tenant` | Sí |
| B10. Seleccionar operadores activos | POST | `app_tenant` | Sí |
| B11. Iniciar checkout Wompi | POST | `app_tenant` | Sí |
| B12. Webhook confirmación Wompi | POST | `app_router` → `app_tenant` | No |
| B13. Confirmación manual (staff) | POST | `app_router` | Sí (en payload) |
| D. Chat Asistente | Invocado desde A2 | `app_tenant` | Sí |
| C1. Recordatorio de cita | Schedule | `app_router` | No |
| C2. Refresco OAuth | Schedule | `app_router` | No |
| C3. Limpieza OAuth pendiente | Schedule | `app_router` | No |
| C4. Partición mensual | Schedule | Ninguno (DDL) | N/A |
| C5. Aplicar cambio de operadores a fin de ciclo | Schedule | `app_router` | No |
| C6. Monitoreo de consumo de tokens | Schedule | `app_router` | No |
| C7. Vencimiento de plazo de selección de operadores | Schedule | `app_router` | No |

---

## Decisiones de negocio aún pendientes

1. **Confirmación final del proveedor SMTP** (Resend propuesto) — bajo riesgo.
2. **Confirmación final del proveedor de VPS** — no bloquea diseño.
3. **Número real de `precio_operador_mensual`** en `parametros_precios` — placeholder `0.00 COP`; fijar antes de activar B11 en producción.
4. **Flujo "olvidé mi contraseña"** — Supabase Auth lo soporta; falta diseño del correo y URL de redirección.
5. **Meta Business Verification** — confirmar contra documentación vigente de Meta al ejecutar el alta real.
6. **Diseño detallado del Agente IA** — prompt, ramas de decisión, agendamiento y escalamiento (Instrucciones §9).

Con esto, el Esquema v9 y esta Estructura v5 quedan consistentes entre sí.
