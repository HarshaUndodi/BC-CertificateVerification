/**
 * Browser-side Perceptual Hash (aHash) for tamper detection.
 *
 * How it works:
 * 1. Resize image to 8×8 using a hidden canvas
 * 2. Convert to grayscale
 * 3. Compute the mean pixel value
 * 4. Each pixel above the mean → 1, below → 0  →  64-bit hash
 * 5. Return as a 0x-prefixed hex string (bytes32-compatible)
 *
 * The same photo resized or slightly re-compressed produces the same hash.
 * A different photo produces a completely different hash.
 */

const HASH_SIZE = 8; // 8×8 = 64 bits

/**
 * Compute perceptual hash from a base64 data-URL or an image URL.
 * @param {string} imageSrc  Base64 data-URL or http(s) URL
 * @returns {Promise<string>} 0x-prefixed 32-byte hex string (right-padded)
 */
export async function computePhotoHash(imageSrc) {
  if (!imageSrc) return '0x' + '0'.repeat(64);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = HASH_SIZE;
        canvas.height = HASH_SIZE;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, HASH_SIZE, HASH_SIZE);

        const pixels = ctx.getImageData(0, 0, HASH_SIZE, HASH_SIZE).data;

        // Convert to grayscale
        const gray = [];
        for (let i = 0; i < pixels.length; i += 4) {
          gray.push(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
        }

        // Mean
        const mean = gray.reduce((a, b) => a + b, 0) / gray.length;

        // Build hash bits → hex
        let bits = '';
        for (const g of gray) {
          bits += g >= mean ? '1' : '0';
        }

        // 64 bits → 16 hex chars → pad to 64 hex chars for bytes32
        let hex = '';
        for (let i = 0; i < bits.length; i += 4) {
          hex += parseInt(bits.substring(i, i + 4), 2).toString(16);
        }
        // Pad to 64 hex characters (32 bytes)
        hex = hex.padEnd(64, '0');

        resolve('0x' + hex);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for hashing'));
    img.src = imageSrc;
  });
}

/**
 * Compare two photo hashes. Returns the Hamming distance (0 = identical).
 * A distance < 5 is considered "same photo".
 */
export function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2) return 64;
  const a = BigInt(hash1);
  const b = BigInt(hash2);
  let xor = a ^ b;
  let dist = 0;
  while (xor > 0n) {
    dist += Number(xor & 1n);
    xor >>= 1n;
  }
  return dist;
}

/**
 * Check if two hashes represent the same photo.
 * Threshold of 10 allows for minor recompression artifacts.
 */
export function isPhotoAuthentic(onChainHash, computedHash, threshold = 10) {
  if (onChainHash === '0x' + '0'.repeat(64)) return { authentic: true, reason: 'No photo hash stored' };
  const dist = hammingDistance(onChainHash, computedHash);
  return {
    authentic: dist <= threshold,
    distance: dist,
    reason: dist <= threshold
      ? `Photo authentic (distance: ${dist})`
      : `PHOTO TAMPERED — hash mismatch (distance: ${dist})`,
  };
}
