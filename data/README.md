# Data

Durante el desarrollo, esta carpeta contiene archivos generados o subidos localmente por flujos del backend.

`data/Firmas` almacena firmas electronicas subidas por `POST /api/admin/users` mientras no exista un repositorio documental definitivo.

`data/NVS` almacena Notas de Venta dummy asociadas a pedidos durante el desarrollo. `data/NVS/Firmadas` almacena copias generadas con firma electronica para pagos confirmados desde el flujo de Cobranzas.

No versionar documentos reales, datos personales sensibles, certificados, contrasenas ni tokens. Los archivos de usuario deben tratarse como datos locales de desarrollo o de ambiente.
