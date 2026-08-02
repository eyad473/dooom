/**
 * بوت تعلم الإنجليزي - Telegram + Cloudflare Worker + D1 + Claude
 * © أبو عمر البيك
 * مستوى مستهدف: A2 → immersion
 *
 * Bindings: DB (D1)
 * Secrets: TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, COHERE_API_KEY, WEBHOOK_SECRET
 */

const COACH_PROMPT = `إنت مدرّب لغة إنجليزية لمتعلم مستواه A2 وبيحب أسلوب الانغماس (immersion).
لو كتب لك بالإنجليزي: صحح أخطاءه بلطف (وضح الخطأ بجملة وحدة بالعربي)، وبعدين رد عليه بالإنجليزي بجمل بسيطة تناسب مستواه A2-B1.
لو كتب لك بالعربي وسأل عن كلمة أو قاعدة: جاوبه بالعربي بإيجاز مع مثال إنجليزي.
خلي ردودك قصيرة ومباشرة، بدون حشو، مناسبة لموبايل.`;

const WORD_GEN_PROMPT = `إنت مولّد كلمات إنجليزية لمتعلم مستوى A2 يتبع أسلوب Oxford 3000.
رجّع فقط JSON بدون أي نص إضافي وبدون Markdown، بهاد الشكل بالضبط:
{"word": "...", "meaning_ar": "...", "example_en": "..."}
اختار كلمة إنجليزية شائعة ومفيدة يوميًا (اسم أو فعل أو صفة)، معناها بالعربي، وجملة مثال بسيطة بمستوى A2.`;

const ROLEPLAY_SCENARIOS = {
  interview: {
    label: '💼 مقابلة عمل',
    system: `إنت مسؤول توظيف بيقابل متعلم لوظيفة عادية. احكي إنجليزي بس طول المحادثة، بجمل بسيطة تناسب مستوى A2-B1. اسأله أسئلة مقابلة حقيقية وحدة وحدة (مش كلها مرة وحدة)، وانتظر رده. لو غلط بجملة، صحح باختصار بجملة عربي وحدة بس بعدين كمّل بالإنجليزي.`,
  },
  restaurant: {
    label: '🍽️ طلب بمطعم',
    system: `إنت نادل بمطعم. احكي إنجليزي بس، ساعد المتعلم يطلب أكل، اسأله أسئلة طبيعية زي نادل حقيقي (شو بدك تشرب، أي حجم، إلخ). صحح غلطه باختصار بالعربي إذا احتاج بعدين كمّل بالإنجليزي.`,
  },
  travel: {
    label: '✈️ بالمطار / السفر',
    system: `إنت موظف استقبال بمطار. احكي إنجليزي بس، اسأل المتعلم أسئلة روتينية (جواز السفر، وجهة السفر، الحقائب)، وساعده يتمرن على محادثة السفر.`,
  },
  shopping: {
    label: '🛍️ تسوق بمحل',
    system: `إنت بائع بمحل ملابس. احكي إنجليزي بس، ساعد المتعلم يسأل عن مقاسات وأسعار وألوان، ورد عليه بشكل طبيعي زي بائع حقيقي.`,
  },
};

function readingGenPrompt(level) {
  return `إنت مولّد نصوص قراءة لمتعلم إنجليزي مستوى ${level}.
رجّع فقط JSON بدون أي نص إضافي وبدون Markdown، بهاد الشكل بالضبط:
{"passage": "نص إنجليزي 4-6 جمل مناسب لمستوى ${level}", "q1": "سؤال فهم بالإنجليزي", "a1": "الجواب", "q2": "سؤال فهم تاني بالإنجليزي", "a2": "الجواب", "vocab": "3 كلمات مهمة من النص مفصولة بفاصلة مع ترجمتها بالعربي بين قوسين"}`;
}

function writingPromptGen(level) {
  return `إنت مدرّب كتابة إنجليزي. اقترح موضوع/سؤال كتابة قصير مناسب لمستوى ${level} (جملة وحدة بالعربي توضح المطلوب، مثلاً: "اكتب 3-4 جمل عن يومك المفضل"). رجّع الجملة بس بدون أي شي إضافي.`;
}

function writingFeedbackPrompt(level) {
  return `إنت مصحح كتابة إنجليزي لمتعلم مستوى ${level}.
حلل النص اللي بعتهولك وجاوب بالعربي بهاد الترتيب بالضبط، مختصر ومباشر:
1. تقييم عام (سطر وحد)
2. أهم 2-3 أخطاء مع التصحيح
3. نسخة محسّنة من النص (بالإنجليزي)
خلي الرد قصير ومباشر مناسب لموبايل.`;
}

function speakingPromptGen(level) {
  return `إنت مدرّب محادثة إنجليزي. اقترح سؤال/موضوع قصير للتحدث الشفهي مناسب لمستوى ${level} (جملة وحدة بالعربي، مثلاً: "احكي عن أكلتك المفضلة لمدة 30 ثانية"). رجّع الجملة بس.`;
}

function speakingFeedbackPrompt(level) {
  return `إنت مدرّب نطق ومحادثة لمتعلم إنجليزي مستوى ${level}.
هاد نص مفرّغ من تسجيل صوتي للمتعلم وهو يجاوب على سؤال تحدث. حلل المحتوى (القواعد، المفردات، وضوح الفكرة) وجاوب بالعربي بإيجاز:
1. تقييم عام (سطر وحد)
2. أهم خطأ أو اثنين بالقواعد/المفردات مع التصحيح
3. نصيحة قصيرة للتحسين
ملاحظة: ما تقدر تحكم على النطق الفعلي لأنه بس نص، ركز على المحتوى اللغوي.`;
}

