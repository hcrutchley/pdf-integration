// functions/api/files/[key].js
// Streams a file from the R2 FILES binding, avoiding CORS issues by
// serving the content from the same origin as the Pages site.

export async function onRequest(context) {
  const { env, params } = context;
  // Key is URL-encoded in the path segment, decode before using with R2
  const rawKey = params.key;
  if (!rawKey) {
    return new Response("Missing key", { status: 400 });
  }

  const key = decodeURIComponent(rawKey);

  const object = await env.FILES.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", object.httpMetadata.contentType || "application/octet-stream");
  // Optional: allow other origins if you ever embed PDFs elsewhere
  headers.set("Access-Control-Allow-Origin", "*");

  return new Response(object.body, { headers });
}


