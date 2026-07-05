/**
 * parse-exam.js
 * Parses a saved Google Forms viewscore HTML file into a questions.js data file.
 *
 * Usage:
 *   node scripts/parse-exam.cjs <path-to-html> <output-varname> [asset-slug]
 *
 * Example:
 *   node scripts/parse-exam.cjs "D:/Downloads/SIP.html" sipQuestionsData sip
 *   -> writes to public/sip-questions.js, copies images to public/assets/sip-qN.ext
 *
 * Supports two feedback layouts seen across different form setups:
 *   A) Separate "Correct answer" reveal (own radio display) + separate "Feedback"
 *      heading with plain reference text (e.g. "Reference: ...").
 *   B) A single custom feedback block starting with "Correct answer: X" followed
 *      by "Source: ..." / "Additional info: ...".
 *
 * Grid/matching questions (Google Forms "multiple choice grid", used for
 * diagram label-matching) are detected and skipped — this app's schema is
 * single-choice only, so these have no clean 1:1 mapping and are printed as
 * a warning to add manually if wanted.
 *
 * Output format per question:
 *   { id, question, choices[], correctAnswer, feedback?, image? }
 */

const fs = require('fs');
const path = require('path');

const htmlPath = process.argv[2];
const varName = process.argv[3] || 'questionsData';
const assetSlug = process.argv[4] || varName.replace(/QuestionsData$/, '').replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');

if (!htmlPath) {
  console.error('Usage: node scripts/parse-exam.cjs <html-file> [var-name] [asset-slug]');
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const htmlDir = path.dirname(htmlPath);

// Strip HTML tags, decode entities
function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}
function stripHtml(str) {
  return decodeEntities(
    str
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?p>/gi, '')
      .replace(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
      .replace(/<[^>]+>/g, ''),
  ).replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
}

// ── split HTML into question blocks by "Qr7Oae" list-item wrapper ──────────
const starts = [];
{
  const re = /class="Qr7Oae[^"]*"/g;
  let m;
  while ((m = re.exec(html))) starts.push(m.index);
}
const scriptIdx = html.indexOf('var FB_PUBLIC_LOAD_DATA_');
const endBoundary = scriptIdx > -1 ? html.lastIndexOf('<script', scriptIdx) : html.length;

console.log(`Found ${starts.length} question-list blocks.`);

const questions = [];
const pendingImages = []; // { qId, rawSrc } — resolved to files on disk after parsing
let skippedGrid = 0;
let skippedNonExam = 0;

const nonExamKeywords = [
  'select your course', 'first letter of your last name', 'contact information',
  'full name', 'school/university', 'proceed to the test', 'year level',
  'email address', 'phone number', 'student number', 'registered email',
  'i understand', 'last name', 'surname', 'will you be taking',
  'your response is guaranteed',
];

for (let bi = 0; bi < starts.length; bi++) {
  const s = starts[bi];
  const e = (bi + 1 < starts.length) ? starts[bi + 1] : endBoundary;
  const block = html.slice(s, e);

  // Grid/matching questions have multiple rows, each its own radiogroup.
  const rowCount = (block.match(/data-row-index="\d+"/g) || []).length;
  if (rowCount > 0) { skippedGrid++; continue; }

  if (!block.includes('role="radiogroup"')) continue;

  const qMatch = block.match(/class="M7eMe">([\s\S]*?)<\/span>/);
  if (!qMatch) continue;
  const questionText = stripHtml(qMatch[1]);
  if (!questionText) continue;

  const lower = questionText.toLowerCase();
  if (nonExamKeywords.some(kw => lower.includes(kw))) { skippedNonExam++; continue; }

  // ── choices + user's selection (bounded to the radiogroup, before the
  //    hidden <input> that follows it, so we don't bleed into "Correct answer") ──
  const radiogroupIdx = block.indexOf('role="radiogroup"');
  const hiddenInputMatch = block.slice(radiogroupIdx).match(/<input type="hidden" name="entry\.\d+" jsname="L9xHkb" value="([^"]*)">/);
  const choicesEnd = radiogroupIdx + (hiddenInputMatch ? hiddenInputMatch.index : block.length - radiogroupIdx);
  const choicesSection = block.slice(radiogroupIdx, choicesEnd);
  const userAnswer = hiddenInputMatch ? decodeEntities(hiddenInputMatch[1]) : '';

  const choiceRe = /aria-label="([^"]+)" aria-disabled="true" data-value="[^"]+" aria-describedby="[^"]+" role="radio" aria-checked="([^"]+)"/g;
  const choices = [];
  let selectedChoice = '';
  let cm;
  while ((cm = choiceRe.exec(choicesSection))) {
    const text = decodeEntities(cm[1]);
    choices.push(text);
    if (cm[2] === 'true') selectedChoice = text;
  }
  if (choices.length < 2) continue;
  const uniqueChoices = [...new Set(choices)];

  // ── correct answer + feedback ───────────────────────────────────────────
  // Layout A: separate "Correct answer" reveal block (only present when the
  // student got it wrong) — its own radio display with aria-checked="true".
  let correctAnswer = '';
  let feedback = '';
  const correctHeadingIdx = block.indexOf('>Correct answer</div>');
  if (correctHeadingIdx !== -1) {
    const after = block.slice(correctHeadingIdx);
    const caMatch = after.match(/data-value="([^"]*)"[^>]*role="radio" aria-checked="true"/);
    correctAnswer = caMatch ? decodeEntities(caMatch[1]) : selectedChoice;
  } else {
    // No reveal block => the student's own selection was correct.
    correctAnswer = selectedChoice;
  }

  const fbMatch = block.match(/class="sIQxvc">([\s\S]*?)<\/div>/);
  if (fbMatch) {
    const fbText = stripHtml(fbMatch[1]);
    // Layout B: feedback text itself leads with "Correct answer: X" — split it out.
    const caLineMatch = fbText.match(/^Correct answer:\s*(.+?)(\n|$)/i);
    if (caLineMatch) {
      const punaAnswer = caLineMatch[1].trim();
      if (correctHeadingIdx === -1) {
        // Layout A already gave us a reliable answer (selectedChoice, since
        // no reveal block means the student was right); only defer to the
        // feedback-text answer if that lookup somehow failed.
      } else if (uniqueChoices.includes(punaAnswer)) {
        correctAnswer = punaAnswer;
      }
      feedback = fbText.replace(/^Correct answer:[^\n]*\n?/i, '').trim();
    } else {
      feedback = fbText;
    }
  }

  // ── image (optional) — appears before the radiogroup, ignore Google chrome ──
  const imgMatch = block.match(/<img[^>]+src="([^"]+)"/);
  let rawImageSrc = null;
  if (imgMatch) {
    const src = imgMatch[1];
    if (!src.includes('gstatic') && !src.includes('googlelogo') && !src.includes('branding')) {
      rawImageSrc = src;
    }
  }

  const q = {
    id: questions.length + 1,
    question: questionText,
    choices: uniqueChoices,
    correctAnswer: correctAnswer || uniqueChoices[0],
  };
  if (feedback) q.feedback = feedback;
  questions.push(q);
  if (rawImageSrc) pendingImages.push({ qId: q.id, rawImageSrc });
}

