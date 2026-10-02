# Contribuir a Tonfort (carpintería)

## Cómo empezar

1. Leer `AGENTS.md` en la raíz — contexto completo del proyecto y orden de lectura de docs.
2. Leer `docs/04_arquitectura.md` — dónde va cada archivo, convenciones de código.
3. Leer `docs/03_design_system.md` — tokens visuales.

## Flujo de trabajo

- Rama por feature/issue. Commits en español, formato `tipo(scope): descripción`.
- Antes de push: `npm run lint && npm run typecheck`.
- Los tests unitarios van en `tests/`, ejecutados con `npm test` (Vitest).
- No se commitean secretos. `.env` en la raíz es gitignored.

## Validación

```bash
npm install
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run build       # Next.js producción
npm test            # Vitest unitario
```

## Jerarquía de docs

`AGENTS.md` > `docs/00` → `docs/01` → `docs/02` → `docs/03` → `docs/04` →
`docs/05` > `docs/RUTAS.md` > `docs/Organigrama.md` > conversación actual.

Ante una duda de dónde poner algo o cómo nombrarlo, consulta `docs/04_arquitectura.md`.
Si el código existente contradice este documento, el código tiene prioridad y se
actualiza el documento.
