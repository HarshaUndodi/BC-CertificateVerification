/**
 * AI Trust Score Engine
 * 
 * Combines multiple security checks into a single 0-100% trust score.
 * Each dimension is weighted based on its importance for fraud detection.
 */

const WEIGHTS = {
  blockchain:   25,  // Does the cert exist on-chain?
  photoHash:    20,  // Does the photo match?
  signature:    20,  // Is the digital signature valid?
  revocation:   15,  // Is the cert still active?
  institution:  10,  // Was issuer a registered institution?
  pdfIntegrity: 10,  // PDF metadata analysis
};

/**
 * Compute a trust score from verification results.
 * 
 * @param {object} params
 * @param {boolean} params.isValid         - Certificate found on blockchain
 * @param {object|null} params.photoCheck  - { authentic: bool|null }
 * @param {object|null} params.sigCheck    - { valid: bool|null }
 * @param {object|null} params.revocation  - { revoked: bool }
 * @param {string} params.institutionName  - Name of issuing institution (empty = unknown)
 * @param {boolean} params.isPdfMode       - Was this verified via PDF upload?
 * @param {number} params.pdfImageCount    - Number of images extracted from PDF
 * @returns {{ score: number, grade: string, label: string, color: string, checks: object[] }}
 */
export function computeTrustScore({
  isValid = false,
  photoCheck = null,
  sigCheck = null,
  revocation = null,
  institutionName = '',
  isPdfMode = false,
  pdfImageCount = 0,
}) {
  const checks = [];
  let totalScore = 0;

  // ── 1. Blockchain Presence (25%) ──
  if (isValid) {
    totalScore += WEIGHTS.blockchain;
    checks.push({ name: 'Blockchain Record', status: 'pass', score: WEIGHTS.blockchain, detail: 'Certificate exists on Ethereum Sepolia' });
  } else {
    checks.push({ name: 'Blockchain Record', status: 'fail', score: 0, detail: 'Certificate NOT found on blockchain' });
  }

  // ── 2. Photo Hash (20%) ──
  if (photoCheck?.authentic === true) {
    totalScore += WEIGHTS.photoHash;
    checks.push({ name: 'Photo Integrity', status: 'pass', score: WEIGHTS.photoHash, detail: photoCheck.reason || 'Photo matches on-chain hash' });
  } else if (photoCheck?.authentic === false) {
    checks.push({ name: 'Photo Integrity', status: 'fail', score: 0, detail: photoCheck.reason || 'Photo hash mismatch — potential tampering' });
  } else {
    // N/A — give partial credit
    const partial = Math.round(WEIGHTS.photoHash * 0.5);
    totalScore += partial;
    checks.push({ name: 'Photo Integrity', status: 'neutral', score: partial, detail: photoCheck?.reason || 'No photo hash available for comparison' });
  }

  // ── 3. Digital Signature (20%) ──
  if (sigCheck?.valid === true) {
    totalScore += WEIGHTS.signature;
    checks.push({ name: 'Digital Signature', status: 'pass', score: WEIGHTS.signature, detail: sigCheck.reason || 'Signature verified' });
  } else if (sigCheck?.valid === false) {
    checks.push({ name: 'Digital Signature', status: 'fail', score: 0, detail: sigCheck.reason || 'Invalid signature' });
  } else {
    const partial = Math.round(WEIGHTS.signature * 0.5);
    totalScore += partial;
    checks.push({ name: 'Digital Signature', status: 'neutral', score: partial, detail: sigCheck?.reason || 'No signature recorded' });
  }

  // ── 4. Revocation Status (15%) ──
  if (revocation?.revoked === false) {
    totalScore += WEIGHTS.revocation;
    checks.push({ name: 'Revocation Status', status: 'pass', score: WEIGHTS.revocation, detail: 'Certificate is active and not revoked' });
  } else if (revocation?.revoked === true) {
    checks.push({ name: 'Revocation Status', status: 'fail', score: 0, detail: `Certificate revoked on ${revocation.revokedAt?.toLocaleDateString() || 'unknown date'}` });
  } else {
    const partial = Math.round(WEIGHTS.revocation * 0.5);
    totalScore += partial;
    checks.push({ name: 'Revocation Status', status: 'neutral', score: partial, detail: 'Revocation status unknown' });
  }

  // ── 5. Institution Registered (10%) ──
  if (institutionName) {
    totalScore += WEIGHTS.institution;
    checks.push({ name: 'Issuing Institution', status: 'pass', score: WEIGHTS.institution, detail: `Issued by registered institution: ${institutionName}` });
  } else {
    checks.push({ name: 'Issuing Institution', status: 'neutral', score: 0, detail: 'Institution not identified in registry' });
  }

  // ── 6. PDF Integrity (10%) ──
  if (isPdfMode) {
    if (pdfImageCount > 0 && photoCheck?.authentic !== false) {
      totalScore += WEIGHTS.pdfIntegrity;
      checks.push({ name: 'PDF Integrity', status: 'pass', score: WEIGHTS.pdfIntegrity, detail: `PDF structure intact — ${pdfImageCount} image(s) analyzed` });
    } else if (photoCheck?.authentic === false) {
      checks.push({ name: 'PDF Integrity', status: 'fail', score: 0, detail: 'PDF has been modified — photo replacement detected' });
    } else {
      const partial = Math.round(WEIGHTS.pdfIntegrity * 0.5);
      totalScore += partial;
      checks.push({ name: 'PDF Integrity', status: 'neutral', score: partial, detail: 'Could not fully analyze PDF structure' });
    }
  } else {
    // Not PDF mode — give full credit (ID-based verification)
    totalScore += WEIGHTS.pdfIntegrity;
    checks.push({ name: 'PDF Integrity', status: 'pass', score: WEIGHTS.pdfIntegrity, detail: 'Direct ID verification — no PDF analysis needed' });
  }

  // ── Compute grade ──
  const score = Math.min(100, Math.max(0, totalScore));
  let grade, label, color;

  if (score >= 95) { grade = 'A+'; label = 'Highly Trusted'; color = '#16a34a'; }
  else if (score >= 85) { grade = 'A'; label = 'Trusted'; color = '#22c55e'; }
  else if (score >= 75) { grade = 'B'; label = 'Moderate Trust'; color = '#eab308'; }
  else if (score >= 60) { grade = 'C'; label = 'Low Trust'; color = '#f97316'; }
  else { grade = 'F'; label = 'Likely Fraud'; color = '#dc2626'; }

  return { score, grade, label, color, checks };
}