console.log(`✓ Parsed ${questions.length} exam questions.`);
if (skippedGrid) console.log(`  Skipped ${skippedGrid} grid/matching question(s) — add manually if needed (unsupported schema).`);
if (skippedNonExam) console.log(`  Skipped ${skippedNonExam} non-exam block(s) (course/consent/contact-info fields).`);
const missingCorrect = questions.filter(q => !q.correctAnswer || !q.choices.includes(q.correctAnswer)).length;
if (missingCorrect) console.log(`  ⚠ ${missingCorrect} question(s) have a correctAnswer not present in choices — review these.`);

// ── resolve + copy images ────────────────────────────────────────────────────
const publicDir = fs.existsSync(path.join(__dirname, '..', 'public'))
  ? path.join(__dirname, '..', 'public')
  : path.join(process.cwd(), 'public');
const assetsDir = path.join(publicDir, 'assets');
if (pendingImages.length && !fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

let copiedCount = 0;
for (const { qId, rawImageSrc } of pendingImages) {
  // rawImageSrc looks like "./My Form_files/unnamed(3).jpg" with HTML entities
  // (e.g. &#39;) in the folder name — decode entities, not URI escapes, then
  // resolve relative to the HTML file's own directory ("_files" sibling folder).
  const decodedSrc = decodeEntities(rawImageSrc.replace(/^\.\//, ''));
  const srcPath = path.join(htmlDir, decodedSrc);
  if (!fs.existsSync(srcPath)) {
    console.warn(`  ⚠ Q${qId}: image file not found on disk: ${srcPath}`);
    continue;
  }
  const ext = path.extname(srcPath) || '.jpg';
  const destName = `${assetSlug}-q${qId}${ext}`;
  fs.copyFileSync(srcPath, path.join(assetsDir, destName));
  const q = questions.find(q => q.id === qId);
  if (q) q.image = `/assets/${destName}`;
  copiedCount++;
}
if (copiedCount) console.log(`  Copied ${copiedCount} image(s) to ${assetsDir}`);

// ── output ───────────────────────────────────────────────────────────────────
const outputSlug = varName
  .replace(/Data$/, '')
  .replace(/([A-Z])/g, '-$1')
  .toLowerCase()
  .replace(/^-/, '');
const outputPath = path.join(publicDir, `${outputSlug}.js`);
const output = `window.${varName} = ${JSON.stringify(questions, null, 2)};\n`;
fs.writeFileSync(outputPath, output, 'utf8');

console.log(`✓ Written to ${outputPath}`);
console.log(`  Variable name: window.${varName}`);
console.log(`  Total questions: ${questions.length}`);
const withFeedback = questions.filter(q => q.feedback).length;
const withImage = questions.filter(q => q.image).length;
console.log(`  With feedback: ${withFeedback}`);
console.log(`  With image: ${withImage}`);
