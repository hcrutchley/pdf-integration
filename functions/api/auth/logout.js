export async function onRequestPost(context) {
  const headers = new Headers();
  headers.append("Set-Cookie", "auth_token=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0; Secure");
  
  return Response.json({ message: "Logged out" }, { headers });
}
