export async function onRequest(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const path = url.pathname;

    // Global CORS handling for preflight requests
    if (method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }

    // Define public routes that don't need authentication
    const publicRoutes = ["/api/auth/login", "/api/auth/signup"];
    if (publicRoutes.includes(path)) {
        if (path === "/api/auth/login" && method === "POST") return handleLogin(context);
        if (path === "/api/auth/signup" && method === "POST") return handleSignup(context);
        return new Response("Method not allowed", { status: 405 });
    }

    // ==========================================
    // GLOBAL AUTHENTICATION MIDDLEWARE
    // ==========================================
    let currentUser = null;
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return errorResponse("Authentication required", 401);
        }

        const token = authHeader.substring(7);
        const { results: sessions } = await env.DB.prepare(
            "SELECT id, data FROM entities WHERE entity_name = 'Session' AND json_extract(data, '$.token') = ?"
        ).bind(token).all();

        if (!sessions.length) return errorResponse("Invalid or expired session", 401);

        const sessionData = JSON.parse(sessions[0].data);
        if (new Date(sessionData.expires_at) < new Date()) {
            return errorResponse("Session expired", 401);
        }

        currentUser = {
            id: sessionData.user_id,
            username: sessionData.username,
            email: sessionData.email,
        };
    } catch (e) {
        console.error("Auth error:", e);
        return errorResponse("Authentication failed", 500);
    }

    // ==========================================
    // AUTHENTICATED ROUTES
    // ==========================================

    // Auth Management
    if (path === "/api/auth/me") return handleMe(currentUser);
    if (path === "/api/auth/logout") return handleLogout(context, request);
    if (path === "/api/organizations/join" && method === "POST") return handleJoinOrg(context, currentUser);

    // Entity Management
    // Matches /api/entities/:entity
    const entityMatch = path.match(/^\/api\/entities\/([^/]+)$/);
    if (entityMatch) {
        const entityName = entityMatch[1];
        const id = url.searchParams.get("id");
        const isBulk = url.searchParams.get("bulk") === "1";

        if (method === "GET") {
            if (id) return secureGet(env, entityName, id, currentUser);
            return secureList(env, entityName, url, currentUser);
        }
        if (method === "POST") {
            const body = await request.json();
            if (isBulk) return secureBulkCreate(env, entityName, body.items || [], currentUser);
            return secureCreate(env, entityName, body, currentUser);
        }
        if (method === "PUT" && id) {
            const body = await request.json();
            return secureUpdate(env, entityName, id, body, currentUser);
        }
        if (method === "DELETE" && id) {
            return secureDelete(env, entityName, id, currentUser);
        }
        return new Response("Method Not Allowed", { status: 405 });
    }

    return new Response("Not Found", { status: 404 });
}

// ==========================================
// HELPERS
// ==========================================

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function errorResponse(message, status = 400) {
    return jsonResponse({ error: message }, status);
}

async function getOrgIds(env, user) {
    // Find organizations where user is owner or member
    const { results } = await env.DB.prepare(`
    SELECT id FROM entities 
    WHERE entity_name = 'Organization' 
    AND (
      json_extract(data, '$.owner_email') = ?
      OR json_extract(data, '$.member_emails') LIKE ?
    )
  `).bind(user.email, `%${user.email}%`).all();
    return results.map(r => r.id);
}

// ==========================================
// AUTH HANDLERS
// ==========================================

async function handleLogin(context) {
    const { env, request } = context;
    const { username, password } = await request.json();

    const { results } = await env.DB.prepare(
        "SELECT id, data FROM entities WHERE entity_name = 'User' AND json_extract(data, '$.username') = ?"
    ).bind(username).all();

    if (!results.length) return errorResponse("Invalid credentials", 401);

    const row = results[0];
    const userData = JSON.parse(row.data);
    const hashedInput = await hashPassword(password);

    if (hashedInput !== userData.password_hash) return errorResponse("Invalid credentials", 401);

    // success
    const sessionToken = crypto.randomUUID();
    const sessionData = {
        token: sessionToken,
        user_id: row.id,
        username: userData.username,
        email: userData.email,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    };

    await env.DB.prepare(
        "INSERT INTO entities (id, entity_name, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)"
    ).bind(crypto.randomUUID(), "Session", JSON.stringify(sessionData), new Date().toISOString(), new Date().toISOString()).run();

    return jsonResponse({
        token: sessionToken,
        user: { id: row.id, username: userData.username, email: userData.email, name: userData.name },
        expires_at: sessionData.expires_at,
    });
}

