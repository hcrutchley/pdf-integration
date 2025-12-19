// functions/api/auth/me.js
// Handles GET /api/auth/me - returns current user from session token

export async function onRequestGet(context) {
    const { env, request } = context;

    try {
        // Get token from Authorization header
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return Response.json(
                { error: "No authorization token provided" },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7); // Remove "Bearer " prefix

        // Look up session
        const { results } = await env.DB.prepare(
            "SELECT id, data FROM entities WHERE entity_name = 'Session' AND json_extract(data, '$.token') = ?"
        )
            .bind(token)
            .all();

        if (!results.length) {
            return Response.json(
                { error: "Invalid or expired session" },
                { status: 401 }
            );
        }

        const sessionData = JSON.parse(results[0].data);

        // Check if session is expired
        if (new Date(sessionData.expires_at) < new Date()) {
            // Delete expired session
            await env.DB.prepare(
                "DELETE FROM entities WHERE id = ?"
            )
                .bind(results[0].id)
                .run();

            return Response.json(
                { error: "Session expired" },
                { status: 401 }
            );
        }

        // Return user info
        return Response.json({
            id: sessionData.user_id,
            username: sessionData.username,
            email: sessionData.email || "",
            name: sessionData.username,
        });

    } catch (error) {
        console.error("Auth check error:", error);
        return Response.json(
            { error: "Authentication check failed" },
            { status: 500 }
        );
    }
}