async function tgSend(env, chatId, text, keyboard) {
  const body = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('tgSend failed', res.status, errText);
  }
}

async function tgAnswerCallback(env, callbackId, text) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

// ---------- نطق صوتي (Text-to-Speech عبر Cloudflare Workers AI) ----------
// ملاحظة: اسم الموديل ممكن يتغيّر مع تحديثات Cloudflare Workers AI،
// تأكد منه بتوثيق Cloudflare قبل النشر (developers.cloudflare.com/workers-ai/models)
async function synthesizeSpeech(env, text) {
  try {
    const result = await env.AI.run('@cf/myshell-ai/melotts', { prompt: text, lang: 'en' });
    return result?.audio || null; // base64 audio
  } catch (e) {
    console.error('TTS error', e);
    return null;
  }
}

async function tgSendAudioFromBase64(env, chatId, base64Audio, caption) {
  if (!base64Audio) {
    await tgSend(env, chatId, 'ما قدرت أولّد الصوت، جرب كمان مرة.');
    return;
  }
  const binary = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) form.append('caption', caption);
  form.append('audio', new Blob([binary], { type: 'audio/mpeg' }), 'pronunciation.mp3');
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendAudio`, {
    method: 'POST',
    body: form,
  });
}

// ---------- سلسلة الأيام المتواصلة (Streak) ----------
async function touchStreak(env, chatId) {
  await env.DB.prepare(`INSERT OR IGNORE INTO users (chat_id) VALUES (?)`).bind(chatId).run();
  const user = await env.DB.prepare(`SELECT last_active, streak FROM users WHERE chat_id = ?`).bind(chatId).first();
  const today = new Date().toISOString().slice(0, 10);
  if (user.last_active === today) return user.streak || 0;

  let newStreak = 1;
  if (user.last_active) {
    const diffDays = Math.round((new Date(today) - new Date(user.last_active)) / 86400000);
    newStreak = diffDays === 1 ? (user.streak || 0) + 1 : 1;
  }
  await env.DB.prepare(`UPDATE users SET last_active = ?, streak = ? WHERE chat_id = ?`)
    .bind(today, newStreak, chatId).run();
  return newStreak;
}

function cleanJson(raw) {
  return raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
}

async function callGemini(env, system, userText, maxTokens) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini failed: ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini empty response');
  return text;
}

async function callCohere(env, system, userText, maxTokens) {
  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.COHERE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'command-r-plus-08-2024',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Cohere failed: ${res.status}`);
  const data = await res.json();
  const text = data?.message?.content?.[0]?.text;
  if (!text) throw new Error('Cohere empty response');
  return text;
}

async function callClaude(env, system, userText, maxTokens) {
  try {
    return await callGemini(env, system, userText, maxTokens);
  } catch (e) {
    console.error('Gemini failed, falling back to Cohere', e);
    try {
      return await callCohere(env, system, userText, maxTokens);
    } catch (e2) {
      console.error('Cohere also failed', e2);
      return '';
    }
  }
}

// ---------- SM2 ----------
function sm2(quality, ease, interval, repetitions) {
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * ease);
    ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ease < 1.3) ease = 1.3;
  }
  return { ease, interval, repetitions };
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------- أوامر ----------
async function newWord(env, chatId, basePrompt = WORD_GEN_PROMPT) {
  const existing = await env.DB.prepare(`SELECT word FROM words WHERE chat_id = ?`).bind(chatId).all();
  const known = existing.results.map(r => r.word).join(', ');
  const prompt = known
    ? `${basePrompt}\nتجنب هاي الكلمات لأنها متعلمة: ${known}`
    : basePrompt;

  const raw = await callClaude(env, prompt, 'اقترح كلمة جديدة الآن', 200);
  let data;
  try {
    data = JSON.parse(cleanJson(raw));
  } catch {
    return null;
  }

  await env.DB.prepare(
    `INSERT INTO words (chat_id, word, meaning_ar, example_en, due_at) VALUES (?, ?, ?, ?, date('now'))`
  ).bind(chatId, data.word, data.meaning_ar, data.example_en).run();

  return data;
}

// ---------- مكتبة الفيديوهات (A1-C2) ----------
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const CATEGORY_LABELS = {
  channel: '📺 قنوات تعليمية',
  series: '🎬 مسلسلات وسكيتشات',
  cartoon: '🧸 رسوم متحركة',
  clips: '✂️ مقاطع ومحاضرات',
  conversation: '🗣️ محادثات واقعية',
};

function youtubeSearchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function levelKeyboard(prefix) {
  const row1 = LEVELS.slice(0, 3).map(l => ({ text: l, callback_data: `${prefix}:${l}` }));
  const row2 = LEVELS.slice(3).map(l => ({ text: l, callback_data: `${prefix}:${l}` }));
  return [row1, row2];
}

async function showLevelMenu(env, chatId) {
  await tgSend(env, chatId, '🎥 اختار مستواك (CEFR):', levelKeyboard('L'));
}

