// functions/api/auth/seed.js
// One-time seed endpoint to create the admin user
// POST /api/auth/seed - creates admin user if not exists
// This should be called once after deployment, then disabled or protected

export async function onRequestPost(context) {
    const { env } = context;

    try {
        // Check if admin user already exists
        const { results } = await env.DB.prepare(
            "SELECT id FROM entities WHERE entity_name = 'User' AND json_extract(data, '$.username') = 'admin'"
        )
            .all();

        if (results.length > 0) {
            return Response.json(
                { message: "Admin user already exists", user_id: results[0].id },
                { status: 200 }
            );
        }

        // Hash the default password
        const password = "12345678";
        const passwordHash = await hashPassword(password);

        // Create admin user
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const userData = {
            username: "admin",
            email: "admin@example.com",
            name: "Administrator",
            password_hash: passwordHash,
            role: "admin",
        };

        await env.DB.prepare(
            "INSERT INTO entities (id, entity_name, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)"
        )
            .bind(id, "User", JSON.stringify(userData), now, now)
            .run();

        return Response.json({
            message: "Admin user created successfully",
            user_id: id,
            username: "admin",
            note: "Default password is: 12345678 - please change it after first login!",
        }, { status: 201 });

    } catch (error) {
        console.error("Seed error:", error);
        return Response.json(
            { error: "Failed to seed admin user: " + error.message },
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
