// functions/api/auth/signup.js
// Handles POST /api/auth/signup - register new users

export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        const { username, email, password } = await request.json();

        // Validate required fields
        if (!username || !email || !password) {
            return Response.json(
                { error: "Username, email, and password are required" },
                { status: 400 }
            );
        }

        // Validate password length
        if (password.length < 8) {
            return Response.json(
                { error: "Password must be at least 8 characters" },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return Response.json(
                { error: "Invalid email format" },
                { status: 400 }
            );
        }

        // Check if username already exists
        const { results: existingUsername } = await env.DB.prepare(
            "SELECT id FROM entities WHERE entity_name = 'User' AND json_extract(data, '$.username') = ?"
        )
            .bind(username)
            .all();

        if (existingUsername.length > 0) {
            return Response.json(
                { error: "Username already taken" },
                { status: 409 }
            );
        }

        // Check if email already exists
        const { results: existingEmail } = await env.DB.prepare(
            "SELECT id FROM entities WHERE entity_name = 'User' AND json_extract(data, '$.email') = ?"
        )
            .bind(email)
            .all();

        if (existingEmail.length > 0) {
            return Response.json(
                { error: "Email already registered" },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const userId = crypto.randomUUID();
        const now = new Date().toISOString();
        const userData = {
            username,
            email,
            name: username,
            password_hash: passwordHash,
            role: "user",
        };

        await env.DB.prepare(
            "INSERT INTO entities (id, entity_name, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)"
        )
            .bind(userId, "User", JSON.stringify(userData), now, now)
            .run();

        // Create session token (auto-login after signup)
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        const sessionId = crypto.randomUUID();
        const sessionData = {
            token: sessionToken,
            user_id: userId,
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
            message: "Account created successfully",
            token: sessionToken,
            user: {
                id: userId,
                username: userData.username,
                email: userData.email,
                name: userData.name,
            },
            expires_at: expiresAt,
        }, { status: 201 });

    } catch (error) {
        console.error("Signup error:", error);
        return Response.json(
            { error: "Signup failed: " + error.message },
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