async function handleSignup(context) {
    const { env, request } = context;
    const { username, email, password } = await request.json();

    if (!username || !email || !password) return errorResponse("Missing fields", 400);

    // Check existence
    const { results: existing } = await env.DB.prepare(
        "SELECT id FROM entities WHERE entity_name = 'User' AND (json_extract(data, '$.username') = ? OR json_extract(data, '$.email') = ?)"
    ).bind(username, email).all();

    if (existing.length) return errorResponse("User or email already exists", 409);

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const userData = {
        username,
        email,
        name: username,
        password_hash: await hashPassword(password),
        role: "user",
    };

    await env.DB.prepare(
        "INSERT INTO entities (id, entity_name, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)"
    ).bind(userId, "User", JSON.stringify(userData), now, now).run();

    // Auto login
    const sessionToken = crypto.randomUUID();
    const sessionData = {
        token: sessionToken,
        user_id: userId,
        username: userData.username,
        email: userData.email,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    };

    await env.DB.prepare(
        "INSERT INTO entities (id, entity_name, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)"
    ).bind(crypto.randomUUID(), "Session", JSON.stringify(sessionData), now, now).run();

    return jsonResponse({
        message: "Created",
        token: sessionToken,
        user: { id: userId, username, email, name: username },
        expires_at: sessionData.expires_at,
    }, 201);
}

async function handleLogout(context, request) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
        const token = authHeader.substring(7);
        await context.env.DB.prepare(
            "DELETE FROM entities WHERE entity_name = 'Session' AND json_extract(data, '$.token') = ?"
        ).bind(token).run();
    }
    return jsonResponse({ success: true });
}

function handleMe(user) {
    return jsonResponse(user);
}

