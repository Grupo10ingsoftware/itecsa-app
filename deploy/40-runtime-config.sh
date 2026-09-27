#!/bin/sh
set -eu

for name in VITE_AUTH0_DOMAIN VITE_AUTH0_CLIENT_ID VITE_AUTH0_AUDIENCE VITE_API_BASE_URL; do
    value="$(printenv "$name" || true)"
    if [ -z "$value" ]; then
        echo "Falta variable publica obligatoria: $name" >&2
        exit 1
    fi
done

umask 022
# jq escapes quotes, backslashes and newlines; never use raw envsubst for JavaScript.
{
    printf 'window.__ITECSA_CONFIG__ = '
    jq -cn '{auth0Domain: env.VITE_AUTH0_DOMAIN, auth0ClientId: env.VITE_AUTH0_CLIENT_ID, auth0Audience: env.VITE_AUTH0_AUDIENCE, apiBaseUrl: env.VITE_API_BASE_URL}'
    printf ';\n'
} > /tmp/runtime-config.js.tmp
mv /tmp/runtime-config.js.tmp /tmp/runtime-config.js
