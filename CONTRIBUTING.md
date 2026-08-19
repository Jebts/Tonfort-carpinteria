# Contribuir a Tonfort (carpintería)

## Cómo empezar

1. Leer `docs/Constitucion_del_Proyecto.md` — los principios no negociables.
2. Leer `docs/Arquitectura_del_Proyecto.md` — dónde va cada archivo nuevo.
3. Leer `docs/Convenciones_Codigo.md` — estándares de código, naming y patrones.

## Flujo de trabajo

- Rama por feature/issue. Commits en español, formato `tipo(scope): descripción`.
- Antes de push: `npm run lint && npm run typecheck`.
- Los tests unitarios van en `tests/`, los E2E en `tests-e2e/`.
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

`Constitucion` > `Esquema` > `Estructura Logica` > `Herramientas` > `Instrucciones` >
`Arquitectura` > `Convenciones de Codigo` > conversación actual.

Ante una duda de dónde poner algo o cómo nombrarlo, consulta `docs/Convenciones_Codigo.md`.
Si el código existente contradice este documento, el código tiene prioridad y se
actualiza el documento.
