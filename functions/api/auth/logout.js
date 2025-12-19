// functions/api/auth/logout.js
// Handles POST /api/auth/logout - invalidates session

export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return Response.json({ success: true }); // Already logged out
        }

        const token = authHeader.substring(7);

        // Delete session from database
        await env.DB.prepare(
            "DELETE FROM entities WHERE entity_name = 'Session' AND json_extract(data, '$.token') = ?"
        )
            .bind(token)
            .run();

        return Response.json({ success: true });

    } catch (error) {
        console.error("Logout error:", error);
        return Response.json({ success: true }); // Don't fail logout
    }
}
