# Guía de conexión n8n ↔ Supabase (F3)

Paso a paso para dejar n8n operando contra la BD con RLS. Los pasos marcados
**(tú)** se hacen en la UI de Supabase / n8n; los demás son referencia.

Prerrequisitos:
- Repo con `sql/schema/esquema_v9.sql` (idempotente) y `n8n/credentials/README.md`.
- Acceso al SQL Editor de Supabase (rol `postgres`/service_role) y a la UI de n8n.
- n8n corriendo (VPS con Docker vía `infra/docker-compose.yml`, n8n Cloud, o local).

---

## 1. Preparar la BD (F2 reinit — aún pendiente de aplicar)

**(tú) En el SQL Editor de Supabase:**

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Luego pega y ejecuta **todo** `sql/schema/esquema_v9.sql`.

### 1.1. Definir contraseñas reales de los roles

El script fija la password en las dos últimas líneas de la FASE 1:

```sql
ALTER ROLE app_router WITH PASSWORD 'tu_password_seguro_router' BYPASSRLS;
ALTER ROLE app_tenant WITH PASSWORD 'tu_password_seguro_tenant';
```

**(tú) Elige passwords fuertes** (p.ej. en tu terminal local):

```bash
openssl rand -base64 32
```

Y haz UNA de estas dos cosas:
- **Opción A (recomendada):** edita `sql/schema/esquema_v9.sql` y reemplaza
  `'tu_password_seguro_router'` / `'tu_password_seguro_tenant'` por los generados,
  luego re-ejecuta el script. O bien:
- **Opción B:** tras ejecutar el script, corre en el SQL Editor:
  ```sql
  ALTER ROLE app_router WITH PASSWORD '<gen1>' BYPASSRLS;
  ALTER ROLE app_tenant WITH PASSWORD '<gen2>';
  ```

**(tú) Anota ambas passwords en `infra/.env`** (gitignored) para que n8n y el
script de verificación las usen:

```
SUPABASE_DB_PASSWORD_APP_ROUTER=<gen1>
SUPABASE_DB_PASSWORD_APP_TENANT=<gen2>
```

> Las passwords de `infra/.env` DEBEN coincidir con las del rol en Supabase, o la
> conexión de n8n fallará.

### 1.2. (Opcional pero recomendado) valores de negocio

```sql
UPDATE parametros_precios SET precio_operador_mensual = <precio_real> WHERE id = (SELECT id FROM parametros_precios ORDER BY vigente_desde DESC LIMIT 1);
-- parametros_tokens (100000/50000) y el resto quedan según el script.
```

---

## 2. Datos de conexión a copiar (Supabase → n8n)

Proyecto REF `plncsxkhqulvghqtqqzo`, región `us-west-2`.

| Campo | Valor |
|-------|-------|
| Host (pooler) | `aws-0-us-west-2.pooler.supabase.com` |
| Puerto | `5432` |
| Database | `postgres` |
| Usuario `app_router` | `app_router.plncsxkhqulvghqtqqzo` |
| Usuario `app_tenant` | `app_tenant.plncsxkhqulvghqtqqzo` |
| Passwords | las de `infra/.env` (paso 1.1) |
| SSL | `require` |

Usar el **pooler** (no el host directo) para evitar límites de conexiones.

---

## 3. Crear las credenciales en n8n  **(tú)**

1. n8n → **Credentials** → **New** → tipo **PostgreSQL**.
2. Crear **`Postgres - app_router`**:
   - Host: `aws-0-us-west-2.pooler.supabase.com`
   - Database: `postgres`, Port: `5432`
   - User: `app_router.plncsxkhqulvghqtqqzo`, Password: `<gen1>`
   - SSL: `require` (o marcar "SSL/TLS" con `sslmode=require`)
3. Crear **`Postgres - app_tenant`** igual, con usuario `app_tenant...` y `<gen2>`.
4. (Para B1/B11 más adelante) crear también:
   - **`Supabase Auth - Admin API`** con `SUPABASE_SERVICE_ROLE_KEY`.
   - **`Wompi - Private API`** con `WOMPI_PRIVATE_KEY`.

---

## 4. Variables de entorno en n8n  **(tú)**

Si n8n corre en el VPS con `docker-compose.yml`, ya se inyectan desde `infra/.env`.
Si es n8n Cloud/local, pégalas en **Settings → Environment** (o en el `.env` del
compose). Fuente: `infra/.env.example` y `README.md` §Variables.

```
N8N_ENCRYPTION_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
SUPABASE_ANON_KEY, SUPABASE_DB_URL, META_VERIFY_TOKEN, META_APP_SECRET,
WOMPI_PRIVATE_KEY, WOMPI_PUBLIC_KEY, WOMPI_EVENTS_SECRET, RESEND_API_KEY
```

---

## 5. Configurar el Error Workflow  **(tú)**

1. Importa los 6 JSON de `n8n/workflows/` y `n8n/sub-workflows/` en n8n.
2. **Settings → Error Workflow** → selecciona **`_Error Handler - notificacion`**.
   (Cada workflow ya trae `settings.errorWorkflow` apuntando a él; esto es el respaldo global.)

---

## 6. Validar la conexión y el RLS (smoke test)

**Opción A — desde n8n (F3):**
- Nodo Postgres con credencial `app_tenant`:
  ```sql
  SET app.tenant_id = '<uuid-empresa>';
  INSERT INTO empresas (nombre) VALUES ('smoke-test') RETURNING id;
  ```
- Nodo Postgres con `app_tenant` SIN `SET` → debe devolver 0 filas en `empresas`.
- Nodo Postgres con `app_router` → debe ver la fila insertada.

**Opción B — `verify_db.sh` (requiere `psql` + red al pooler):**
```bash
bash infra/scripts/verify_db.sh
```
Esperado: `OK: db=postgres`, `tablas>14`, `policies>0`, roles presentes, vistas≥2.

---

## 7. Checklist final

- [ ] BD reinicializada con `sql/schema/esquema_v9.sql`.
- [ ] Passwords de `app_router`/`app_tenant` reales y en `infra/.env`.
- [ ] Credenciales `Postgres - app_router` / `app_tenant` creadas en n8n.
- [ ] Variables de entorno configuradas.
- [ ] Error Workflow global apuntando a `_Error Handler`.
- [ ] Smoke test: `app_tenant` aislado (0 filas sin `SET`), `app_router` ve todo.
- [ ] Database Linter de Supabase: 0 ERROR (solo WARN 0014 y 0024).
