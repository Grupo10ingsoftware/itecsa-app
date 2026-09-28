import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
    Auth0ServiceError,
    createAuth0User,
    getAuth0UserRole,
    requestPasswordSetupEmail,
    setAuth0UserStatus,
    updateAuth0User,
} from "../src/modules/users/service/auth0Management.service.js";

const ENVIRONMENT = {
    AUTH0_DOMAIN: "tenant.example.auth0.com",
    AUTH0_MANAGEMENT_CLIENT_ID: "management-client-id",
    AUTH0_MANAGEMENT_CLIENT_SECRET: "secret-only-for-test",
    AUTH0_DATABASE_CONNECTION: "Username-Password-Authentication",
    AUTH0_PASSWORD_RESET_CLIENT_ID: "spa-public-client-id",
    AUTH0_REQUEST_TIMEOUT_MS: "8000",
};
const originalFetch = global.fetch;
const originalEnvironment = Object.fromEntries(
    Object.keys(ENVIRONMENT).map((key) => [key, process.env[key]]),
);

beforeEach(() => {
    Object.assign(process.env, ENVIRONMENT);
});

afterEach(() => {
    global.fetch = originalFetch;

    for (const [key, value] of Object.entries(originalEnvironment)) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
});

function jsonResponse(status, body) {
    return {
        ok: status >= 200 && status < 300,
        status,
        async json() {
            return body;
        },
    };
}

test('consulta el rol asignado en Auth0 y exige uno solo reconocido', async () => {
    let assignedRoles = [{ name: 'Administrador Ventas' }];
    const requests = [];
    global.fetch = async (url) => {
        requests.push(url);
        if (url.endsWith('/oauth/token')) return jsonResponse(200, { access_token: 'management-access-token' });
        return jsonResponse(200, { roles: assignedRoles, total: assignedRoles.length });
    };

    assert.equal(await getAuth0UserRole('auth0|user-id'), 'Administrador Ventas');
    assert.equal(requests[1], 'https://tenant.example.auth0.com/api/v2/users/auth0%7Cuser-id/roles?per_page=100&page=0&include_totals=true');
    assignedRoles = [{ name: 'Administrador Ventas' }, { name: 'Operario Ventas' }];
    assert.equal(await getAuth0UserRole('auth0|user-id'), null);
    assignedRoles = [];
    assert.equal(await getAuth0UserRole('auth0|user-id'), null);
});

test('rechaza una respuesta parcial de roles de Auth0', async () => {
    global.fetch = async (url) => url.endsWith('/oauth/token')
        ? jsonResponse(200, { access_token: 'management-access-token' })
        : jsonResponse(200, { roles: [{ name: 'Administrador Ventas' }], total: 2 });
    await assert.rejects(getAuth0UserRole('auth0|user-id'), { code: 'AUTH0_INVALID_RESPONSE' });
});