async function showCategoryMenu(env, chatId, level) {
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT category FROM content WHERE level = ?`
  ).bind(level).all();
  if (!results.length) return tgSend(env, chatId, 'ما في محتوى لهاد المستوى بعد.');

  const buttons = results.map(r => ([{
    text: CATEGORY_LABELS[r.category] || r.category,
    callback_data: `C:${level}:${r.category}`,
  }]));
  await tgSend(env, chatId, `مستوى ${level} — اختار النوع:`, buttons);
}

async function showContentList(env, chatId, level, category) {
  const { results } = await env.DB.prepare(
    `SELECT id, title_ar FROM content WHERE level = ? AND category = ?`
  ).bind(level, category).all();
  if (!results.length) return tgSend(env, chatId, 'ما في عناصر بهاد التصنيف.');

  const buttons = results.map(r => ([{ text: r.title_ar, callback_data: `V:${r.id}` }]));
  await tgSend(env, chatId, `${CATEGORY_LABELS[category] || category} — مستوى ${level}:`, buttons);
}

async function sendContentItem(env, chatId, contentId) {
  const item = await env.DB.prepare(`SELECT * FROM content WHERE id = ?`).bind(contentId).first();
  if (!item) return;
  const text = `🎬 <b>${item.title_ar}</b>\nمستوى: ${item.level}\n${item.note_ar || ''}`;
  await tgSend(env, chatId, text, [[
    { text: '▶️ فتح على يوتيوب', url: youtubeSearchUrl(item.search_query) },
  ]]);
  await env.DB.prepare(
    `INSERT INTO content_log (chat_id, content_id) VALUES (?, ?)`
  ).bind(chatId, contentId).run();
}

async function setUserLevel(env, chatId, level) {
  await env.DB.prepare(`UPDATE users SET level = ? WHERE chat_id = ?`).bind(level, chatId).run();
  await tgSend(env, chatId, `✅ تم ضبط مستواك على ${level}\nرح تجيك اقتراحات فيديو يومية بهاد المستوى.`);
}

async function todayVideo(env, chatId) {
  const user = await env.DB.prepare(`SELECT level FROM users WHERE chat_id = ?`).bind(chatId).first();
  const level = user?.level || 'A2';

  const seen = await env.DB.prepare(
    `SELECT content_id FROM content_log WHERE chat_id = ? AND shown_at >= datetime('now', '-14 days')`
  ).bind(chatId).all();
  const seenIds = seen.results.map(r => r.content_id);

  const { results } = await env.DB.prepare(`SELECT * FROM content WHERE level = ?`).bind(level).all();
  const fresh = results.filter(r => !seenIds.includes(r.id));
  const pool = fresh.length ? fresh : results;
  if (!pool.length) return tgSend(env, chatId, 'ما في محتوى كافي بعد لهاد المستوى.');

  const pick = pool[Math.floor(Math.random() * pool.length)];
  await sendContentItem(env, chatId, pick.id);
}

async function getUserLevel(env, chatId) {
  const user = await env.DB.prepare(`SELECT level FROM users WHERE chat_id = ?`).bind(chatId).first();
  return user?.level || 'A2';
}

// ---------- القراءة ----------
async function handleReading(env, chatId) {
  const level = await getUserLevel(env, chatId);
  const raw = await callClaude(env, readingGenPrompt(level), 'ولّد نص قراءة الآن', 800);
  let d;
  try {
    d = JSON.parse(cleanJson(raw));
  } catch {
    return 'صار خلل بتوليد نص القراءة، جرب كمان مرة.';
  }
  return `📖 <b>نص اليوم (${level})</b>\n\n${d.passage}\n\n❓ ${d.q1}\n<tg-spoiler>${d.a1}</tg-spoiler>\n\n❓ ${d.q2}\n<tg-spoiler>${d.a2}</tg-spoiler>\n\n📌 مفردات: ${d.vocab}`;
}

// ---------- الكتابة ----------
async function startWriting(env, chatId) {
  const level = await getUserLevel(env, chatId);
  const prompt = (await callClaude(env, writingPromptGen(level), 'اقترح موضوع كتابة الآن', 150)).trim();
  await env.DB.prepare(`UPDATE users SET mode = 'writing', pending_prompt = ? WHERE chat_id = ?`)
    .bind(prompt, chatId).run();
  return `✍️ ${prompt}\n\nاكتب إجابتك بأي رسالة، وبصححلك ياها.`;
}

async function gradeWriting(env, chatId, submission, prompt) {
  const level = await getUserLevel(env, chatId);
  const feedback = await callClaude(env, writingFeedbackPrompt(level), submission, 600);
  await env.DB.prepare(`INSERT INTO writing_log (chat_id, prompt, submission, feedback) VALUES (?, ?, ?, ?)`)
    .bind(chatId, prompt, submission, feedback).run();
  await env.DB.prepare(`UPDATE users SET mode = 'idle', pending_prompt = NULL WHERE chat_id = ?`).bind(chatId).run();
  return feedback;
}

// ---------- التحدث ----------
async function startSpeaking(env, chatId) {
  const level = await getUserLevel(env, chatId);
  const prompt = (await callClaude(env, speakingPromptGen(level), 'اقترح موضوع تحدث الآن', 150)).trim();
  await env.DB.prepare(`UPDATE users SET mode = 'speaking', pending_prompt = ? WHERE chat_id = ?`)
    .bind(prompt, chatId).run();
  return `🎙️ ${prompt}\n\nسجل رسالة صوتية (Voice) بتليجرام وجاوب على السؤال، وبسمعك وبديك ملاحظات.`;
}

async function transcribeVoice(env, fileId) {
  const infoRes = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
  const info = await infoRes.json();
  const filePath = info?.result?.file_path;
  if (!filePath) return null;
  const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;
  const audioRes = await fetch(fileUrl);
  const audioBuffer = await audioRes.arrayBuffer();
  const audioArray = [...new Uint8Array(audioBuffer)];
  const result = await env.AI.run('@cf/openai/whisper', { audio: audioArray });
  return result?.text || null;
}

async function gradeSpeaking(env, chatId, fileId, prompt) {
  const transcript = await transcribeVoice(env, fileId);
  if (!transcript) return 'ما قدرت افهم التسجيل، جرب تسجل بمكان أهدأ وبوضوح أكتر.';

  const level = await getUserLevel(env, chatId);
  const feedback = await callClaude(env, speakingFeedbackPrompt(level), transcript, 600);
  await env.DB.prepare(`INSERT INTO speaking_log (chat_id, prompt, transcript, feedback) VALUES (?, ?, ?, ?)`)
    .bind(chatId, prompt, transcript, feedback).run();
  await env.DB.prepare(`UPDATE users SET mode = 'idle', pending_prompt = NULL WHERE chat_id = ?`).bind(chatId).run();
  return `🗣️ اللي سمعته: "${transcript}"\n\n${feedback}`;
}

// ---------- المحادثة التمثيلية (Roleplay) ----------
function roleplayKeyboard() {
  return Object.entries(ROLEPLAY_SCENARIOS).map(([key, s]) => ([
    { text: s.label, callback_data: `RP:${key}` },
  ]));
}

async function showRoleplayMenu(env, chatId) {
  await tgSend(env, chatId, '🎭 اختار سيناريو المحادثة:', roleplayKeyboard());
}

async function startRoleplay(env, chatId, scenarioKey) {
  const scenario = ROLEPLAY_SCENARIOS[scenarioKey];
  if (!scenario) return;
  await env.DB.prepare(`UPDATE users SET mode = 'roleplay', pending_prompt = ? WHERE chat_id = ?`)
    .bind(scenarioKey, chatId).run();

  const opener = await callClaude(env, scenario.system, 'ابدأ المحادثة الآن بجملة افتتاحية واحدة.', 200);
  await env.DB.prepare(`INSERT INTO roleplay_history (chat_id, scenario, role, content) VALUES (?, ?, 'assistant', ?)`)
    .bind(chatId, scenarioKey, opener).run();

  await tgSend(env, chatId, `🎭 <b>${scenario.label}</b>\n\n${opener}\n\n(اكتب /endroleplay لإنهاء المحادثة بأي وقت)`);
}

async function roleplayChat(env, chatId, scenarioKey, userText) {
  const scenario = ROLEPLAY_SCENARIOS[scenarioKey];
  if (!scenario) return 'صار خلل، جرب /roleplay من جديد.';

  const history = await env.DB.prepare(
    `SELECT role, content FROM roleplay_history WHERE chat_id = ? AND scenario = ? ORDER BY id DESC LIMIT 10`
  ).bind(chatId, scenarioKey).all();

  const transcript = history.results.reverse()
    .map(r => `${r.role === 'assistant' ? 'You' : 'Learner'}: ${r.content}`)
    .join('\n');

  const fullPrompt = transcript
    ? `${transcript}\nLearner: ${userText}\nYou:`
    : `Learner: ${userText}\nYou:`;

  const reply = (await callClaude(env, scenario.system, fullPrompt, 400)) || '...';

  await env.DB.batch([
    env.DB.prepare(`INSERT INTO roleplay_history (chat_id, scenario, role, content) VALUES (?, ?, 'user', ?)`).bind(chatId, scenarioKey, userText),
    env.DB.prepare(`INSERT INTO roleplay_history (chat_id, scenario, role, content) VALUES (?, ?, 'assistant', ?)`).bind(chatId, scenarioKey, reply),
  ]);

  return reply;
}

async function endRoleplay(env, chatId, scenarioKey) {
  const history = await env.DB.prepare(
    `SELECT role, content FROM roleplay_history WHERE chat_id = ? AND scenario = ? ORDER BY id`
  ).bind(chatId, scenarioKey).all();
  const transcript = history.results.map(r => `${r.role}: ${r.content}`).join('\n');

  const feedback = transcript
    ? await callClaude(env, 'لخّص أداء المتعلم بالمحادثة التالية بالعربي بإيجاز: أهم 2-3 أخطاء لغوية شائعة، ونصيحة وحدة للتحسين.', transcript, 400)
    : 'ما في محادثة كافية للتقييم.';

  await env.DB.prepare(`UPDATE users SET mode = 'idle', pending_prompt = NULL WHERE chat_id = ?`).bind(chatId).run();
  return `✅ انتهت المحادثة.\n\n📝 ملاحظات:\n${feedback}`;
}

// ---------- اختبار تحديد المستوى ----------
const LEVEL_TEST_QUESTIONS = [
  // قواعد (12 سؤال، صعوبة متدرجة)
  { q: 'I ___ a student.', opts: ['is', 'am', 'are', 'be'], correct: 1 },
  { q: 'She ___ to school every day.', opts: ['go', 'goes', 'going', 'gone'], correct: 1 },
  { q: 'There ___ some milk in the fridge.', opts: ['is', 'are', 'be', 'am'], correct: 0 },
  { q: 'He has been living here ___ 2019.', opts: ['since', 'for', 'from', 'at'], correct: 0 },
  { q: 'If I ___ more time, I would travel more.', opts: ['have', 'had', 'has', 'will have'], correct: 1 },
  { q: 'By the time we arrived, the movie ___.', opts: ['started', 'has started', 'had started', 'starts'], correct: 2 },
  { q: "She's the person ___ car was stolen.", opts: ['who', 'whose', 'which', 'that'], correct: 1 },
  { q: 'I wish I ___ harder for the exam.', opts: ['study', 'studied', 'had studied', 'would study'], correct: 2 },
  { q: 'Hardly ___ the door when the phone rang.', opts: ['I had opened', 'had I opened', 'I opened', 'did I opened'], correct: 1 },
  { q: 'The report ___ by tomorrow.', opts: ['will complete', 'will be completed', 'completes', 'is completing'], correct: 1 },
  { q: 'Not until she apologized ___ willing to forgive her.', opts: ['I was', 'was I', 'I had been', 'had I been'], correct: 1 },
  { q: '"It\'s raining cats and dogs" means:', opts: ['light rain', 'very heavy rain', 'no rain', 'snow'], correct: 1 },
  // مفردات (6 أسئلة، صعوبة متدرجة)
  { q: "What does 'happy' mean?", opts: ['sad', 'glad', 'angry', 'tired'], correct: 1 },
  { q: "Choose the opposite of 'expensive':", opts: ['cheap', 'costly', 'large', 'small'], correct: 0 },
  { q: "'Postpone' means:", opts: ['cancel', 'delay', 'finish', 'start'], correct: 1 },
  { q: "'Reliable' means:", opts: ['untrustworthy', 'trustworthy', 'fast', 'slow'], correct: 1 },
  { q: "'Meticulous' means:", opts: ['careless', 'very careful and precise', 'lazy', 'generous'], correct: 1 },
  { q: "'Ubiquitous' means:", opts: ['rare', 'present everywhere', 'hidden', 'expensive'], correct: 1 },
  // فهم قرائي (نص + سؤالين)
  { q: 'Read: "Maya works as a nurse in a busy hospital. She usually starts her shift at 7 a.m. and finishes at 3 p.m. On weekends, she volunteers at a community clinic to help people who cannot afford medical care."\n\nWhat time does Maya start work?', opts: ['6 a.m.', '7 a.m.', '3 p.m.', '8 a.m.'], correct: 1 },
  { q: 'Same passage — Why does Maya volunteer on weekends?', opts: ['She needs more money', "To help people who can't afford care", 'Her boss told her to', 'She is bored'], correct: 1 },
];

function levelFromScore(score) {
  if (score <= 3) return 'A1';
  if (score <= 7) return 'A2';
  if (score <= 11) return 'B1';
  if (score <= 15) return 'B2';
  if (score <= 18) return 'C1';
  return 'C2';
}

function levelToIndex(lvl) {
  const i = LEVELS.indexOf(lvl);
  return i === -1 ? 2 : i;
}

function indexToLevel(i) {
  return LEVELS[Math.min(Math.max(Math.round(i), 0), LEVELS.length - 1)];
}

function levelTestKeyboard(qIndex) {
  const q = LEVEL_TEST_QUESTIONS[qIndex];
  return q.opts.map((opt, i) => ([{ text: opt, callback_data: `LT:${i}` }]));
}

async function startLevelTest(env, chatId) {
  await env.DB.prepare(`UPDATE users SET mode = 'leveltest', pending_prompt = ? WHERE chat_id = ?`)
    .bind(JSON.stringify({ i: 0, score: 0 }), chatId).run();
  const q = LEVEL_TEST_QUESTIONS[0];
  await tgSend(env, chatId, `📝 اختبار تحديد المستوى (سؤال 1 من ${LEVEL_TEST_QUESTIONS.length})\n\n${q.q}`, levelTestKeyboard(0));
}

async function handleLevelTestAnswer(env, chatId, pendingPrompt, chosenIndex) {
  let state;
  try { state = JSON.parse(pendingPrompt); } catch { state = { i: 0, score: 0 }; }

  const q = LEVEL_TEST_QUESTIONS[state.i];
  if (chosenIndex === q.correct) state.score += 1;
  state.i += 1;

  if (state.i >= LEVEL_TEST_QUESTIONS.length) {
    const mcqLevel = levelFromScore(state.score);
    await env.DB.prepare(`UPDATE users SET pending_prompt = ? WHERE chat_id = ?`)
      .bind(JSON.stringify({ phase: 'writing', mcqLevel, score: state.score }), chatId).run();
    await tgSend(env, chatId, `✅ خلصت الأسئلة! (${state.score}/${LEVEL_TEST_QUESTIONS.length})\n\nآخر خطوة: اكتب 2-3 جمل بالإنجليزي عن نفسك أو يومك — هاد بيساعدني أدق نتيجتك أكتر.`);
    return;
  }

  await env.DB.prepare(`UPDATE users SET pending_prompt = ? WHERE chat_id = ?`)
    .bind(JSON.stringify(state), chatId).run();
  const nextQ = LEVEL_TEST_QUESTIONS[state.i];
  await tgSend(env, chatId, `📝 سؤال ${state.i + 1} من ${LEVEL_TEST_QUESTIONS.length}\n\n${nextQ.q}`, levelTestKeyboard(state.i));
}

async function finishLevelTestWithWriting(env, chatId, mcqLevel, score, writingSample) {
  const assessPrompt = `You are an English level assessor. Read the learner's sentences and reply with ONLY one label, nothing else: A1, A2, B1, B2, C1, or C2.`;
  const raw = (await callClaude(env, assessPrompt, writingSample, 10)).trim().toUpperCase();
  const aiLevel = LEVELS.includes(raw) ? raw : mcqLevel;

  const finalIndex = (levelToIndex(mcqLevel) + levelToIndex(aiLevel)) / 2;
  const finalLevel = indexToLevel(finalIndex);

  await env.DB.prepare(`UPDATE users SET mode = 'idle', pending_prompt = NULL, level = ? WHERE chat_id = ?`)
    .bind(finalLevel, chatId).run();

  await tgSend(env, chatId, `🎉 خلص الاختبار!\nنتيجة الأسئلة: ${score}/${LEVEL_TEST_QUESTIONS.length} (≈ ${mcqLevel})\nتقييم الكتابة: ≈ ${aiLevel}\n\nمستواك النهائي: <b>${finalLevel}</b>\nتم ضبطه تلقائيًا بالبوت. رح تجيك فيديوهات ونصوص واقتراحات يومية بهاد المستوى.`);
}

