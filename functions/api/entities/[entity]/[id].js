// functions/api/entities/[entity]/[id].js

export async function onRequest(context) {
    const { env, request, params } = context;
    const entityName = params.entity;
    const id = params.id;
    const method = request.method.toUpperCase();
  
    if (method === "PUT") {
      const data = await request.json();
      const now = new Date().toISOString();
  
      await env.DB.prepare(
        "UPDATE entities SET data = ?, updated_date = ? WHERE id = ? AND entity_name = ?"
      )
        .bind(JSON.stringify(data), now, id, entityName)
        .run();
  
      return Response.json({ id, ...data, updated_date: now });
    }
  
    if (method === "DELETE") {
      await env.DB.prepare(
        "DELETE FROM entities WHERE id = ? AND entity_name = ?"
      )
        .bind(id, entityName)
        .run();
  
      return new Response(null, { status: 204 });
    }
  
    if (method === "GET") {
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
  
    return new Response("Method Not Allowed", { status: 405 });
  }