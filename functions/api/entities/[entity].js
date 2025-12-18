// functions/api/entities/[entity].js
// This file is currently unused. Routing for /api/entities/* is handled
// by functions/api/entities.js, which parses the entity name from the URL.
// We keep this placeholder so the path exists but doesn't affect routing.

export async function onRequest() {
  return new Response("Not found", { status: 404 });
}