import { getUserFromRequest } from '../../_utils/auth';

export async function onRequestGet(context) {
  const { request, env } = context;
  
  const user = await getUserFromRequest(request, env);
  
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  return Response.json({ user });
}
