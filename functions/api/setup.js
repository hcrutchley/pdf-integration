import { hashPassword } from '../_utils/auth';

export async function onRequest(context) {
  const { env } = context;
  
  try {
    // Create users table
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `).run();

    // Add user_id column to entities if it doesn't exist
    // SQLite doesn't support IF NOT EXISTS for columns, so we try and catch
    try {
      await env.DB.prepare(`ALTER TABLE entities ADD COLUMN user_id TEXT`).run();
      await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_entities_user ON entities(user_id)`).run();
    } catch (e) {
      // Ignore if column already exists
      console.log("Column user_id likely already exists or other error:", e.message);
    }

    // Check if admin exists
    const admin = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind("admin").first();
    
    if (!admin) {
      const hashedPassword = await hashPassword("12345678");
      const userId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      await env.DB.prepare(
        "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)"
      ).bind(userId, "admin", hashedPassword, now).run();
      
      return Response.json({ message: "Setup complete. Admin user created." });
    }

    return Response.json({ message: "Setup complete. Admin user already exists." });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
