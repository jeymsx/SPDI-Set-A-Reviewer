/**
 * parse-exam.js
 * Parses a saved Google Forms viewscore HTML file into a questions.js data file.
 *
 * Usage:
 *   node scripts/parse-exam.js <path-to-html> <output-varname>
 *
 * Example:
 *   node scripts/parse-exam.js "D:/Downloads/SIP.html" sipQuestionsData
 *   -> writes to public/sip-questions.js
 *
 * Output format per question:
 *   { id, question, choices[], correctAnswer, feedback? }
 */

const fs = require('fs');
const path = require('path');

const htmlPath = process.argv[2];
const varName = process.argv[3] || 'questionsData';

if (!htmlPath) {
  console.error('Usage: node scripts/parse-exam.js <html-file> [var-name]');
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');

// Strip HTML tags, decode entities
function stripHtml(str) {
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

// Split HTML into question blocks by Points-received markers
// Pattern: each scored question has id="i.points.{itemId}" with score text
const pointsPattern = /id="i\.points\.(\d+)" role="note" aria-label="Points received for this question\.">([\d]+\/[\d]+)<\/div>/g;
const pointsMatches = [...html.matchAll(pointsPattern)];

console.log(`Found ${pointsMatches.length} scored question blocks.`);

const questions = [];
let idCounter = 1;

for (let qi = 0; qi < pointsMatches.length; qi++) {
  const match = pointsMatches[qi];
  const itemId = match[1];
  const scoreText = match[2]; // e.g. "1/1" or "0/1"
  const matchIdx = match.index;

  // ---- Find question heading text ----
  // Heading has aria-describedby containing "i.points.{itemId}"
  const headingPattern = new RegExp(
    `id="[^"]*" role="heading" aria-level="3" aria-describedby="[^"]*i\\.points\\.${itemId}[^"]*"><span class="[^"]*">([\\s\\S]*?)<\/span>`
  );
  const headingMatch = html.match(headingPattern);
  let questionText = '';
  if (headingMatch) {
    questionText = stripHtml(headingMatch[1]).replace(/\s+/g, ' ').trim();
  }

  // ---- Find the radiogroup for this question ----
  // radiogroup aria-describedby contains "i.points.{itemId}"
  const radiogroupPattern = new RegExp(
    `role="radiogroup"[^>]*aria-describedby="[^"]*i\\.points\\.${itemId}[^"]*"[^>]*data-value="([^"]*)"[\\s\\S]*?<\\/div>\\s*<\\/div>\\s*<\\/div>\\s*<div jsname="XbIQze"`
  );

  // Use a window of HTML around the match to be efficient
  const windowStart = Math.max(0, matchIdx - 10000);
  const windowEnd = Math.min(html.length, matchIdx + 15000);
  const block = html.substring(windowStart, windowEnd);

  // ---- Check for image in the question block ----
  // Search only in a tight window around this question's heading (matchIdx ± small offset)
  // to avoid bleeding into neighboring questions that share the same block window.
  let questionImage = null;
  const localOffset = matchIdx - windowStart; // offset of points marker within block
  const imgSearchSlice = block.substring(Math.max(0, localOffset - 3000), localOffset + 3000);
  const imgMatch = imgSearchSlice.match(/src="(\.[^"]*\.(png|jpg|jpeg|gif|webp))"/i);
  if (imgMatch) {
    questionImage = imgMatch[1];
  }

  // Find the radiogroup in this block
  const rgPattern = new RegExp(
    `role="radiogroup"[^>]*aria-describedby="[^"]*i\\.points\\.${itemId}[^"]*"[^>]*data-value="([^"]*)"`,
    'i'
  );
  const rgMatch = block.match(rgPattern);

  let selectedAnswer = '';
  if (rgMatch) {
    selectedAnswer = rgMatch[1]
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  // Find all radio choices in this block
  // Each: role="radio" aria-label="{text}" ... aria-checked="{bool}"
  const radioPattern = /role="radio" aria-checked="[^"]+" aria-posinset="\d+" aria-setsize="(\d+)"/g;
  // Better approach: find the radiogroup element and extract choices from it
  // The radiogroup is identified by aria-describedby containing i.points.{itemId}
  const rgStartIdx = block.indexOf(`i.points.${itemId}`);
  if (rgStartIdx < 0) {
    console.warn(`  ⚠ Could not find radiogroup for item ${itemId}`);
    continue;
  }

  // Find the start of the radiogroup div (role="radiogroup")
  // The radiogroup comes AFTER the heading/points div in the HTML
  const rgTagStart = block.indexOf('role="radiogroup"', rgStartIdx);
  // Find end: look for the closing structure (the next jsname="XbIQze" after the choices)
  const rgEndSearch = block.indexOf('jsname="XbIQze"', rgTagStart > 0 ? rgTagStart : rgStartIdx);
  const rgBlock = block.substring(rgTagStart > 0 ? rgTagStart : rgStartIdx, rgEndSearch > 0 ? rgEndSearch : (rgTagStart > 0 ? rgTagStart : rgStartIdx) + 8000);

  // Extract aria-label from each role="radio" element
  const choicePattern = /aria-label="([^"]+)" aria-disabled="true" data-value="[^"]+" aria-describedby="[^"]+" role="radio" aria-checked="([^"]+)"/g;
  const choiceMatches = [...rgBlock.matchAll(choicePattern)];

  function decodeEntities(s) {
    return s
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ');
  }

  let choices = choiceMatches.map(m => ({
    text: decodeEntities(m[1]),
    checked: m[2] === 'true'
  }));

  if (choices.length < 2) {
    // Skip non-exam items (e.g. course selection, consent)
    continue;
  }

  // ---- Extract feedback (sIQxvc) — present for most questions ----
  let correctAnswer = '';
  let feedback = '';

  // Bound feedback search to within this question block only.
  // The next question starts at the next i.points.{nextItemId} occurrence.
  const searchFrom = rgTagStart > 0 ? rgTagStart : rgStartIdx;
  const nextItemId = qi + 1 < pointsMatches.length ? pointsMatches[qi + 1][1] : null;
  const nextBlockIdx = nextItemId ? html.indexOf(`i.points.${nextItemId}`, searchFrom + windowStart) - windowStart : searchFrom + 15000;
  const feedbackSearchEnd = nextBlockIdx > 0 ? Math.min(nextBlockIdx, searchFrom + 15000) : searchFrom + 15000;

  const feedbackBlockIdx = block.indexOf('class="sIQxvc"', searchFrom);
  if (feedbackBlockIdx > 0 && feedbackBlockIdx < feedbackSearchEnd) {
    const feedbackBlock = block.substring(feedbackBlockIdx, feedbackBlockIdx + 3000);
    const feedbackTextMatch = feedbackBlock.match(/class="sIQxvc">([\s\S]*?)<div class="YDsNwc"/);
    if (feedbackTextMatch) {
      const rawFeedback = feedbackTextMatch[1];

      // Parse "Correct answer: X" (everything up to first <br>)
      const correctAnswerMatch = rawFeedback.match(/Correct answer:\s*([^<]+)/i);
      if (correctAnswerMatch) {
        correctAnswer = decodeEntities(correctAnswerMatch[1].trim());
      }

      // Parse "Source: X"
      const sourceMatch = rawFeedback.match(/Source:\s*<a[^>]*>([^<]+)<\/a>/i)
        || rawFeedback.match(/Source:\s*([^<\n]+)/i);
      const source = sourceMatch ? sourceMatch[1].trim() : '';

      // Parse "Additional info:" section
      const additionalInfoMatch = rawFeedback.match(/Additional info:\s*(?:<br\s*\/?>)?([\s\S]*?)(?=<\/div>|$)/i);
      let additionalInfo = '';
      if (additionalInfoMatch) {
        additionalInfo = stripHtml(additionalInfoMatch[1]).replace(/\n\s*\n/g, '\n').trim();
      }

      // Build feedback string from source + additional info
      const parts = [];
      if (source) parts.push(`Source: ${source}`);
      if (additionalInfo) parts.push(additionalInfo);
      feedback = parts.join('\n').trim();
    }
  }

  // Fallback correct answer from checked radio if not found in feedback
  if (!correctAnswer) {
    if (scoreText === '1/1') {
      const checkedChoice = choices.find(c => c.checked);
      correctAnswer = checkedChoice ? checkedChoice.text : selectedAnswer;
    } else {
      console.warn(`  ⚠ Could not determine correct answer for Q${idCounter}: "${questionText.substring(0, 60)}"`);
      correctAnswer = choices[0]?.text || '';
    }
  }

  // Skip items that look like metadata (too few choices or non-exam content)
  const nonExamKeywords = [
    'Please select your course',
    'first letter of your last name',
    'contact information',
    'Full Name',
    'School/University',
    'proceed to the test',
    'Year Level',
    'email address',
    'phone number',
    'student number',
  ];
  const isNonExam = nonExamKeywords.some(kw =>
    questionText.toLowerCase().includes(kw.toLowerCase())
  );
  if (isNonExam) continue;

  // Clean up choice texts
  const choiceTexts = choices.map(c => c.text);

  // Deduplicate choices (sometimes same choice appears twice)
  const uniqueChoices = [...new Set(choiceTexts)];

  const q = {
    id: idCounter++,
    question: questionText,
    choices: uniqueChoices,
    correctAnswer: correctAnswer,
  };

  if (feedback) {
    q.feedback = feedback;
  }

  if (questionImage) {
    // Store raw src — user should remap to the correct /assets/ path manually or via flag
    q._rawImageSrc = questionImage;
    console.warn(`  ⚠ Q${q.id} has an image: ${questionImage} — set q.image manually after copying asset`);
  }

  questions.push(q);
  console.log(`  Q${q.id}: "${questionText.substring(0, 60)}..." → "${correctAnswer.substring(0, 40)}"`);
}

console.log(`\n✓ Parsed ${questions.length} exam questions.`);

// Determine output filename: convert camelCase varName to kebab-case, strip "Data" suffix
const outputSlug = varName
  .replace(/Data$/, '')
  .replace(/([A-Z])/g, '-$1')
  .toLowerCase()
  .replace(/^-/, '');

// Handle if running from scripts/ dir or from project root
const publicDir = fs.existsSync(path.join(__dirname, '..', 'public'))
  ? path.join(__dirname, '..', 'public')
  : path.join(process.cwd(), 'public');
const outputPath = path.join(publicDir, `${outputSlug}.js`);

const output = `window.${varName} = ${JSON.stringify(questions, null, 2)};\n`;

fs.writeFileSync(outputPath, output, 'utf8');
console.log(`✓ Written to ${outputPath}`);
console.log(`  Variable name: window.${varName}`);
console.log(`  Total questions: ${questions.length}`);
const withFeedback = questions.filter(q => q.feedback).length;
if (withFeedback > 0) {
  console.log(`  Questions with feedback: ${withFeedback}`);
}