// ---------- القائمة الرئيسية التفاعلية ----------
function mainMenuKeyboard() {
  return [
    [{ text: '📝 اختبار تحديد المستوى', callback_data: 'M:leveltest' }],
    [{ text: '📗 كلمة جديدة', callback_data: 'M:new' }, { text: '🔁 مراجعة', callback_data: 'M:review' }],
    [{ text: '🎧 فيديوهات', callback_data: 'M:videos' }, { text: '🎬 فيديو اليوم', callback_data: 'M:today' }],
    [{ text: '📖 قراءة', callback_data: 'M:reading' }, { text: '✍️ كتابة', callback_data: 'M:write' }],
    [{ text: '🎙️ تحدث', callback_data: 'M:speak' }, { text: '🎭 محادثة تمثيلية', callback_data: 'M:roleplay' }],
    [{ text: '⚙️ تغيير المستوى', callback_data: 'M:setlevel' }, { text: '📊 إحصائياتي', callback_data: 'M:stats' }],
  ];
}

async function sendMainMenu(env, chatId, intro) {
  await tgSend(env, chatId, intro || '📋 اختار اللي بدك تسويه:', mainMenuKeyboard());
}

function ratingKeyboard(wordId) {
  return [[
    { text: '❌ ما عرفتها', callback_data: `rate:${wordId}:0` },
    { text: '🟡 صعبة', callback_data: `rate:${wordId}:3` },
    { text: '✅ عرفتها', callback_data: `rate:${wordId}:4` },
    { text: '🟢 سهلة', callback_data: `rate:${wordId}:5` },
  ]];
}

