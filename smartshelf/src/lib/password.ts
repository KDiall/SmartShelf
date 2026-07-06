import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTemporaryPassword(): string {
  const segments = [4, 3, 2];
  const parts = segments.map((len) => {
    let result = '';
    for (let i = 0; i < len; i++) {
      result += TEMP_PASSWORD_CHARS.charAt(Math.floor(Math.random() * TEMP_PASSWORD_CHARS.length));
    }
    return result;
  });
  return `RX-${parts[0]}-${parts[1]}${parts[2]}`;
}

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plaintext, hash);
}

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}
