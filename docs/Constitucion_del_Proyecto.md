# Constitución del Proyecto (v4)

## Changelog de esta versión (v3 → v4)

1. **Pasarela de pago: Stripe → Wompi.** Stripe Checkout no está disponible para cuentas colombianas con payouts locales en COP. El MVP adopta **Wompi** como pasarela de checkout puntual + webhook de confirmación.
2. **Moneda única COP** para el MVP (antes USD). Multi-moneda queda diferido explícitamente.
3. **Activación manual documentada:** el staff (`usuarios_internos`) confirma transferencias/depósitos recibidos vía flujo B13, con auditoría completa (principio 3.8).
4. **Chat Asistente con suscripción vencida:** el staff del negocio mantiene acceso a herramientas internas; solo la IA hacia clientes finales se pausa.
5. **Recordatorio proactivo pre-vencimiento:** sigue diferido; el MVP incluye aviso mínimo por email al vencer el ciclo (C5/C6).
6. **Reconciliación Google Calendar:** confirmado como diferido intencional, no olvidado — la BD sigue siendo fuente de verdad (3.3).

---

## 0. Qué es este documento

Este es el documento de más alto nivel del proyecto. No contiene código ni detalles técnicos — contiene **el porqué y los principios que no se negocian**, para que cualquier decisión futura (tuya, mía, o de quien continúe este trabajo) se pueda evaluar contra algo estable. Cuando haya duda sobre si una nueva funcionalidad, atajo o cambio de diseño es aceptable, la respuesta debe salir de este documento antes que de la conveniencia del momento.

Junto con este documento, el proyecto se apoya en:
- **`Instrucciones_del_Proyecto.md`** — cómo debe trabajar el asistente de IA que ejecuta este proyecto.
- **`Herramientas_del_Proyecto.md`** — qué tecnologías se usan y para qué.
- **`Esquema_de_Base_de_Datos_vX.md`** (siempre la versión con el número más alto) — la estructura de datos, fuente de verdad técnica.
- **`Estructura_Logica_de_Solicitudes.md`** — cómo se procesa cada solicitud que recibe o emite el sistema.

Estos cinco documentos juntos deben ser suficientes para que alguien sin ningún contexto previo entienda qué es este proyecto, por qué está diseñado así, y cómo construir sobre él sin romperlo.

---

## 1. Qué es este proyecto

Es una empresa de software (SaaS — *Software as a Service*) que vende a otros negocios un servicio de **atención al cliente automatizada por WhatsApp** y **agendamiento de citas automatizado con Google Calendar**, ambos operados por un agente de Inteligencia Artificial.

En términos simples: un negocio (un consultorio, una peluquería, una clínica, lo que sea) se suscribe a esta plataforma. A partir de ahí, cuando **sus** clientes le escriben por WhatsApp, quien responde es un agente de IA — que conoce el contexto de ese negocio específico, puede resolver dudas, y puede agendar una cita directamente en el calendario del negocio.

## 2. A quién sirve y quiénes participan

- **Tu empresa** (el dueño de esta plataforma): vende el servicio, opera la infraestructura, es responsable de la seguridad de los datos de todos los negocios que confían en la plataforma, y cobra por el uso (manualmente vía staff interno, o vía **Wompi**).
- **Empresas / Negocios (tenants o "inquilinos")**: los clientes que pagan por el servicio. Cada uno tiene su propia configuración, su propio número de WhatsApp por usuario, su propio calendario, su propio catálogo de servicios y su propio personal.
- **Clientes finales**: las personas que le escriben por WhatsApp a un negocio para resolver dudas o agendar una cita. No tienen relación directa contigo — son clientes del negocio, no de tu plataforma.
- **Usuarios de empresa (`usuarios_empresa`)**: el personal del negocio que la IA representa ante los clientes finales. Se dividen en dos roles con significado de negocio, no solo de permisos (ver 3.7):
  - **Administrador**: exactamente uno por empresa, es la línea general/central de atención.
  - **Operador**: cantidad variable, cada uno con su propia línea de WhatsApp y su propio horario — típicamente un profesional específico dentro del negocio.
- **Usuarios internos (`usuarios_internos`)**: staff de tu plataforma con poder de confirmar pagos manuales (transferencias/depósitos) y operaciones transversales.
- **El Agente de IA**: el sistema automatizado que efectivamente conversa, decide, y actúa (responder, agendar, escalar), usando el contexto de cada empresa y de cada usuario.