test("resuelve el rol, crea un usuario y asigna RBAC sin retornar contrasena", async () => {
    const requests = [];
    global.fetch = async (url, options) => {
        const body = options?.body ? JSON.parse(options.body) : undefined;
        requests.push({ url, options, body });

        if (url.endsWith("/oauth/token")) {
            return jsonResponse(200, { access_token: "management-access-token" });
        }

        if (url.includes("/api/v2/roles?")) {
            return jsonResponse(200, [{ id: "rol_ventas", name: "Operario Ventas" }]);
        }

        if (url.endsWith("/api/v2/users")) {
            return jsonResponse(201, { user_id: "auth0|created-user" });
        }

        return { ok: true, status: 200 };
    };

    const result = await createAuth0User({
        email: "nuevo@example.cl",
        rolUsuario: "Operario Ventas",
    });

    assert.deepEqual(result, {
        userId: "auth0|created-user",
        roleAssignmentCompleted: true,
    });
    assert.equal(requests.length, 4);
    assert.deepEqual(requests[0].body, {
        grant_type: "client_credentials",
        client_id: ENVIRONMENT.AUTH0_MANAGEMENT_CLIENT_ID,
        client_secret: ENVIRONMENT.AUTH0_MANAGEMENT_CLIENT_SECRET,
        audience: `https://${ENVIRONMENT.AUTH0_DOMAIN}/api/v2/`,
        scope: "read:users create:users update:users read:roles",
    });
    assert.equal(
        requests[1].url,
        `https://${ENVIRONMENT.AUTH0_DOMAIN}/api/v2/roles?per_page=100&page=0`,
    );
    assert.deepEqual(
        {
            email: requests[2].body.email,
            connection: requests[2].body.connection,
        },
        {
            email: "nuevo@example.cl",
            connection: ENVIRONMENT.AUTH0_DATABASE_CONNECTION,
        },
    );
    assert.equal("given_name" in requests[2].body, false);
    assert.equal("family_name" in requests[2].body, false);
    assert.equal("app_metadata" in requests[2].body, false);
    assert.equal(typeof requests[2].body.password, "string");
    assert.ok(requests[2].body.password.length > 30);
    assert.equal(JSON.stringify(result).includes(requests[2].body.password), false);
    assert.equal(
        JSON.stringify(result).includes(ENVIRONMENT.AUTH0_MANAGEMENT_CLIENT_SECRET),
        false,
    );
    assert.equal(
        requests[2].options.headers.Authorization,
        "Bearer management-access-token",
    );
    assert.equal(
        requests[3].url,
        `https://${ENVIRONMENT.AUTH0_DOMAIN}/api/v2/users/auth0%7Ccreated-user/roles`,
    );
    assert.deepEqual(requests[3].body, { roles: ["rol_ventas"] });
});

test("normaliza el correo duplicado para un futuro HTTP 409", async () => {
    global.fetch = async (url) => {
        if (url.endsWith("/oauth/token")) {
            return jsonResponse(200, { access_token: "management-access-token" });
        }

        if (url.includes("/api/v2/roles?")) {
            return jsonResponse(200, [{ id: "rol_ventas", name: "Operario Ventas" }]);
        }

        return jsonResponse(409, { message: "The user already exists." });
    };

    await assert.rejects(
        createAuth0User({
            email: "existente@example.cl",
            rolUsuario: "Operario Ventas",
        }),
        (error) =>
            error instanceof Auth0ServiceError &&
            error.code === "USER_EMAIL_ALREADY_EXISTS",
    );
});

test("clasifica indisponibilidad temporal al crear antes de persistir localmente", async () => {
    global.fetch = async (url) => {
        if (url.endsWith("/oauth/token")) {
            return jsonResponse(200, { access_token: "management-access-token" });
        }

        if (url.includes("/api/v2/roles?")) {
            return jsonResponse(200, [{ id: "rol_ventas", name: "Operario Ventas" }]);
        }

        return jsonResponse(503, { error: "temporarily_unavailable" });
    };

    await assert.rejects(
        createAuth0User({
            email: "nuevo@example.cl",
            rolUsuario: "Operario Ventas",
        }),
        (error) =>
            error instanceof Auth0ServiceError &&
            error.code === "AUTH0_UPSTREAM_ERROR" &&
            error.category === "upstream",
    );
});

test("no crea usuario si el rol solicitado no existe en Auth0", async () => {
    const urls = [];
    global.fetch = async (url) => {
        urls.push(url);

        if (url.endsWith("/oauth/token")) {
            return jsonResponse(200, { access_token: "management-access-token" });
        }

        return jsonResponse(200, [{ id: "rol_produccion", name: "Operario Produccion" }]);
    };

    await assert.rejects(
        createAuth0User({
            email: "nuevo@example.cl",
            rolUsuario: "Operario Ventas",
        }),
        (error) =>
            error instanceof Auth0ServiceError &&
            error.code === "AUTH0_ROLE_NOT_FOUND",
    );
    assert.equal(urls.some((url) => url.endsWith("/api/v2/users")), false);
});

