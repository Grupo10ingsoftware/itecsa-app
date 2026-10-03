# Registro de dependencias y excepciones

El runtime backend fuerza versiones corregidas de MariaDB, `mysql2`, `qs` y `fast-uri`; el frontend fuerza versiones corregidas de Browserslist y `baseline-browser-mapping`. Prisma CLI está aislado en `tooling/prisma`, fuera del runtime desplegable.

## Excepción temporal de tooling

Al 26-09-2026, `prisma@7.10.0` arrastra `@prisma/config` y `deepmerge-ts@7`, reportado por `npm audit` por agotamiento de pila al combinar grafos recursivos. No existe actualización estable compatible en la línea instalada; el arreglo sugerido por npm es un downgrade mayor a Prisma 6, incompatible con el stack validado.

Mitigación: el CLI sólo se ejecuta en CI o estaciones controladas, con archivos de configuración versionados y sin entrada de objetos suministrados por usuarios; no forma parte del contenedor runtime. La auditoría `--omit=dev` del runtime debe permanecer en cero vulnerabilidades altas.

CI ejecuta la auditoría completa del tooling y falla ante vulnerabilidades críticas. Los tres nodos altos conocidos (`prisma`, `@prisma/config` y `deepmerge-ts`) corresponden a la misma cadena documentada; no se silencian en el reporte, aunque no bloquean mientras esta excepción siga vigente.

- Responsable: líder técnico / seguridad de aplicación.
- Próxima revisión: 31-10-2026 o al publicarse una versión estable corregida, lo que ocurra primero.
- Gate: no aceptar nuevas vulnerabilidades runtime altas sin mitigación y responsable documentados.
