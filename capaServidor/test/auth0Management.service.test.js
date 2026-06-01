import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
    Auth0ServiceError,
    createAuth0User,
    requestPasswordSetupEmail,
} from "../src/services/auth0Management.service.js";

const ENVIRONMENT = {
    AUTH0_DOMAIN: "tenant.example.auth0.com",
    AUTH0_MANAGEMENT_CLIENT_ID: "management-client-id",
    AUTH0_MANAGEMENT_CLIENT_SECRET: "secret-only-for-test",
    AUTH0_DATABASE_CONNECTION: "Username-Password-Authentication",
    AUTH0_PASSWORD_RESET_CLIENT_ID: "spa-public-client-id",
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

test("resuelve el rol, crea un usuario y asigna RBAC sin retornar contrasena", async () => {
    const requests = [];
    global.fetch = async (url, options) => {
        const body = options?.body ? JSON.parse(options.body) : undefined;
        requests.push({ url, options, body });

        if (url.endsWith("/oauth/token")) {
            return jsonResponse(200, { access_token: "management-access-token" });
        }

        if (url.includes("/api/v2/roles?")) {
            return jsonResponse(200, [{ id: "rol_ventas", name: "Ventas" }]);
        }

        if (url.endsWith("/api/v2/users")) {
            return jsonResponse(201, { user_id: "auth0|created-user" });
        }

        return { ok: true, status: 200 };
    };

    const result = await createAuth0User({
        email: "nuevo@example.cl",
        rolUsuario: "Ventas",
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
            return jsonResponse(200, [{ id: "rol_ventas", name: "Ventas" }]);
        }

        return jsonResponse(409, { message: "The user already exists." });
    };

    await assert.rejects(
        createAuth0User({
            email: "existente@example.cl",
            rolUsuario: "Ventas",
        }),
        (error) =>
            error instanceof Auth0ServiceError &&
            error.code === "USER_EMAIL_ALREADY_EXISTS",
    );
});

test("no crea usuario si el rol solicitado no existe en Auth0", async () => {
    const urls = [];
    global.fetch = async (url) => {
        urls.push(url);

        if (url.endsWith("/oauth/token")) {
            return jsonResponse(200, { access_token: "management-access-token" });
        }

        return jsonResponse(200, [{ id: "rol_operario", name: "Operario" }]);
    };

    await assert.rejects(
        createAuth0User({
            email: "nuevo@example.cl",
            rolUsuario: "Ventas",
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
            return jsonResponse(200, [{ id: "rol_ventas", name: "Ventas" }]);
        }

        if (url.endsWith("/api/v2/users")) {
            return jsonResponse(201, { user_id: "auth0|created-user" });
        }

        return { ok: false, status: 403 };
    };

    const result = await createAuth0User({
        email: "nuevo@example.cl",
        rolUsuario: "Ventas",
    });

    assert.deepEqual(result, {
        userId: "auth0|created-user",
        roleAssignmentCompleted: false,
    });
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
            rolUsuario: "Ventas",
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
