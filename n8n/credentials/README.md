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