test("reporta asignacion RBAC incompleta si falla despues de crear usuario", async () => {
    global.fetch = async (url) => {
        if (url.endsWith("/oauth/token")) {
            return jsonResponse(200, { access_token: "management-access-token" });
        }

        if (url.includes("/api/v2/roles?")) {
            return jsonResponse(200, [{ id: "rol_ventas", name: "Operario Ventas" }]);
        }

        if (url.endsWith("/api/v2/users")) {
            return jsonResponse(201, { user_id: "auth0|created-user" });
        }

        return { ok: false, status: 403 };
    };

    const result = await createAuth0User({
        email: "nuevo@example.cl",
        rolUsuario: "Operario Ventas",
    });

    assert.deepEqual(result, {
        userId: "auth0|created-user",
        roleAssignmentCompleted: false,
    });
});

test("actualiza correo, estado y rol de usuario Auth0", async () => {
    const requests = [];
    global.fetch = async (url, options = {}) => {
        const body = options.body ? JSON.parse(options.body) : undefined;
        requests.push({ url, options, body });

        if (url.endsWith("/oauth/token")) {
            return jsonResponse(200, { access_token: "management-access-token" });
        }

        if (url.endsWith("/api/v2/users/auth0%7Cuser-1")) {
            return jsonResponse(200, { user_id: "auth0|user-1" });
        }

        if (url.includes("/api/v2/roles?")) {
            return jsonResponse(200, [
                { id: "rol_admin", name: "Administrador Produccion" },
                { id: "rol_soporte", name: "Soporte" },
                { id: "rol_ventas", name: "Operario Ventas" },
            ]);
        }

        if (url.endsWith("/api/v2/users/auth0%7Cuser-1/roles")) {
            return { ok: true, status: 204, async json() { return null; } };
        }

        throw new Error(`Solicitud inesperada: ${url}`);
    };

    const result = await updateAuth0User({
        userId: "auth0|user-1",
        correoUsuario: "editado@example.cl",
        rolUsuario: "Operario Ventas",
    });

    assert.deepEqual(result, {
        idUsuarioAutenticacionExterna: "auth0|user-1",
        correoUsuario: "editado@example.cl",
        rolUsuario: "Operario Ventas",
    });
    assert.deepEqual(requests[1].body, {
        email: "editado@example.cl",
        app_metadata: {
            rolUsuario: "Operario Ventas",
        },
    });
    assert.equal(requests.some((request) => request.options.method === "DELETE"), true);
    assert.equal(
        requests.filter((request) => request.url.includes("/api/v2/roles?")).length,
        1,
    );
    assert.equal(requests.length, 5);
    const deleteRequest = requests.find(
        (request) => request.options.method === "DELETE",
    );
    assert.equal(deleteRequest.body.roles.includes("rol_soporte"), true);
    assert.equal(requests.some((request) => request.body?.roles?.includes("rol_ventas")), true);
});

test("pagina el catalogo de roles una sola vez al reemplazar un rol", async () => {
    const rolePages = [];
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
        id: `rol_extra_${index}`,
        name: `Rol extra ${index}`,
    }));
    global.fetch = async (url, options = {}) => {
        if (url.endsWith("/oauth/token")) {
            return jsonResponse(200, { access_token: "management-access-token" });
        }
        if (url.endsWith("/api/v2/users/auth0%7Cuser-1")) {
            return jsonResponse(200, { user_id: "auth0|user-1" });
        }
        if (url.includes("/api/v2/roles?")) {
            rolePages.push(url);
            return url.endsWith("page=0")
                ? jsonResponse(200, firstPage)
                : jsonResponse(200, [{ id: "rol_ventas", name: "Operario Ventas" }]);
        }
        if (url.endsWith("/api/v2/users/auth0%7Cuser-1/roles")) {
            return { ok: true, status: options.method === "DELETE" ? 204 : 200 };
        }
        throw new Error(`Solicitud inesperada: ${url}`);
    };

    await updateAuth0User({
        userId: "auth0|user-1",
        correoUsuario: "editado@example.cl",
        rolUsuario: "Operario Ventas",
    });

    assert.deepEqual(rolePages, [
        `https://${ENVIRONMENT.AUTH0_DOMAIN}/api/v2/roles?per_page=100&page=0`,
        `https://${ENVIRONMENT.AUTH0_DOMAIN}/api/v2/roles?per_page=100&page=1`,
    ]);
});