async function sendReviewCard(env, chatId, w) {
  const text = `📘 <b>${w.word}</b>\n<i>${w.example_en || ''}</i>\n\nالمعنى: <tg-spoiler>${w.meaning_ar}</tg-spoiler>`;
  await tgSend(env, chatId, text, ratingKeyboard(w.id));
}

async function handleReview(env, chatId) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM words WHERE chat_id = ? AND due_at <= date('now') ORDER BY due_at LIMIT 1`
  ).bind(chatId).all();

  if (!results.length) return 'ما في كلمات مستحقة مراجعة اليوم 👍\nجرب /new تتعلم كلمة جديدة.';

  await sendReviewCard(env, chatId, results[0]);
  return null; // الرسالة انبعتت مباشرة كبطاقة
}

async function handleRating(env, chatId, wordId, quality) {
  const w = await env.DB.prepare(`SELECT * FROM words WHERE id = ?`).bind(wordId).first();
  if (!w) return;
  const { ease, interval, repetitions } = sm2(quality, w.ease, w.interval_days, w.repetitions);
  await env.DB.prepare(
    `UPDATE words SET ease = ?, interval_days = ?, repetitions = ?, due_at = ? WHERE id = ?`
  ).bind(ease, interval, repetitions, addDays(interval), wordId).run();

  await tgSend(env, chatId, `👍 تم — رح تراجع "${w.word}" بعد ${interval} يوم.`);

  // إذا في كلمات كمان مستحقة، ابعت التالية
  const next = await env.DB.prepare(
    `SELECT * FROM words WHERE chat_id = ? AND due_at <= date('now') ORDER BY due_at LIMIT 1`
  ).bind(chatId).all();
  if (next.results.length) await sendReviewCard(env, chatId, next.results[0]);
}

async function handleStats(env, chatId) {
  const u = await env.DB.prepare(`SELECT streak FROM users WHERE chat_id = ?`).bind(chatId).first();
  const total = await env.DB.prepare(`SELECT COUNT(*) c FROM words WHERE chat_id = ?`).bind(chatId).first();
  const due = await env.DB.prepare(
    `SELECT COUNT(*) c FROM words WHERE chat_id = ? AND due_at <= date('now')`
  ).bind(chatId).first();
  const mastered = await env.DB.prepare(
    `SELECT COUNT(*) c FROM words WHERE chat_id = ? AND repetitions >= 5`
  ).bind(chatId).first();
  const writings = await env.DB.prepare(`SELECT COUNT(*) c FROM writing_log WHERE chat_id = ?`).bind(chatId).first();
  const speakings = await env.DB.prepare(`SELECT COUNT(*) c FROM speaking_log WHERE chat_id = ?`).bind(chatId).first();
  const videos = await env.DB.prepare(`SELECT COUNT(*) c FROM content_log WHERE chat_id = ?`).bind(chatId).first();

  return `🔥 سلسلة أيامك: ${u?.streak || 0} يوم متتالي\n\n📊 إحصائياتك:\n📗 كلمات: ${total.c} (مستحقة: ${due.c}، متقنة: ${mastered.c})\n🎧 فيديوهات اتفرجت عليها: ${videos.c}\n✍️ تمارين كتابة: ${writings.c}\n🎙️ تمارين تحدث: ${speakings.c}`;
}

async function handleCommand(env, chatId, text) {
  const cmd = text.trim().split(/\s+/)[0].toLowerCase();

  if (cmd === '/start') {
    await env.DB.prepare(`INSERT OR IGNORE INTO users (chat_id) VALUES (?)`).bind(chatId).run();
    await tgSend(env, chatId, 'أهلاً 👋 أنا مساعدك لتعلم الإنجليزي.\nلو أول مرة، ابدأ باختبار تحديد المستوى تحت.');
    await sendMainMenu(env, chatId);
    return null;
  }

  if (cmd === '/help' || cmd === '/skills') {
    return `📋 /menu - القائمة التفاعلية (أزرار)\n📝 /leveltest - اختبار تحديد المستوى\n📗 /new /review - مفردات\n🎧 /videos /todayvideo - استماع\n📖 /reading - قراءة\n✍️ /write - كتابة (بترسل نص بعدها)\n🎙️ /speak - تحدث (بترسل رسالة صوتية بعدها)\n🎭 /roleplay - محادثة تمثيلية (مقابلة عمل/مطعم/مطار/تسوق)\n🔊 /pronounce (نص) - نطق صوتي\n⚙️ /setlevel - تحديد المستوى يدويًا\n📊 /stats - إحصائيات وسلسلة أيامك\n❌ /cancel أو /endroleplay - إلغاء تمرين حالي`;
  }

  if (cmd === '/reading') return await handleReading(env, chatId);
  if (cmd === '/write') return await startWriting(env, chatId);
  if (cmd === '/speak') return await startSpeaking(env, chatId);

  if (cmd === '/leveltest') {
    await startLevelTest(env, chatId);
    return null;
  }

  if (cmd === '/menu') {
    await sendMainMenu(env, chatId);
    return null;
  }

  if (cmd === '/cancel') {
    await env.DB.prepare(`UPDATE users SET mode = 'idle', pending_prompt = NULL WHERE chat_id = ?`).bind(chatId).run();
    return 'تم الإلغاء ✅';
  }

  if (cmd === '/videos') {
    await showLevelMenu(env, chatId);
    return null;
  }

  if (cmd === '/setlevel') {
    await tgSend(env, chatId, '🎯 اختار مستواك الحالي:', levelKeyboard('SL'));
    return null;
  }

  if (cmd === '/todayvideo') {
    await todayVideo(env, chatId);
    return null;
  }

  if (cmd === '/new') {
    const w = await newWord(env, chatId);
    if (!w) return 'صار خلل بتوليد الكلمة، جرب كمان مرة.';
    const saved = await env.DB.prepare(
      `SELECT * FROM words WHERE chat_id = ? ORDER BY id DESC LIMIT 1`
    ).bind(chatId).first();
    await sendReviewCard(env, chatId, saved);
    const audio = await synthesizeSpeech(env, saved.word);
    if (audio) await tgSendAudioFromBase64(env, chatId, audio, saved.word);
    return null;
  }

  if (cmd === '/pronounce') {
    const term = parseArgs(text);
    if (!term) return 'اكتب الكلمة أو الجملة بعد الأمر، مثال:\n/pronounce How are you?';
    const audio = await synthesizeSpeech(env, term);
    await tgSendAudioFromBase64(env, chatId, audio, term);
    return null;
  }

  if (cmd === '/roleplay') {
    await showRoleplayMenu(env, chatId);
    return null;
  }

  if (cmd === '/endroleplay') {
    const user = await env.DB.prepare(`SELECT mode, pending_prompt FROM users WHERE chat_id = ?`).bind(chatId).first();
    if (user?.mode !== 'roleplay') return 'ما في محادثة تمثيلية شغالة حاليًا.';
    return await endRoleplay(env, chatId, user.pending_prompt);
  }

  if (cmd === '/review') return await handleReview(env, chatId);
  if (cmd === '/stats') return await handleStats(env, chatId);

  return 'أمر مش معروف. اكتب /help';
}

async function handleUpdate(env, update) {
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = cq.message.chat.id;
    const parts = cq.data.split(':');
    const action = parts[0];

    await touchStreak(env, chatId);

    if (action === 'rate') {
      await handleRating(env, chatId, parseInt(parts[1], 10), parseInt(parts[2], 10));
    } else if (action === 'L') {
      await showCategoryMenu(env, chatId, parts[1]);
    } else if (action === 'C') {
      await showContentList(env, chatId, parts[1], parts[2]);
    } else if (action === 'V') {
      await sendContentItem(env, chatId, parseInt(parts[1], 10));
    } else if (action === 'SL') {
      await setUserLevel(env, chatId, parts[1]);
    } else if (action === 'RP') {
      await startRoleplay(env, chatId, parts[1]);
    } else if (action === 'LT') {
      const u = await env.DB.prepare(`SELECT pending_prompt FROM users WHERE chat_id = ?`).bind(chatId).first();
      await handleLevelTestAnswer(env, chatId, u?.pending_prompt || '{}', parseInt(parts[1], 10));
    } else if (action === 'M') {
      const menuAction = parts[1];
      if (menuAction === 'leveltest') await startLevelTest(env, chatId);
      else if (menuAction === 'new') {
        const w = await newWord(env, chatId);
        if (w) {
          const saved = await env.DB.prepare(`SELECT * FROM words WHERE chat_id = ? ORDER BY id DESC LIMIT 1`).bind(chatId).first();
          await sendReviewCard(env, chatId, saved);
          const audio = await synthesizeSpeech(env, saved.word);
          if (audio) await tgSendAudioFromBase64(env, chatId, audio, saved.word);
        }
      }
      else if (menuAction === 'review') {
        const r = await handleReview(env, chatId);
        if (r) await tgSend(env, chatId, r);
      }
      else if (menuAction === 'videos') await showLevelMenu(env, chatId);
      else if (menuAction === 'today') await todayVideo(env, chatId);
      else if (menuAction === 'reading') await tgSend(env, chatId, await handleReading(env, chatId));
      else if (menuAction === 'write') await tgSend(env, chatId, await startWriting(env, chatId));
      else if (menuAction === 'speak') await tgSend(env, chatId, await startSpeaking(env, chatId));
      else if (menuAction === 'roleplay') await showRoleplayMenu(env, chatId);
      else if (menuAction === 'setlevel') await tgSend(env, chatId, '🎯 اختار مستواك الحالي:', levelKeyboard('SL'));
      else if (menuAction === 'stats') await tgSend(env, chatId, await handleStats(env, chatId));
    }

    await tgAnswerCallback(env, cq.id, 'تم ✅');
    return;
  }

  const msg = update.message;
  if (!msg) return;
  const chatId = msg.chat.id;

  await touchStreak(env, chatId);

  const user = await env.DB.prepare(`SELECT mode, pending_prompt FROM users WHERE chat_id = ?`).bind(chatId).first();
  const mode = user?.mode || 'idle';

  // رسالة صوتية أثناء تمرين تحدث
  if (msg.voice) {
    if (mode === 'speaking') {
      const reply = await gradeSpeaking(env, chatId, msg.voice.file_id, user.pending_prompt);
      await tgSend(env, chatId, reply);
    } else {
      await tgSend(env, chatId, 'ابعت /speak الأول وبعدين سجل ردك 🎙️');
    }
    return;
  }

  if (!msg.text) return;
  const text = msg.text;

  let reply;
  if (text.startsWith('/')) {
    reply = await handleCommand(env, chatId, text);
  } else if (mode === 'leveltest') {
    let state;
    try { state = JSON.parse(user.pending_prompt); } catch { state = null; }
    if (state && state.phase === 'writing') {
      await finishLevelTestWithWriting(env, chatId, state.mcqLevel, state.score, text);
      reply = null;
    } else {
      reply = 'أنت وسط اختبار تحديد المستوى — اضغط أحد الأزرار فوق للإجابة، أو اكتب /cancel للإلغاء.';
    }
  } else if (mode === 'writing') {
    reply = await gradeWriting(env, chatId, text, user.pending_prompt);
  } else if (mode === 'roleplay') {
    reply = await roleplayChat(env, chatId, user.pending_prompt, text);
  } else {
    // محادثة حرة - تدريب لغوي
    reply = await callClaude(env, COACH_PROMPT, text, 500);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO chat_history (chat_id, role, content) VALUES (?, 'user', ?)`).bind(chatId, text),
      env.DB.prepare(`INSERT INTO chat_history (chat_id, role, content) VALUES (?, 'assistant', ?)`).bind(chatId, reply),
    ]);
  }

  if (reply) await tgSend(env, chatId, reply);
}

