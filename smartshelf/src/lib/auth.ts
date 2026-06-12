import { verifyToken, type JwtPayload } from './jwt';

export function getAuthUser(request: Request): JwtPayload | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  return verifyToken(token);
}
