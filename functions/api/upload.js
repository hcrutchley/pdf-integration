// functions/api/upload.js
// Uploads a file to R2 via the FILES binding and returns a same-origin URL
// that proxies through /api/files/:key (to avoid CORS from the public R2 domain).

export async function onRequestPost(context) {
  const { env, request } = context;

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