async function dailyReminder(env) {
  const { results } = await env.DB.prepare(`SELECT chat_id FROM users`).all();
  const dayIndex = Math.floor(Date.now() / 86400000) % 3; // يدوّر بين 3 مهارات إضافية يوميًا
  const skillNudge = ['reading', 'writing', 'speaking'][dayIndex];

  for (const u of results) {
    const streakInfo = await env.DB.prepare(`SELECT streak, last_active FROM users WHERE chat_id = ?`).bind(u.chat_id).first();
    const today = new Date().toISOString().slice(0, 10);
    if (streakInfo?.streak > 0 && streakInfo.last_active !== today) {
      await tgSend(env, u.chat_id, `🔥 سلسلتك ${streakInfo.streak} يوم — لا تخليها تنكسر! تفاعل مع أي شي اليوم يحافظ عليها.`);
    }

    const due = await env.DB.prepare(
      `SELECT COUNT(*) c FROM words WHERE chat_id = ? AND due_at <= date('now')`
    ).bind(u.chat_id).first();
    if (due.c > 0) {
      await tgSend(env, u.chat_id, `☀️ صباح الخير! عندك ${due.c} كلمة للمراجعة اليوم.\nاكتب /review`);
    } else {
      await tgSend(env, u.chat_id, `☀️ صباح الخير! تعلم كلمة جديدة اليوم: /new`);
    }
    await todayVideo(env, u.chat_id);

    if (skillNudge === 'reading') {
      await tgSend(env, u.chat_id, '📖 نص قراءة اليوم جاهز: /reading');
    } else if (skillNudge === 'writing') {
      await tgSend(env, u.chat_id, '✍️ تمرين كتابة قصير اليوم: /write');
    } else {
      await tgSend(env, u.chat_id, '🎙️ جرب تمرين تحدث اليوم: /speak');
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === `/webhook/${env.WEBHOOK_SECRET}`) {
      try {
        const update = await request.json();
        await handleUpdate(env, update);
      } catch (e) {
        console.error(e);
      }
      return new Response('OK');
    }
    return new Response('بوت تعلم الإنجليزي شغال ✅');
  },

  async scheduled(event, env, ctx) {
    // شغّل حسب الكرون المضبوط بـ wrangler.toml (تذكير صباحي)
    ctx.waitUntil(dailyReminder(env));
  },
};
