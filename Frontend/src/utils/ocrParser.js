import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

/**
 * Universal Certificate Parser — OCR Pipeline
 * 
 * Uses pdfjs-dist to render a PDF page to canvas,
 * then Tesseract.js to extract text via OCR.
 * Finally, regex patterns extract structured fields.
 */

/**
 * Render PDF page 1 to a high-res canvas and run OCR.
 * @param {File} file - The uploaded PDF file
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<{ rawText: string, parsed: object }>}
 */
export async function parseUniversityCertificate(file, onProgress = () => {}) {
  onProgress(5);

  // Step 1: Render PDF to canvas
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 3.0 }); // High-res for better OCR

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;

  onProgress(30);

  // Step 2: Run Tesseract OCR
  const { data } = await Tesseract.recognize(canvas, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress(30 + Math.round(m.progress * 60));
      }
    },
  });

  onProgress(95);

  const rawText = data.text;

  // Step 3: Extract structured fields with regex
  const parsed = extractFields(rawText);

  onProgress(100);

  return { rawText, parsed };
}

/**
 * Extract structured certificate fields from OCR text.
 */
function extractFields(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = lines.join(' ');

  const result = {
    candidateName: null,
    institution: null,
    degree: null,
    course: null,
    date: null,
    grade: null,
    certificateId: null,
    type: 'unknown',
  };

  // ── Certificate ID (our format or generic) ──
  const idMatch = fullText.match(/(?:CERT|GRD|CRS|SKL|ACH|INT)-[A-Z0-9]+/i)
    || fullText.match(/(?:certificate|cert|reg|ref|roll)\s*(?:no|number|id|#)[.:;\s]*([A-Z0-9\-\/]+)/i);
  if (idMatch) result.certificateId = idMatch[1] || idMatch[0];

  // ── Candidate Name (look for patterns like "certify that NAME" or "awarded to NAME") ──
  const namePatterns = [
    /(?:certify\s+that|awarded\s+to|presented\s+to|conferred\s+(?:upon|on)|this\s+is\s+to\s+certify\s+that)\s+(?:Mr\.?|Ms\.?|Mrs\.?|Dr\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
    /(?:name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
  ];
  for (const pat of namePatterns) {
    const m = fullText.match(pat);
    if (m) { result.candidateName = m[1].trim(); break; }
  }

  // ── If no name found, look for the largest / most prominent text (heuristic) ──
  if (!result.candidateName) {
    // Names are often standalone lines with 2-3 capitalized words
    for (const line of lines) {
      if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,3}$/.test(line) && line.length > 5 && line.length < 40) {
        result.candidateName = line;
        break;
      }
    }
  }

  // ── Institution ──
  const instPatterns = [
    /(?:university|institute|college|school|academy)\s+(?:of\s+)?[A-Za-z\s]+/i,
    /(?:issued\s+by|from)[:\s]+(.+?)(?:\.|$)/i,
  ];
  for (const pat of instPatterns) {
    const m = fullText.match(pat);
    if (m) { result.institution = (m[1] || m[0]).trim().substring(0, 80); break; }
  }

  // ── Degree ──
  const degreePatterns = [
    /(?:bachelor|master|doctor|diploma|associate)\s+(?:of\s+)?[A-Za-z\s]+/i,
    /(?:B\.?Tech|M\.?Tech|B\.?E|M\.?E|B\.?Sc|M\.?Sc|B\.?A|M\.?A|B\.?Com|M\.?Com|MBA|PhD|M\.?Phil)/i,
  ];
  for (const pat of degreePatterns) {
    const m = fullText.match(pat);
    if (m) { result.degree = m[0].trim(); break; }
  }

  // ── Course / Subject ──
  const courseMatch = fullText.match(/(?:in|course|program|programme|specialization|branch)[:\s]+([A-Za-z\s,]+?)(?:\.|with|having|$)/i);
  if (courseMatch) result.course = courseMatch[1].trim().substring(0, 60);

  // ── Date ──
  const datePatterns = [
    /(?:date|dated|issued\s+on|awarded\s+on)[:\s]*(\d{1,2}[\s\-\/]\w+[\s\-\/]\d{2,4})/i,
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
    /\d{1,2}[\s\-\/](?:January|February|March|April|May|June|July|August|September|October|November|December)[\s\-\/]\d{4}/i,
    /\d{2}[\-\/]\d{2}[\-\/]\d{4}/,
  ];
  for (const pat of datePatterns) {
    const m = fullText.match(pat);
    if (m) { result.date = (m[1] || m[0]).trim(); break; }
  }

  // ── Grade ──
  const gradeMatch = fullText.match(/(?:grade|class|division|cgpa|gpa|percentage|marks)[:\s]*([A-Za-z0-9\.\+\/\s]+?)(?:\.|,|$)/i);
  if (gradeMatch) result.grade = gradeMatch[1].trim().substring(0, 30);

  // ── Type detection ──
  const lower = fullText.toLowerCase();
  if (lower.includes('degree') || lower.includes('graduation') || lower.includes('convocation')) result.type = 'graduation';
  else if (lower.includes('course') || lower.includes('completion') || lower.includes('training')) result.type = 'course';
  else if (lower.includes('internship') || lower.includes('intern')) result.type = 'internship';
  else if (lower.includes('achievement') || lower.includes('award') || lower.includes('honor')) result.type = 'achievement';
  else if (lower.includes('skill') || lower.includes('certification') || lower.includes('certified')) result.type = 'skill';

  return result;
}
