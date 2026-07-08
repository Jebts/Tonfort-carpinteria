# Arquitectura de carpetas del proyecto

Convención de organización de archivos del reposio. Fuente de verdad para decidir
dónde crear cualquier artefacto nuevo (workflows, SQL, scripts, docs).

Jerarquía de autoridad (docs): `Constitucion_del_Proyecto.md` > `Esquema_*.md` >
`Estructura_Logica_de_Solicitudes.md` > `Herramientas_del_Proyecto.md` >
`Instrucciones_del_Proyecto.md` > esta arquitectura > conversación actual.

## Árbol

```
.
├── README.md                      # Estado de fases + índice de docs
├── docs/                          # Documentación fuente de verdad (markdown)
│   ├── Constitucion_del_Proyecto.md
│   ├── Esquema_de_Base_de_Datos_v9.md
│   ├── Estructura_Logica_de_Solicitudes.md
│   ├── Herramientas_del_Proyecto.md
│   ├── Instrucciones_del_Proyecto.md
│   └── Arquitectura_del_Proyecto.md   (este archivo)
├── infra/                         # Infraestructura desplegable
│   ├── scripts/                   # Scripts de BD/ops (verify_db.sh, futuros)
│   ├── Caddyfile                  # Reverse proxy / TLS
│   ├── docker-compose.yml         # Stack n8n self-hosted
│   ├── .env.example               # Plantilla de variables (sin secretos)
│   └── .env                       # Secretos reales (gitignored)
├── sql/                           # Todo lo relacionado con la base de datos
│   ├── schema/                    # DDL canónico y vigente (esquema_v9.sql)
│   ├── fixes/                     # Parches a BD ya poblada (fix_linter_v9.sql)
│   └── seeds/                     # Fixtures / datos de prueba (vacío por ahora)
└── n8n/                           # Orquestación n8n
    ├── workflows/                 # Workflows principales (A1, A2, A3, B*, C*, D)
    ├── sub-workflows/             # Sub-workflows y helpers (Agente IA, D, _Error Handler)
    └── credentials/               # README de credenciales fijas (sin secretos)
```

## Reglas de ubicación

- **SQL canónico** (esquema vigente) → `sql/schema/`. Nunca se edita en otra carpeta.
- **Parches/pinches** a una BD ya poblada → `sql/fixes/`.
- **Datos de prueba / fixtures** → `sql/seeds/`.

Las tablas de la app viven en el schema `public` (schema por defecto de Supabase para
datos de la app). `auth` es un schema gestionado por Supabase Auth (contiene
`auth.users`, referenciado por las FKs `auth_user_id` de `usuarios_internos` /
`usuarios_empresa`); no se crean tablas de negocio allí. Por eso el WARN 0014
`extension_in_public` se acepta como documentado.
- **Workflows de una solicitud documentada** (A1, A2, A3, B1…B13, C1…C7, D) →
  `n8n/workflows/`; nombre `{sección}{número} - {nombre corto en minúsculas con guiones}.json`.
- **Sub-workflows y helpers compartidos** (Agente IA, D como sub, _Error Handler) →
  `n8n/sub-workflows/`.
- **Credenciales**: no se commitea ningún secreto; solo el README de convención en
  `n8n/credentials/`. Los valores reales viven en n8n / `infra/.env`.
- **Infra**: Docker/Caddy/env en `infra/`; scripts operativos en `infra/scripts/`.

## Convenciones transversales

- Roles/credenciales Postgres fijos: `app_router` (BYPASSRLS, excepciones) y
  `app_tenant` (RLS vía `SET app.tenant_id`). Ver `n8n/credentials/README.md`.
- Ningún secreto en el repo: `.env`, keys y passwords solo en entorno/gestor de secretos.
- Cada nodo de n8n se nombra `{número de paso}. {qué hace}` según el doc de Estructura.

## Fases (ruta crítica: F0 → F1 → F2 → F3 → F4 → F5)

- **F0** documentación y entorno base — completado.
- **F1** infra n8n self-hosted + Caddy — completado.
- **F2** conexión a BD + esquema v9.1 (fix linter 0010/0013/0011) — en ejecución
  (reinit en Supabase pendiente de aplicar; script idempotente en `sql/schema/`).
- **F3** conexión n8n ↔ Supabase — definido, siguiente fase (ver abajo).
- **F4** workflows n8n A1/A2/A3 + Agente IA + Error Handler — completado en git.
- **F5+** pendientes.

### F3 — Conexión n8n ↔ Supabase (capa de integración/credenciales)

**Objetivo:** que los workflows (los de F4 ya exportados y los futuros B/C) puedan
operar la BD con los roles de seguridad correctos y el aislamiento RLS funcionando
de punta a punta.

**Tareas:**
1. Crear/confirmar en n8n las dos credenciales fijas `Postgres - app_router`
   (rol `app_router`, BYPASSRLS) y `Postgres - app_tenant` (rol `app_tenant`, RLS),
   apuntando al proyecto Supabase (`SUPABASE_DB_URL`).
2. Configurar las variables de entorno de n8n (fuente: `docs/Herramientas_del_Proyecto.md`
   §10): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
   `SUPABASE_DB_URL`, `GEMINI_API_KEY`, `META_*`, `WOMPI_*`, `RESEND_API_KEY`,
   `N8N_ENCRYPTION_KEY`.
3. Documentar en `n8n/credentials/README.md` cómo se fija `app.tenant_id` por
   operación con `app_tenant`.
4. **Smoke test de operación con RLS** (valida lo prometido en F2):
   - Con `app_tenant` + `SET app.tenant_id = '<uuid>'`, insertar 1 empresa y
     verificar que `app_tenant` sin `SET`, y `app_router` donde aplique, respetan
     el aislamiento (RLS deniega lo que no es del tenant).
   - Validar que `app_router` puede hacer las excepciones documentadas
     (B1 alta de empresa, B13 confirmación manual, schedules `C*`).
5. Confirmar que los 6 workflows exportados en `n8n/workflows/` y
   `n8n/sub-workflows/` conectan a Supabase sin error de credenciales.

**Criterio de terminación:** n8n opera la BD con RLS funcionando de extremo a
extremo; el aislamiento prometido en F2 queda validado operativamente, no solo a
nivel de esquema.

> Parámetros de conexión reales (host del pooler, user con sufijo `.REF`, SSL) y el
> manejo del `SET app.tenant_id` en n8n están en `n8n/credentials/README.md`. Los
> WARN del linter (0014 `extension_in_public` y 0024 `rls_policy_always_true`) se
> documentan allí como aceptados, para tenerlos en cuenta al diseñar los flujos.
