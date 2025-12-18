// functions/api/upload.js

const PUBLIC_R2_BASE_URL = "https://pub-1da2e60a80524b33b6acd5dc4fc53c9d.r2.dev"; // TODO: change this

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
      contentType: file.type,
    },
  });

  const file_url = `${PUBLIC_R2_BASE_URL}/${key}`;

  return Response.json({ file_url }, { status: 201 });
}