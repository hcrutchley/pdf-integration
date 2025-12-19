import { getUserFromRequest } from '../_utils/auth';

// functions/api/entities.js
// Handles all /api/entities/* routes by parsing the entity name from the path.
//
// Supported patterns:
//   GET  /api/entities/:entity                (list/filter)
//   GET  /api/entities/:entity?id=...        (get by id)
//   POST /api/entities/:entity               (create)
//   POST /api/entities/:entity?bulk=1        (bulk create)
//   PUT  /api/entities/:entity?id=...        (update)
//   DELETE /api/entities/:entity?id=...      (delete)

export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // Auth check
  const user = await getUserFromRequest(request, env);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Path segments: ["", "api", "entities", ":entity", ...]
  const parts = url.pathname.split("/");
  const entityName = parts[3] || "";

  const id = url.searchParams.get("id");
  const isBulk = url.searchParams.get("bulk") === "1";

  if (!entityName) {
    return new Response("Not found", { status: 404 });
  }

  if (method === "GET") {
    if (id) return handleGet(env, entityName, id, user.sub);
    return handleList(env, entityName, url, user.sub);
  }

  if (method === "POST") {
    const body = await request.json();
    if (isBulk) {
      const items = body.items || [];
      return handleBulkCreate(env, entityName, items, user.sub);
    }
    return handleCreate(env, entityName, body, user.sub);
  }

  if (method === "PUT" && id) {
    const data = await request.json();
    return handleUpdate(env, entityName, id, data, user.sub);
  }

  if (method === "DELETE" && id) {
    return handleDelete(env, entityName, id, user.sub);
  }

  return new Response("Method Not Allowed", { status: 405 });
}

async function handleList(env, entityName, url, userId) {
  const sort = url.searchParams.get("sort") || "-created_date";
  const limit = parseInt(url.searchParams.get("limit") || "100", 10);
  const whereStr = url.searchParams.get("where");

  // Filter by user_id
  const { results } = await env.DB.prepare(
    "SELECT id, entity_name, data, created_date, updated_date FROM entities WHERE entity_name = ? AND user_id = ?"
  )
    .bind(entityName, userId)
    .all();

  let items = results.map((row) => {
    const data = JSON.parse(row.data);
    return {
      id: row.id,
      ...data,
      created_date: row.created_date,
      updated_date: row.updated_date,
    };
  });

  if (whereStr) {
    const where = JSON.parse(whereStr);
    items = items.filter((item) =>
      Object.entries(where).every(([k, v]) => item[k] === v)
    );
  }

  const field = sort.replace(/^-/, "");
  const dir = sort.startsWith("-") ? -1 : 1;
  items.sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });

  return Response.json(items.slice(0, limit));
}

async function handleCreate(env, entityName, data, userId) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO entities (id, entity_name, data, created_date, updated_date, user_id) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(id, entityName, JSON.stringify(data), now, now, userId)
    .run();

  return Response.json(
    { id, ...data, created_date: now, updated_date: now },
    {
      status: 201,
    }
  );
}

async function handleBulkCreate(env, entityName, items, userId) {
  const now = new Date().toISOString();
  const created = [];

  const stmt = env.DB.prepare(
    "INSERT INTO entities (id, entity_name, data, created_date, updated_date, user_id) VALUES (?, ?, ?, ?, ?, ?)"
  );

  for (const item of items) {
    const id = crypto.randomUUID();
    await stmt.bind(id, entityName, JSON.stringify(item), now, now, userId).run();
    created.push({ id, ...item, created_date: now, updated_date: now });
  }

  return Response.json(created, { status: 201 });
}

async function handleGet(env, entityName, id, userId) {
  const { results } = await env.DB.prepare(
    "SELECT id, data, created_date, updated_date FROM entities WHERE id = ? AND entity_name = ? AND user_id = ?"
  )
    .bind(id, entityName, userId)
    .all();

  if (!results.length) {
    return new Response("Not found", { status: 404 });
  }

  const row = results[0];
  const data = JSON.parse(row.data);
  return Response.json({
    id: row.id,
    ...data,
    created_date: row.created_date,
    updated_date: row.updated_date,
  });
}

async function handleUpdate(env, entityName, id, data, userId) {
  const now = new Date().toISOString();

  // Merge with existing data to support partial updates
  const { results } = await env.DB.prepare(
    "SELECT data FROM entities WHERE id = ? AND entity_name = ? AND user_id = ?"
  )
    .bind(id, entityName, userId)
    .all();

  if (!results.length) {
    return new Response("Not found", { status: 404 });
  }

  const existing = JSON.parse(results[0].data);
  const merged = { ...existing, ...data };

  await env.DB.prepare(
    "UPDATE entities SET data = ?, updated_date = ? WHERE id = ? AND entity_name = ? AND user_id = ?"
  )
    .bind(JSON.stringify(merged), now, id, entityName, userId)
    .run();

  return Response.json({ id, ...merged, updated_date: now });
}

async function handleDelete(env, entityName, id, userId) {
  const { meta } = await env.DB.prepare(
    "DELETE FROM entities WHERE id = ? AND entity_name = ? AND user_id = ?"
  )
    .bind(id, entityName, userId)
    .run();
  
  if (meta.changes === 0) {
     return new Response("Not found", { status: 404 });
  }

  return new Response(null, { status: 204 });
}