## 3. Principios no negociables

Estos principios existen porque romperlos no es un error menor recuperable — es el tipo de fallo que cuesta la confianza de un negocio-cliente o expone datos que no son tuyos.

### 3.1. El aislamiento entre negocios es sagrado
Los datos de un negocio **nunca**, bajo ninguna circunstancia, deben ser visibles o modificables desde el contexto de otro negocio. Esto no es una preferencia de diseño — es la razón de ser de la seguridad de este sistema, porque manejas datos de clientes de terceros. Por eso el aislamiento no depende solo de que el código "recuerde" filtrar correctamente: está reforzado directamente en la base de datos (Row-Level Security), de modo que incluso un error de programación no pueda filtrar datos entre negocios.

### 3.2. Nunca se borra información de verdad
El sistema usa borrado lógico (marcar un registro como eliminado sin quitarlo físicamente) en toda tabla que represente datos operativos. Esto protege contra errores humanos, permite auditoría, y es frecuentemente un requisito legal. Un `DELETE` físico en una tabla transaccional es, por definición, un error de implementación.

### 3.3. La base de datos manda; los servicios externos confirman
Cuando el sistema necesita coordinar algo con un servicio externo (Google Calendar, WhatsApp, Wompi), la base de datos decide y registra primero, y el servicio externo se sincroniza después. Nunca al revés. Esto evita que una falla de red deje al sistema en un estado ambiguo (por ejemplo, una cita que existe en Calendar pero no en la base de datos, un pago confirmado por Wompi pero no reflejado en la suscripción, o viceversa).

**Diferido intencionalmente:** un proceso automático de reconciliación que detecte y corrija citas desincronizadas con Google Calendar tras fallos de red. La BD sigue siendo fuente de verdad; la reconciliación se añadirá cuando el volumen lo justifique.

### 3.4. Ninguna solicitud debe procesarse dos veces por accidente
Los sistemas externos (especialmente Meta/WhatsApp y Wompi) reintentan entregas de webhooks. El sistema debe ser capaz de reconocer "esto ya lo procesé" y no duplicar mensajes, transacciones, cobros ni acciones — sin excepción.

### 3.5. Escalable significa que agregar el negocio número 500 no requiere rediseñar nada
El sistema se diseña desde el negocio número uno pensando en que existirán cientos. Ninguna solución "temporal" que solo funcione con pocos negocios (por ejemplo, un número de WhatsApp compartido, o una tabla sin índices) se acepta como definitiva, aunque sea aceptable temporalmente durante una prueba piloto.

### 3.6. Todo cambio de diseño se versiona y se explica
Nada se sobrescribe silenciosamente. Cuando el esquema de datos o la lógica de solicitudes cambian, se genera una nueva versión con su changelog — para que siempre sea posible entender por qué el sistema es como es hoy.

### 3.7. Cada empresa tiene exactamente un administrador
El administrador es la línea general de atención de la empresa — no es un rol de conveniencia, es la identidad central del negocio ante sus clientes. Por eso su unicidad no es solo una regla de UI: está reforzada con un constraint en la base de datos. Los operadores, en cambio, son un recurso que escala libremente según cuántos usuarios contrate la empresa.

### 3.8. El dinero se audita igual que los datos de clientes
Toda activación o cambio de estado de una suscripción — sea manual (staff confirma transferencia, flujo B13) o vía Wompi — debe dejar un rastro de quién y cuándo la ejecutó. Una activación manual sin registro de quién la hizo es, para efectos de este proyecto, tan inaceptable como un `DELETE` físico: ambos destruyen la capacidad de auditar después.

### 3.9. La identidad de quien accede al sistema se verifica con un proveedor auditado, no con código propio
Ni `usuarios_empresa` ni `usuarios_internos` autentican con lógica construida a mano dentro de la aplicación. Se usa **Supabase Auth** como proveedor de identidad: gestiona el hash de contraseña, la emisión y renovación de sesión (JWT), y el segundo factor de autenticación (MFA). El nivel de exigencia de MFA es proporcional al daño posible si esa cuenta se compromete:
- **Obligatorio** para `admin` (principio 3.7) y para `usuarios_internos` (pueden activar pagos manuales, principio 3.8).
- **Opcional** para `operador`.

