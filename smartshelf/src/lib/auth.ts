import { verifyToken, type JwtPayload } from './jwt';

export async function getAuthUser(request: Request): Promise<JwtPayload | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  return verifyToken(token);
}
