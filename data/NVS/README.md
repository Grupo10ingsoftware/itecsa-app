# Notas de Venta

Directorio local usado por el backend para guardar Notas de Venta dummy asociadas a pedidos durante el desarrollo.

Cuando Cobranzas confirma un pago, el backend aplica la firma electronica y sobrescribe el mismo PDF referenciado por `Documento.ruta_pdf`. No se guarda una copia separada del documento sin firma.

Este almacenamiento es temporal hasta que el equipo confirme el repositorio documental real. No versionar documentos reales, documentos con datos personales sensibles ni archivos de produccion.
