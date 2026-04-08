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
    // 1. 주소에서 v1beta를 v1으로 변경하고, 모델명 뒤에 -latest를 붙여보세요.
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.1, // 매칭의 정확도를 위해 온도를 낮추는 것이 좋습니다.
          maxOutputTokens: 1000,
          // JSON 응답을 강제하려면 아래 설정을 추가하는 것이 안전합니다.
          responseMimeType: "application/json" 
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json(); // text() 대신 json()으로 에러 메시지 확인
      return res.status(response.status).json({ error: errBody.error?.message || 'API 호출 실패' });
    }

    const data = await response.json();
    
    // 2. 응답 데이터 추출 (JSON 모드를 켰으므로 더 안전하게 가져올 수 있습니다)
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // JSON 응답만 깔끔하게 파싱
    try {
      const matches = JSON.parse(text);
      res.status(200).json({ ok: true, matches });
    } catch (parseError) {
      // 혹시라도 텍스트가 섞여 나올 경우를 대비한 기존 정규식 로직 유지
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('AI 응답 파싱 실패');
      const matches = JSON.parse(jsonMatch[0]);
      res.status(200).json({ ok: true, matches });
    }

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
