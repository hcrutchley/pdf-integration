import { verifyPassword, createToken } from '../../_utils/auth';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return new Response("Username and password required", { status: 400 });
    }

    const user = await env.DB.prepare("SELECT * FROM users WHERE username = ?")
      .bind(username)
      .first();

    if (!user) {
      return new Response("Invalid credentials", { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      return new Response("Invalid credentials", { status: 401 });
    }

    const token = await createToken(user, env);

    const headers = new Headers();
    headers.append("Set-Cookie", `auth_token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400; Secure`);
    
    return Response.json({ 
      user: { id: user.id, username: user.username } 
    }, { headers });

  } catch (error) {
    console.error("Login error:", error);
    
    if (error.message && error.message.includes("no such table")) {
      return Response.json({ 
        error: "Database not initialized. Please visit /api/setup to initialize the database." 
      }, { status: 500 });
    }
    
    return Response.json({ error: error.message }, { status: 500 });
  }
}
