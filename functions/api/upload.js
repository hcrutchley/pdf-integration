// functions/api/upload.js
// Uploads a file to R2 via the FILES binding and returns a same-origin URL
// that proxies through /api/files/:key (to avoid CORS from the public R2 domain).

export async function onRequestPost(context) {
  const { env, request } = context;

  // ========== AUTHENTICATION CHECK ==========
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const { results: sessions } = await env.DB.prepare(
    "SELECT id FROM entities WHERE entity_name = 'Session' AND json_extract(data, '$.token') = ?"
  )
    .bind(token)
    .all();

  if (!sessions.length) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }
  // ========== END AUTHENTICATION CHECK ==========

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return new Response("Expected multipart/form-data", { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return new Response("Missing file", { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const key = `uploads/${Date.now()}-${file.name}`;

  await env.FILES.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
    },
  });

  // Return a same-origin URL that will be served by functions/api/files/[key].js
  const file_url = `/api/files/${encodeURIComponent(key)}`;

  return Response.json({ file_url, key }, { status: 201 });
}