### 3.10. Un usuario desactivado deja de tener voz ante los clientes finales, de forma automática
Cuando un `usuarios_empresa` pasa a `activo = FALSE`, cualquier línea de WhatsApp propia que tenga se desconecta automáticamente — reforzado en base de datos, no solo como una verificación en el workflow. Un cliente final nunca debe poder seguir "hablando" con un profesional que el negocio ya dio de baja operativamente.

## 4. Qué está dentro del alcance del MVP y qué se difiere a propósito

**Dentro del MVP (fase actual):**
- Atención por WhatsApp con agente de IA con libertad de decisión.
- Agendamiento en Google Calendar.
- Arquitectura multi-tenant desde el día uno, con un número de WhatsApp propio por usuario de empresa (administrador y cada operador), dado de alta **manualmente** por el operador de la plataforma.
- Aislamiento y seguridad de datos (RLS, roles separados, credenciales cifradas, validación de firma de webhooks Meta y Wompi).
- **Autenticación vía Supabase Auth**, con MFA obligatorio para `admin` y `usuarios_internos`.
- **Modelo comercial por tokens estimados según rol (administrador/operador) × cantidad de usuarios**, con corte inmediato al agotarse el cupo o cumplirse el ciclo de 30 días.
- **Precio por operador contratado**, en **COP** (moneda única del MVP), versionable por fecha igual que los parámetros de tokens.
- **Facturación**: activación manual auditada por staff (B13), o **Wompi** con checkout puntual + webhook de confirmación (B11/B12).
- **Catálogo informativo de productos** (venta cruzada conversacional) — sin inventario ni transacción real todavía.
- **Contexto híbrido del agente**: inyección directa de lo pequeño/estable (instrucciones, identidad, horario), RAG solo para lo voluminoso/creciente (detalle de servicios, catálogo de productos).
- **Plazo de 7 días** para que el admin seleccione qué operadores quedan activos tras una reducción de plan; vencido el plazo, el sistema desactiva automáticamente por menor antigüedad.
- **Chat Asistente operativo para staff** aunque la suscripción esté vencida — solo la atención IA a clientes finales se pausa.
- **Aviso mínimo por email** al vencer ciclo de 30 días (C5/C6), dado que no hay cobro recurrente automático en Wompi.

**Diferido intencionalmente (no significa "olvidado"):**
- Recursos agendables no humanos (salas, equipos) — hoy solo se agenda contra personas (`usuarios_empresa`).
- Auditoría/replay de webhooks fallidos.
- Inventario y venta transaccional real de productos (hoy solo catálogo informativo).
- **Suscripciones recurrentes nativas** en Wompi (cobro automático por ciclo) — el MVP cobra por checkout puntual.
- **Recordatorio proactivo de renovación** (antes de vencer, más allá del aviso de 90% de tokens y del aviso al vencer) — se difiere hasta justificar la complejidad con volumen real.
- **Multi-moneda** en el precio por operador.
- **Automatización del alta de números de WhatsApp** desde el dashboard.
- **Reconciliación automática Google Calendar** tras fallos de sincronización (principio 3.3 mantiene BD como fuente de verdad; el proceso correctivo se difiere).

Diferir algo aquí es una decisión explícita, documentada, y revisable — no un vacío accidental.

## 5. Cómo se evalúan las decisiones futuras

Ante cualquier propuesta de cambio (una nueva funcionalidad, un atajo para ir más rápido, una integración nueva), la pregunta en orden es:

1. **¿Compromete el aislamiento entre negocios?** Si sí, se rechaza o se rediseña — no hay negociación posible aquí.
2. **¿Es reversible?** Preferir siempre decisiones que se puedan deshacer sobre las que no.
3. **¿Escala más allá de un puñado de negocios?** Si la respuesta es "solo funciona con pocos", debe marcarse explícitamente como solución temporal, con su plan de reemplazo.
4. **¿Está documentado?** Si el cambio afecta el esquema o la lógica de solicitudes, se refleja en esos documentos antes de darse por implementado.

## 6. Tono del proyecto

Este proyecto se construye con el mismo cuidado con el que se ha construido hasta ahora: cada decisión se cuestiona, se buscan las condiciones de carrera y los casos límite antes de que ocurran en producción, y se prefiere ser minucioso una vez a tener que corregir un incidente de seguridad después.