test("conserva la categoria temporal si falla la asignacion del nuevo rol", async () => {
    global.fetch = async (url, options = {}) => {
        if (url.endsWith("/oauth/token")) {
            return jsonResponse(200, { access_token: "management-access-token" });
        }
        if (url.endsWith("/api/v2/users/auth0%7Cuser-1")) {
            return jsonResponse(200, { user_id: "auth0|user-1" });
        }
        if (url.includes("/api/v2/roles?")) {
            return jsonResponse(200, [{ id: "rol_ventas", name: "Operario Ventas" }]);
        }
        if (
            url.endsWith("/api/v2/users/auth0%7Cuser-1/roles") &&
            options.method === "DELETE"
        ) {
            return { ok: true, status: 204, async json() { return null; } };
        }
        if (url.endsWith("/api/v2/users/auth0%7Cuser-1/roles")) {
            return jsonResponse(429, { error: "too_many_requests" });
        }
        throw new Error(`Solicitud inesperada: ${url}`);
    };

    await assert.rejects(
        updateAuth0User({
            userId: "auth0|user-1",
            correoUsuario: "editado@example.cl",
            rolUsuario: "Operario Ventas",
            rolUsuarioAnterior: "Operario Produccion",
        }),
        (error) =>
            error instanceof Auth0ServiceError &&
            error.code === "AUTH0_RATE_LIMITED" &&
            error.category === "rate_limit",
    );
});

test("no consulta ni reemplaza RBAC cuando el rol no cambia", async () => {
    const requests = [];
    global.fetch = async (url, options = {}) => {
        requests.push({ url, options });
        if (url.endsWith("/oauth/token")) {
            return jsonResponse(200, { access_token: "management-access-token" });
        }
        if (url.endsWith("/api/v2/users/auth0%7Cuser-1")) {
            return jsonResponse(200, { user_id: "auth0|user-1" });
        }
        throw new Error(`Solicitud inesperada: ${url}`);
    };

    await updateAuth0User({
        userId: "auth0|user-1",
        correoUsuario: "editado@example.cl",
        rolUsuario: "Operario Ventas",
        rolUsuarioAnterior: "Operario Ventas",
    });

    assert.equal(requests.length, 2);
    assert.equal(requests.some(({ url }) => url.includes("/roles")), false);
});

test("actualiza solo el estado de usuario Auth0", async () => {
    const requests = [];
    global.fetch = async (url, options = {}) => {
        const body = options.body ? JSON.parse(options.body) : undefined;
        requests.push({ url, options, body });

        if (url.endsWith("/oauth/token")) {
            return jsonResponse(200, { access_token: "management-access-token" });
        }

        if (url.endsWith("/api/v2/users/auth0%7Cuser-1")) {
            return jsonResponse(200, { user_id: "auth0|user-1" });
        }

        throw new Error(`Solicitud inesperada: ${url}`);
    };

    const result = await setAuth0UserStatus({
        userId: "auth0|user-1",
        estadoUsuario: "Activo",
    });

    assert.deepEqual(result, {
        idUsuarioAutenticacionExterna: "auth0|user-1",
        estadoUsuario: "Activo",
    });
    assert.deepEqual(requests[1].body, {
        blocked: false,
        app_metadata: { estadoUsuario: "Activo" },
    });
});

test("rechaza estados internos que no deben propagarse a Auth0", async () => {
    let calls = 0;
    global.fetch = async () => {
        calls += 1;
        throw new Error("fetch no debe ejecutarse");
    };

    await assert.rejects(
        setAuth0UserStatus({
            userId: "auth0|user-1",
            estadoUsuario: "Pendiente rol",
        }),
        (error) =>
            error instanceof Auth0ServiceError &&
            error.code === "INVALID_STATUS",
    );
    assert.equal(calls, 0);
});