async function handleJoinOrg(context, user) {
    const { env, request } = context;
    const { code } = await request.json();

    if (!code) return errorResponse("Join code required", 400);

    // Find organization by join code (BYPASS RLS - system lookup)
    const { results } = await env.DB.prepare(
        "SELECT id, data FROM entities WHERE entity_name = 'Organization' AND json_extract(data, '$.join_code') = ?"
    ).bind(code.toUpperCase().trim()).all();

    if (!results.length) return errorResponse("Invalid join code", 404);

    const row = results[0];
    const orgData = JSON.parse(row.data);

    // Check if member already
    if (orgData.owner_email === user.email || (orgData.member_emails && orgData.member_emails.includes(user.email))) {
        return errorResponse("Already a member", 409);
    }

    // Add user to members
    const updatedMembers = [...(orgData.member_emails || []), user.email];
    const updatedOrgData = { ...orgData, member_emails: updatedMembers };
    const now = new Date().toISOString();

    await env.DB.prepare(
        "UPDATE entities SET data = ?, updated_date = ? WHERE id = ?"
    ).bind(JSON.stringify(updatedOrgData), now, row.id).run();

    return jsonResponse({ id: row.id, ...updatedOrgData, updated_date: now });
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ==========================================
// SECURE DATA ACCESS (RLS ENFORCED)
// ==========================================

async function secureList(env, entityName, url, user) {
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const sort = url.searchParams.get("sort") || "-created_date";
    const whereStr = url.searchParams.get("where");

    // RLS: Organization Listing
    if (entityName === 'Organization') {
        let query = `
            SELECT id, entity_name, data, created_date, updated_date 
            FROM entities 
            WHERE entity_name = 'Organization' 
            AND (
                json_extract(data, '$.owner_email') = ?
                OR json_extract(data, '$.member_emails') LIKE ?
            )
        `;
        const bindings = [user.email, `%${user.email}%`];

        const { results } = await env.DB.prepare(query).bind(...bindings).all();

        // Post-processing same as below...
        // ... (reuse logic or duplicate for now for safety)
        let items = results.map(row => {
            const data = JSON.parse(row.data);
            return { id: row.id, ...data, created_date: row.created_date, updated_date: row.updated_date };
        });

        if (whereStr) {
            const where = JSON.parse(whereStr);
            items = items.filter(item => Object.entries(where).every(([k, v]) => item[k] === v));
        }

        const field = sort.replace(/^-/, "");
        const dir = sort.startsWith("-") ? -1 : 1;
        items.sort((a, b) => (a[field] > b[field] ? dir : (a[field] < b[field] ? -dir : 0)));

        return jsonResponse(items.slice(0, limit));
    }

    // RLS: Standard Entity Listing
    const orgIds = await getOrgIds(env, user);
    let query = `SELECT id, entity_name, data, created_date, updated_date FROM entities WHERE entity_name = ? AND (json_extract(data, '$.user_id') = ?`;
    const bindings = [entityName, user.id];

    if (orgIds.length > 0) {
        const placeholders = orgIds.map(() => '?').join(',');
        query += ` OR json_extract(data, '$.organization_id') IN (${placeholders})`;
        bindings.push(...orgIds);
    }
    query += `)`;

    let { results } = await env.DB.prepare(query).bind(...bindings).all();

    // Process results
    let items = results.map(row => {
        const data = JSON.parse(row.data);
        if (row.entity_name === 'Connection' && data.apiKey) {
            data.apiKey = 'sk-***' + data.apiKey.slice(-4);
        }
        return { id: row.id, ...data, created_date: row.created_date, updated_date: row.updated_date };
    });

    // In-memory filtering (D1 JSON query limit workaround)
    if (whereStr) {
        const where = JSON.parse(whereStr);
        items = items.filter(item => Object.entries(where).every(([k, v]) => item[k] === v));
    }

    // Sorting
    const field = sort.replace(/^-/, "");
    const dir = sort.startsWith("-") ? -1 : 1;
    items.sort((a, b) => (a[field] > b[field] ? dir : (a[field] < b[field] ? -dir : 0)));

    return jsonResponse(items.slice(0, limit));
}

async function secureGet(env, entityName, id, user) {
    // RLS: Organization Get
    if (entityName === 'Organization') {
        const { results } = await env.DB.prepare(`
            SELECT id, data, created_date, updated_date 
            FROM entities 
            WHERE id = ? AND entity_name = 'Organization' 
            AND (
                json_extract(data, '$.owner_email') = ?
                OR json_extract(data, '$.member_emails') LIKE ?
            )
        `).bind(id, user.email, `%${user.email}%`).all();

        if (!results.length) return errorResponse("Not found", 404);

        const row = results[0];
        const data = JSON.parse(row.data);
        return jsonResponse({ id: row.id, ...data, created_date: row.created_date, updated_date: row.updated_date });
    }

    // RLS: Standard Entity Get
    const orgIds = await getOrgIds(env, user);
    let query = `SELECT id, data, created_date, updated_date FROM entities WHERE id = ? AND entity_name = ? AND (json_extract(data, '$.user_id') = ?`;
    const bindings = [id, entityName, user.id];

    if (orgIds.length > 0) {
        const placeholders = orgIds.map(() => '?').join(',');
        query += ` OR json_extract(data, '$.organization_id') IN (${placeholders})`;
        bindings.push(...orgIds);
    }
    query += `)`;

    const { results } = await env.DB.prepare(query).bind(...bindings).all();
    if (!results.length) return errorResponse("Not found", 404);

    const row = results[0];
    const data = JSON.parse(row.data);
    return jsonResponse({ id: row.id, ...data, created_date: row.created_date, updated_date: row.updated_date });
}

async function secureCreate(env, entityName, data, user) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // FORCE user_id ownership
    const securedData = { ...data, user_id: user.id };

    await env.DB.prepare(
        "INSERT INTO entities (id, entity_name, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, entityName, JSON.stringify(securedData), now, now).run();

    return jsonResponse({ id, ...securedData, created_date: now, updated_date: now }, 201);
}

async function secureBulkCreate(env, entityName, items, user) {
    const now = new Date().toISOString();
    const created = [];
    const stmt = env.DB.prepare(
        "INSERT INTO entities (id, entity_name, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)"
    );

    const batch = [];
    for (const item of items) {
        const id = crypto.randomUUID();
        const securedItem = { ...item, user_id: user.id };
        batch.push(stmt.bind(id, entityName, JSON.stringify(securedItem), now, now));
        created.push({ id, ...securedItem, created_date: now, updated_date: now });
    }

    await env.DB.batch(batch);
    return jsonResponse(created, 201);
}

async function secureUpdate(env, entityName, id, updates, user) {
    // 1. Verify access FIRST
    const orgIds = await getOrgIds(env, user);
    let query = `SELECT data FROM entities WHERE id = ? AND entity_name = ? AND (json_extract(data, '$.user_id') = ?`;
    const bindings = [id, entityName, user.id];
    if (orgIds.length > 0) {
        query += ` OR json_extract(data, '$.organization_id') IN (${orgIds.map(() => '?').join(',')})`;
        bindings.push(...orgIds);
    }
    query += `)`;
    const { results } = await env.DB.prepare(query).bind(...bindings).all();

    if (!results.length) return errorResponse("Not found or access denied", 404);

    const existing = JSON.parse(results[0].data);

    // 2. Prevent overwriting secrets if masked
    if (entityName === 'Connection' && updates.apiKey && updates.apiKey.startsWith('sk-***')) {
        updates.apiKey = existing.apiKey;
    }

    // 3. Merge and enforce immutables
    const merged = {
        ...existing,
        ...updates,
        user_id: existing.user_id, // CANNOT change owner
        organization_id: existing.organization_id // Preserving org
    };

    const now = new Date().toISOString();
    await env.DB.prepare(
        "UPDATE entities SET data = ?, updated_date = ? WHERE id = ? AND entity_name = ?"
    ).bind(JSON.stringify(merged), now, id, entityName).run();

    return jsonResponse({ id, ...merged, updated_date: now });
}

async function secureDelete(env, entityName, id, user) {
    // Similar simplified auth check - we can just use the WHERE clause in delete?
    // No, D1 delete with multiple conditions is fine, but constructing it with orgs is annoying.
    // Better to verify existence/access first then delete by ID, or dynamic delete query.
    // Dynamic delete query is safest.

    const orgIds = await getOrgIds(env, user);
    let query = `DELETE FROM entities WHERE id = ? AND entity_name = ? AND (json_extract(data, '$.user_id') = ?`;
    const bindings = [id, entityName, user.id];
    if (orgIds.length > 0) {
        query += ` OR json_extract(data, '$.organization_id') IN (${orgIds.map(() => '?').join(',')})`;
        bindings.push(...orgIds);
    }
    query += `)`;

    await env.DB.prepare(query).bind(...bindings).run();
    return new Response(null, { status: 204 });
}
