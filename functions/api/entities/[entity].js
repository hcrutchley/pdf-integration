// functions/api/entities/[entity].js
// Handles:
//   GET  /api/entities/:entity                (list/filter)
//   GET  /api/entities/:entity?id=...        (get by id)
//   POST /api/entities/:entity               (create)
//   POST /api/entities/:entity?bulk=1        (bulk create)
//   PUT  /api/entities/:entity?id=...        (update)
//   DELETE /api/entities/:entity?id=...      (delete)

export async function onRequest(context) {
  const { env, request, params } = context;
  const entityName = params.entity;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const id = url.searchParams.get("id");
  const isBulk = url.searchParams.get("bulk") === "1";

  if (!entityName) {
    return new Response("Not found", { status: 404 });
  }

  if (method === "GET") {
    if (id) return handleGet(env, entityName, id);
    return handleList(env, entityName, url);
  }

  if (method === "POST") {
    const body = await request.json();
    if (isBulk) {
      const items = body.items || [];
      return handleBulkCreate(env, entityName, items);
    }
    return handleCreate(env, entityName, body);
  }

  if (method === "PUT" && id) {
    const data = await request.json();
    return handleUpdate(env, entityName, id, data);
  }

  if (method === "DELETE" && id) {
    return handleDelete(env, entityName, id);
  }

  return new Response("Method Not Allowed", { status: 405 });
}

async function handleList(env, entityName, url) {
  const sort = url.searchParams.get("sort") || "-created_date";
  const limit = parseInt(url.searchParams.get("limit") || "100", 10);
  const whereStr = url.searchParams.get("where");

  const { results } = await env.DB.prepare(
    "SELECT id, entity_name, data, created_date, updated_date FROM entities WHERE entity_name = ?"
  )
    .bind(entityName)
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

async function handleCreate(env, entityName, data) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO entities (id, entity_name, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(id, entityName, JSON.stringify(data), now, now)
    .run();

  return Response.json(
    { id, ...data, created_date: now, updated_date: now },
    {
      status: 201,
    }
  );
}

async function handleBulkCreate(env, entityName, items) {
  const now = new Date().toISOString();
  const created = [];

  const stmt = env.DB.prepare(
    "INSERT INTO entities (id, entity_name, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)"
  );

  for (const item of items) {
    const id = crypto.randomUUID();
    await stmt.bind(id, entityName, JSON.stringify(item), now, now).run();
    created.push({ id, ...item, created_date: now, updated_date: now });
  }

  return Response.json(created, { status: 201 });
}

async function handleGet(env, entityName, id) {
  const { results } = await env.DB.prepare(
    "SELECT id, data, created_date, updated_date FROM entities WHERE id = ? AND entity_name = ?"
  )
    .bind(id, entityName)
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

async function handleUpdate(env, entityName, id, data) {
  const now = new Date().toISOString();

  // Merge with existing data to support partial updates
  const { results } = await env.DB.prepare(
    "SELECT data FROM entities WHERE id = ? AND entity_name = ?"
  )
    .bind(id, entityName)
    .all();
  const existing = results.length ? JSON.parse(results[0].data) : {};
  const merged = { ...existing, ...data };

  await env.DB.prepare(
    "UPDATE entities SET data = ?, updated_date = ? WHERE id = ? AND entity_name = ?"
  )
    .bind(JSON.stringify(merged), now, id, entityName)
    .run();

  return Response.json({ id, ...merged, updated_date: now });
}

async function handleDelete(env, entityName, id) {
  await env.DB.prepare(
    "DELETE FROM entities WHERE id = ? AND entity_name = ?"
  )
    .bind(id, entityName)
    .run();

  return new Response(null, { status: 204 });
}
