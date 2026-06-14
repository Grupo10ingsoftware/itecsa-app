# Plantillas Auth0

Esta carpeta contiene plantillas de referencia para configurar correos administrados por Auth0.

## Cambio De Contrasena

`change-password-email-es.html` es la plantilla en espanol para el correo de cambio o establecimiento de contrasena. El archivo sirve como respaldo/documentacion del contenido que debe copiarse al template **Change Password** del dashboard de Auth0.

## Advertencia Sobre Custom Email Provider

Auth0 requiere configurar un **Custom Email Provider** para que las personalizaciones de los email templates se apliquen realmente.

Mientras se use el **Auth0 Email Provider** de desarrollo/trial, los correos enviados pueden seguir usando las plantillas por defecto de Auth0, aunque el template personalizado exista o se haya editado.

## Checklist De Configuracion

- Configurar y activar un Custom Email Provider en Auth0.
- Copiar/guardar `change-password-email-es.html` en el template **Change Password**.
- Probar un correo real de recuperacion o establecimiento de contrasena.
