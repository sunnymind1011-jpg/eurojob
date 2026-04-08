// api/match.js — AI 잡 매칭 (Gemini API)

export const maxDuration = 30;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { resume, jobs } = req.body;
  if (!resume || !jobs) {
    return res.status(400).json({ error: '이력서와 공고 목록이 필요해요' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았어요' });
  }

  const prompt = `You are a job matching expert. Analyze this resume and find the TOP 10 best matching jobs from the list below.

RESUME:
${resume}

JOB LIST (format: [index] title | company | country | skills | languages):
${jobs}

Return ONLY a JSON array with exactly 10 items. Each item must have:
- "index": the job index number from the list
- "score": match percentage 0-100
- "reason": one sentence in Korean explaining why this job matches (max 30 chars)

Example: [{"index":5,"score":87,"reason":"SQL·Python 스킬이 완벽히 일치"},...]

Return ONLY the JSON array, no other text.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI 응답 파싱 실패: ' + text.slice(0, 100) });

    const matches = JSON.parse(jsonMatch[0]);
    res.status(200).json({ ok: true, matches });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
