import { getUserFromRequest, hashPassword, verifyPassword } from '../../_utils/auth';

export async function onRequestPut(context) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env);
  
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { newUsername, currentPassword, newPassword } = await request.json();
    
    // Verify current password first
    const dbUser = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.sub).first();
    if (!dbUser) {
      return new Response("User not found", { status: 404 });
    }

    if (currentPassword) {
      const isValid = await verifyPassword(currentPassword, dbUser.password_hash);
      if (!isValid) {
        return new Response("Current password incorrect", { status: 400 });
      }
    } else if (newPassword) {
       return new Response("Current password required to set new password", { status: 400 });
    }

    const updates = [];
    const params = [];

    if (newUsername && newUsername !== dbUser.username) {
      // Check uniqueness
      const existing = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(newUsername).first();
      if (existing) {
        return new Response("Username already taken", { status: 409 });
      }
      updates.push("username = ?");
      params.push(newUsername);
    }

    if (newPassword) {
      const newHash = await hashPassword(newPassword);
      updates.push("password_hash = ?");
      params.push(newHash);
    }

    if (updates.length === 0) {
      return Response.json({ message: "No changes made" });
    }

    params.push(user.sub);
    await env.DB.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...params)
      .run();

    return Response.json({ message: "Profile updated successfully" });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
