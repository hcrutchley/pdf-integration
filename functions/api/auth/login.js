// functions/api/auth/login.js
// Handles POST /api/auth/login

export async function onRequestPost(context) {
  const { env, request } = context;
  
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return Response.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Look up user in database
    const { results } = await env.DB.prepare(
      "SELECT id, data, created_date FROM entities WHERE entity_name = 'User' AND json_extract(data, '$.username') = ?"
    )
      .bind(username)
      .all();

    if (!results.length) {
      return Response.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const row = results[0];
    const userData = JSON.parse(row.data);
    
    // Hash the provided password and compare
    const hashedInput = await hashPassword(password);
    
    if (hashedInput !== userData.password_hash) {
      return Response.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Generate a session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    
    // Store session in database
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const sessionData = {
      token: sessionToken,
      user_id: row.id,
      username: userData.username,
      email: userData.email,
      expires_at: expiresAt,
    };
    
    await env.DB.prepare(
      "INSERT INTO entities (id, entity_name, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(sessionId, "Session", JSON.stringify(sessionData), now, now)
      .run();

    // Return user info and token
    return Response.json({
      token: sessionToken,
      user: {
        id: row.id,
        username: userData.username,
        email: userData.email || "",
        name: userData.name || userData.username,
      },
      expires_at: expiresAt,
    });
    
  } catch (error) {
    console.error("Login error:", error);
    return Response.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}

// Hash password using SHA-256
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
