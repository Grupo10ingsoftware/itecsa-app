# Instrucciones para agentes

## GitHub CLI y sandbox

- Cuando se use GitHub CLI (`gh`) para operaciones que consulten credenciales o requieran red, ejecutar el comando fuera del sandbox desde el primer intento, solicitando la aprobación correspondiente.
- Esto incluye, entre otros, `gh auth status`, consultas a repositorios, pull requests, issues y workflows.
- No interpretar un fallo de autenticación obtenido dentro del sandbox como credenciales inválidas sin verificar primero el mismo comando fuera del sandbox.
