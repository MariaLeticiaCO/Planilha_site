import crypto from 'node:crypto';

/**
 * Hash de senha no MESMO formato do PasswordHasher<Usuario> do ASP.NET Core (Identity V3):
 *   0x01 | PRF (uint32 BE) | iterações (uint32 BE) | tamanho do sal (uint32 BE) | sal | subchave
 * Assim, usuários criados pela versão .NET continuam entrando, e vice-versa.
 * Padrão do .NET 8: PBKDF2-HMAC-SHA512, 100.000 iterações, sal de 16 bytes, subchave de 32 bytes.
 */
const PRF: Record<number, string> = { 0: 'sha1', 1: 'sha256', 2: 'sha512' };

export function hashSenha(senha: string): string {
  const sal = crypto.randomBytes(16);
  const iteracoes = 100_000;
  const subchave = crypto.pbkdf2Sync(senha, sal, iteracoes, 32, 'sha512');
  const saida = Buffer.alloc(13 + sal.length + subchave.length);
  saida[0] = 0x01;
  saida.writeUInt32BE(2, 1);
  saida.writeUInt32BE(iteracoes, 5);
  saida.writeUInt32BE(sal.length, 9);
  sal.copy(saida, 13);
  subchave.copy(saida, 13 + sal.length);
  return saida.toString('base64');
}

export function verificarSenha(senha: string, hash: string): boolean {
  try {
    const b = Buffer.from(hash, 'base64');
    if (b[0] === 0x01) {
      const prf = PRF[b.readUInt32BE(1)];
      const iteracoes = b.readUInt32BE(5);
      const tamSal = b.readUInt32BE(9);
      if (!prf || tamSal < 16) return false;
      const sal = b.subarray(13, 13 + tamSal);
      const esperado = b.subarray(13 + tamSal);
      if (esperado.length < 16) return false;
      const calculado = crypto.pbkdf2Sync(senha, sal, iteracoes, esperado.length, prf);
      return crypto.timingSafeEqual(calculado, esperado);
    }
    if (b[0] === 0x00 && b.length === 49) {
      // Identity V2: PBKDF2-HMAC-SHA1, 1.000 iterações
      const calculado = crypto.pbkdf2Sync(senha, b.subarray(1, 17), 1000, 32, 'sha1');
      return crypto.timingSafeEqual(calculado, b.subarray(17));
    }
    return false;
  } catch {
    return false;
  }
}

/** Token para link de recuperação/convite (vai no e-mail; no banco fica só o hash). */
export function gerarToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/** SHA-256 em hexadecimal maiúsculo (igual ao Convert.ToHexString do .NET). */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex').toUpperCase();
}

export function iguaisTempoConstante(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
