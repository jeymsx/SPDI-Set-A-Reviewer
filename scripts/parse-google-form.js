#!/usr/bin/env node
/**
 * parse-google-form.js
 * Converts a saved Google Forms quiz HTML (post-submission graded view) into
 * a questions.js file compatible with this reviewer app.
 *
 * Usage:
 *   node scripts/parse-google-form.js <input.html> <outputVar> [startId]
 *
 * Example:
 *   node scripts/parse-google-form.js "D:/Downloads/P 1.html" pc1QuestionsData 1
 *
 * Redirect stdout to save the output file:
 *   node scripts/parse-google-form.js "D:/Downloads/P 1.html" pc1QuestionsData > public/pc1-questions.js
 */

import { readFileSync } from 'fs';

// ── args ─────────────────────────────────────────────────────────────────────
const [,, inputFile, outputVar, startIdArg] = process.argv;
if (!inputFile || !outputVar) {
  console.error('Usage: node scripts/parse-google-form.js <input.html> <outputVar> [startId]');
  process.exit(1);
}
const startId = parseInt(startIdArg ?? '1', 10);
const html = readFileSync(inputFile, 'utf-8');

// ── helpers ───────────────────────────────────────────────────────────────────
function decodeHtml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/ /g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function firstMatch(src, re) {
  const m = src.match(re);
  return m ? m[1] : null;
}

// ── split into question blocks by data-item-id ────────────────────────────────
// Each question/field block in a Google Form has data-item-id="NNN" on its container.
const blocks = html.split(/data-item-id="(\d+)"/).slice(1);
// blocks = [id, content, id, content, ...]

const questions = [];

for (let i = 0; i < blocks.length; i += 2) {
  const itemId = blocks[i];
  const block  = blocks[i + 1] ?? '';

  // Only process multiple-choice questions (role="radiogroup")
  if (!block.includes('role="radiogroup"')) continue;

  // ── question text ────────────────────────────────────────────────────────
  const questionRaw = firstMatch(block, /<span class="M7eMe">([\s\S]*?)<\/span>/);
  if (!questionRaw) continue;
  const questionText = decodeHtml(questionRaw);

  // Skip admin/routing blocks
  const lower = questionText.toLowerCase();
  if (
    lower.includes('select your course') ||
    lower.includes('first letter') ||
    lower.includes('registered email') ||
    lower.includes('contact information') ||
    lower.includes('i understand') ||
    lower.includes('last name') ||
    lower.includes('surname') ||
    lower.includes('will you be taking') ||
    lower.includes('your response is guaranteed')
  ) continue;

  // ── submitted answer (data-value on the radiogroup) ─────────────────────
  const submittedAnswer = firstMatch(block, /role="radiogroup"[^>]*data-value="([^"]+)"/);

  // ── choices ──────────────────────────────────────────────────────────────
  // Real choice radio buttons have aria-describedby; the Tama/Tamang-sagot
  // section adds a role="radio" WITHOUT aria-describedby showing the correct
  // answer. Exclude the Tama radio from choices but capture it for correctAnswer.
  const choices = [];
  let tamaAnswer = '';  // correct answer from "Tamang sagot" section (wrong submissions)
  const radioRe = /aria-label="([^"]+)"([^>]*)role="radio"/g;
  let m;
  while ((m = radioRe.exec(block)) !== null) {
    const label = decodeHtml(m[1]);
    const attrs  = m[2];
    if (!label) continue;
    if (attrs.includes('aria-describedby')) {
      choices.push(label);
    } else {
      // No aria-describedby → this is the Tamang sagot (correct answer indicator)
      tamaAnswer = label;
    }
  }
  // Fallback: aDTYNe spans scoped inside the radiogroup div
  if (choices.length < 2) {
    const rgStart = block.indexOf('role="radiogroup"');
    if (rgStart !== -1) {
      const divStart = block.lastIndexOf('<div', rgStart);
      let depth = 1, pos = divStart + 4;
      while (pos < block.length && depth > 0) {
        const o = block.indexOf('<div', pos);
        const c = block.indexOf('</div>', pos);
        if (c === -1) break;
        if (o !== -1 && o < c) { depth++; pos = o + 4; }
        else { depth--; pos = c + 6; }
      }
      const spanRe = /<span[^>]+class="aDTYNe snByac kTYmRb OIC90c"[^>]*>([\s\S]*?)<\/span>/g;
      let sm;
      while ((sm = spanRe.exec(block.slice(divStart, pos))) !== null) {
        const text = decodeHtml(sm[1]);
        if (text) choices.push(text);
      }
    }
  }
  if (choices.length < 2) continue;

  // ── Puna / feedback block ────────────────────────────────────────────────
  // <div class="sIQxvc">Correct answer: X<br>Source: Y<br><br>Additional info:<br>- ...</div>
  // Priority: Puna "Correct answer:" > Tamang sagot radio > data-value (only if student was right)
  // If Puna text doesn't match a choice exactly (e.g. "40 m (or 130 ft)" vs "40 m"),
  // fall back to tamaAnswer which is always the exact choice text.
  let correctAnswer = tamaAnswer || (submittedAnswer ? decodeHtml(submittedAnswer) : '');
  let feedback = '';

  const punaMatch = block.match(/<div class="sIQxvc">([\s\S]*?)<\/div>/);
  if (punaMatch) {
    const punaText = decodeHtml(punaMatch[1]);

    // "Correct answer: X" is always the first line when Puna is present
    const caMatch = punaText.match(/^Correct answer:\s*(.+?)(\n|$)/i);
    if (caMatch) {
      const punaAnswer = caMatch[1].trim();
      const subDecoded = submittedAnswer ? decodeHtml(submittedAnswer) : '';
      // Priority: Puna text (if exact match) → tamaAnswer (wrong submission) →
      // submittedAnswer (correct submission, choice matches) → Puna text as-is
      correctAnswer = choices.includes(punaAnswer)   ? punaAnswer
                    : tamaAnswer                      ? tamaAnswer
                    : choices.includes(subDecoded)    ? subDecoded
                    : punaAnswer;
    }

    // Feedback = everything after the "Correct answer:" line
    const afterCa = punaText.replace(/^Correct answer:[^\n]*\n?/i, '').trim();
    if (afterCa) feedback = afterCa;
  }

  // ── image in question ─────────────────────────────────────────────────────
  // Google Forms embeds question images in a div before the choices
  const imgMatch = block.match(/<img[^>]+src="([^"]+)"[^>]*>/);
  let image;
  if (imgMatch) {
    const src = imgMatch[1];
    // Skip Google branding / UI images
    if (!src.includes('gstatic') && !src.includes('branding') && !src.includes('googlelogo')) {
      image = src;
    }
  }

  // ── build question object ─────────────────────────────────────────────────
  const q = {
    id: startId + questions.length,
    question: questionText,
    choices,
    correctAnswer,
  };
  if (feedback) q.feedback = feedback;
  if (image)    q.image = image;

  questions.push(q);
}

// ── output ────────────────────────────────────────────────────────────────────
const output = `window.${outputVar} = ${JSON.stringify(questions, null, 2)};\n`;
process.stdout.write(output);
process.stderr.write(`✓ Parsed ${questions.length} questions (IDs ${startId}–${startId + questions.length - 1})\n`);
