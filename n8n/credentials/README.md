# Credenciales de n8n

Este directorio documenta las **credenciales fijas** del proyecto. Ningún secreto
(real password / API key) se commitea; todo vive en variables de entorno de n8n o
en `infra/.env` (gitignored).

## Credenciales Postgres (fuente de verdad: docs/Esquema_de_Base_de_Datos_v9.md)

Dos credenciales fijas, una por rol de base de datos. Nunca se crean otras para
operar la BD desde n8n.

| Credencial n8n            | Rol DB        | RLS        | Uso                                                      |
|---------------------------|---------------|------------|----------------------------------------------------------|
| `Postgres - app_router`   | `app_router`  | BYPASSRLS  | Excepciones documentadas: resolución de tenant, pagos, operaciones de staff, schedules `C*` |
| `Postgres - app_tenant`   | `app_tenant`  | Sujeto a RLS | Operaciones por tenant; requiere `SET app.tenant_id` antes de consultar |

### Cómo fijar el tenant con `app_tenant`

Antes de cualquier consulta INSERT/SELECT/UPDATE con `app_tenant`, ejecutar en el
nodo Postgres:

```sql
SET app.tenant_id = '<uuid-de-la-empresa>';
```

Sin `SET app.tenant_id`, el rol `app_tenant` no ve ninguna fila (RLS deniega). El
rol `app_router` (BYPASSRLS) opera sobre cualquier tenant sin fijarlo.

## Variables de entorno en n8n (fuente: docs/Herramientas_del_Proyecto.md §10)

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`,
`GEMINI_API_KEY`, `META_VERIFY_TOKEN`, `META_APP_SECRET`, `WOMPI_PRIVATE_KEY`,
`WOMPI_PUBLIC_KEY`, `WOMPI_EVENTS_SECRET`, `RESEND_API_KEY`, `N8N_ENCRYPTION_KEY`.

Ver `infra/.env.example` para la plantilla de las variables de conexión a la BD.

## Configuración en n8n (parámetros de conexión)

Proyecto Supabase: REF `plncsxkhqulvghqtqqzo`, región `us-west-2`.

| Parámetro | `Postgres - app_router` | `Postgres - app_tenant` |
|-----------|-------------------------|-------------------------|
| Host (pooler) | `aws-0-us-west-2.pooler.supabase.com` | `aws-0-us-west-2.pooler.supabase.com` |
| Host (directo) | `db.plncsxkhqulvghqtqqzo.supabase.co` | `db.plncsxkhqulvghqtqqzo.supabase.co` |
| Port | `5432` | `5432` |
| Database | `postgres` | `postgres` |
| User | `app_router.plncsxkhqulvghqtqqzo` | `app_tenant.plncsxkhqulvghqtqqzo` |
| Password | `SUPABASE_DB_PASSWORD_APP_ROUTER` (de `infra/.env`) | `SUPABASE_DB_PASSWORD_APP_TENANT` (de `infra/.env`) |
| SSL | `require` | `require` |

Usar el **pooler** (`aws-0-...pooler.supabase.com`) desde n8n para evitar límites de
conexiones directas. El USER debe incluir el sufijo `.REF` (Supabase lo exige para
roles no-superusuario vía pooler). Las contraseñas deben coincidir con las de
`sql/schema/esquema_v9.sql` y con `infra/.env`.

## Fijar `app.tenant_id` en un nodo Postgres (rollo `app_tenant`)

n8n no tiene un campo "before query". Para fijar el tenant en la misma operación,
anteponer el `SET` al query (node-postgres ejecuta múltiples statements en una
llamada):

```sql
SET app.tenant_id = '00000000-0000-0000-0000-000000000000';
SELECT * FROM empresas WHERE id = current_setting('app.tenant_id')::uuid;
```

**Complicación conocida para los flujos:** el `SET` NO persiste entre nodos ni entre
distintas conexiones del pool, así que debe repetirse en cada nodo `app_tenant` que
toque la BD. Documentar esto en cada workflow (ver F3, paso 4 de la arquitectura).

## Linter Supabase — WARN aceptados (no bloquean F2/F3)

Se mantienen como WARN documentados, no como ERROR:

- **0014 `extension_in_public`**: `vector`, `pgcrypto`, `btree_gist` en `public`.
  Supabase instala `vector` en `public` por defecto; moverlo exige cualificar
  `extensions.vector` y reconstruir el índice HNSW de `contenido_rag`. Riesgo alto,
  beneficio bajo → se acepta.
- **0024 `rls_policy_always_true`**: políticas `allow_platform_*` en
  `usuarios_internos`, `parametros_tokens`, `parametros_precios` usan
  `USING (true)` / `WITH CHECK (true)` para `ALL`. Son tablas globales de plataforma
  accedidas por `app_router` (BYPASSRLS) / `service_role`; `app_tenant` solo tiene
  `SELECT` sobre `parametros_*` y **nada** sobre `usuarios_internos`, así que la
  escritura queda bloqueada por el GRANT, no por RLS. Es intencional.

**Implicación para los workflows:** `app_tenant` podrá leer `parametros_tokens` y
`parametros_precios` completos (necesario para límites/precio). No podrá escribir en
ninguna de las tres (sin GRANT). `app_router` opera todo vía BYPASSRLS. Mantener esto
presente al diseñar los flujos B/C.
