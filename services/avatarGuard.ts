// 🛡️ AvatarGuard — bloqueia o uso da foto de outra pessoa (host) no perfil.
//
// REGRA DO DONO: se alguém tenta salvar/definir como foto de perfil uma imagem
// IGUAL à de uma host já existente, deve ser BLOQUEADO na hora com a mensagem
// "Não permitido". O NOME continua salvando normalmente — só a FOTO copiada
// não é aplicada. Isso impede criação de conta falsa imitando a host.
//
// Como funciona (100% grátis, sem serviço externo):
//  1. Calcula um hash perceptual (aHash 8x8 = 64 bits) da imagem escolhida;
//  2. Baixa os avatares das contas existentes e calcula o mesmo hash (cache);
//  3. Distância de Hamming <= LIMIAR => considerada cópia => bloqueia.

import { api } from './api';

const HASH_SIZE = 8;               // 8x8 = 64 bits
const HAMMING_THRESHOLD = 8;       // tolerância p/ re-compressão/redimensionamento

const hashCache = new Map<string, string | null>(); // url -> hash

async function computeHashFromSource(src: string | File): Promise<string | null> {
  try {
    let bitmap: ImageBitmap | HTMLImageElement;
    if (typeof src === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('img load fail'));
      });
      bitmap = img;
    } else {
      bitmap = await createImageBitmap(src);
    }
    const w = bitmap instanceof HTMLImageElement ? bitmap.naturalWidth : bitmap.width;
    const h = bitmap instanceof HTMLImageElement ? bitmap.naturalHeight : bitmap.height;
    if (!w || !h) return null;

    // Recorte quadrado central (cover) para ignorar diferenças de proporção
    const side = Math.min(w, h);
    const sx = (w - side) / 2;
    const sy = (h - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = HASH_SIZE;
    canvas.height = HASH_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap as CanvasImageSource, sx, sy, side, side, 0, 0, HASH_SIZE, HASH_SIZE);
    const data = ctx.getImageData(0, 0, HASH_SIZE, HASH_SIZE).data;

    // Média de cinza
    const grays: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      grays.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    const avg = grays.reduce((a, b) => a + b, 0) / grays.length;
    let bits = '';
    for (const g of grays) bits += g >= avg ? '1' : '0';
    return bits;
  } catch {
    return null;
  }
}

function hamming(a: string | null, b: string | null): number {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

/** Hashes de todos os avatares existentes (com cache em memória). */
async function getExistingAvatarHashes(): Promise<string[]> {
  try {
    const users = await api.getAllUsers();
    const urls = (users || [])
      .map(u => u?.avatarUrl)
      .filter((u): u is string => !!u && /^https?:\/\//.test(u));
    const hashes = await Promise.all(urls.map(async url => {
      if (!hashCache.has(url)) {
        hashCache.set(url, await computeHashFromSource(url));
      }
      return hashCache.get(url) || null;
    }));
    return hashes.filter((h): h is string => !!h);
  } catch {
    return [];
  }
}

export interface AvatarCheckResult {
  blocked: boolean;
  reason?: 'copy' | 'error';
}

/**
 * Verifica se o arquivo escolhido é cópia da foto de outra conta.
 * Chamar ANTES de aplicar/salvar o novo avatar.
 */
export async function checkAvatarIsCopy(file: File): Promise<AvatarCheckResult> {
  try {
    const [fileHash, existing] = await Promise.all([
      computeHashFromSource(file),
      getExistingAvatarHashes(),
    ]);
    if (!fileHash) return { blocked: false };
    for (const h of existing) {
      if (hamming(fileHash, h) <= HAMMING_THRESHOLD) {
        return { blocked: true, reason: 'copy' };
      }
    }
    return { blocked: false };
  } catch {
    // Em caso de falha da verificação, NÃO bloqueia (não pune usuário por bug)
    return { blocked: false, reason: 'error' };
  }
}