test("solicita el correo sin retornar tickets ni enlaces", async () => {
    let request;
    global.fetch = async (url, options) => {
        request = { url, body: JSON.parse(options.body) };
        return {
            ok: true,
            status: 200,
        };
    };

    const result = await requestPasswordSetupEmail({
        email: "nuevo@example.cl",
    });

    assert.deepEqual(result, { requested: true });
    assert.equal(
        request.url,
        `https://${ENVIRONMENT.AUTH0_DOMAIN}/dbconnections/change_password`,
    );
    assert.deepEqual(request.body, {
        client_id: ENVIRONMENT.AUTH0_PASSWORD_RESET_CLIENT_ID,
        email: "nuevo@example.cl",
        connection: ENVIRONMENT.AUTH0_DATABASE_CONNECTION,
    });
    assert.equal("ticket" in result, false);
    assert.equal("url" in result, false);
});

test("rechaza la creacion si falta configuracion Management requerida", async () => {
    delete process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;

    await assert.rejects(
        createAuth0User({
            email: "nuevo@example.cl",
            rolUsuario: "Operario Ventas",
        }),
        (error) =>
            error instanceof Auth0ServiceError &&
            error.code === "AUTH0_CONFIGURATION_ERROR",
    );
});

test("normaliza fallos de Auth0 al solicitar correo", async () => {
    global.fetch = async () => ({ ok: false, status: 400 });

    await assert.rejects(
        requestPasswordSetupEmail({ email: "nuevo@example.cl" }),
        (error) =>
            error instanceof Auth0ServiceError &&
            error.code === "AUTH0_PASSWORD_EMAIL_FAILED",
    );
});

test("aplica deadline y clasifica timeout sin reintentar el correo", async () => {
    process.env.AUTH0_REQUEST_TIMEOUT_MS = "100";
    let calls = 0;
    global.fetch = async (_url, options) => {
        calls += 1;
        return await new Promise((_resolve, reject) => {
            options.signal.addEventListener("abort", () => {
                reject(new DOMException("aborted", "AbortError"));
            }, { once: true });
        });
    };

    await assert.rejects(
        requestPasswordSetupEmail({ email: "nuevo@example.cl" }),
        (error) =>
            error instanceof Auth0ServiceError &&
            error.code === "AUTH0_PASSWORD_EMAIL_FAILED" &&
            error.category === "timeout",
    );
    assert.equal(calls, 1);
});

test("clasifica red y rate limit, y conserva Retry-After", async () => {
    global.fetch = async () => {
        throw new TypeError("offline");
    };
    await assert.rejects(
        requestPasswordSetupEmail({ email: "nuevo@example.cl" }),
        (error) =>
            error instanceof Auth0ServiceError &&
            error.category === "network",
    );

    global.fetch = async () => ({
        ok: false,
        status: 429,
        headers: { get: (name) => name === "retry-after" ? "7" : null },
        async json() { return { error: "too_many_requests" }; },
    });
    await assert.rejects(
        requestPasswordSetupEmail({ email: "nuevo@example.cl" }),
        (error) =>
            error instanceof Auth0ServiceError &&
            error.code === "AUTH0_RATE_LIMITED" &&
            error.category === "rate_limit" &&
            error.retryAfterSeconds === 7,
    );
});

test("rechaza un deadline Auth0 fuera del rango seguro", async () => {
    process.env.AUTH0_REQUEST_TIMEOUT_MS = "0";
    global.fetch = async () => {
        throw new Error("fetch no debe ejecutarse");
    };

    await assert.rejects(
        requestPasswordSetupEmail({ email: "nuevo@example.cl" }),
        (error) =>
            error instanceof Auth0ServiceError &&
            error.code === "AUTH0_CONFIGURATION_ERROR",
    );
});
