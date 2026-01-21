// functions/api/entities/[entity]/bulk.js

export async function onRequestPost(context) {
    const { env, params, request } = context;
    const entityName = params.entity;
    const body = await request.json();
    const items = body.items || [];
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