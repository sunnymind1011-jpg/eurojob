// api/match.js — AI 잡 매칭 (Groq API 버전)

export const maxDuration = 30;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { resume, jobs } = req.body;
  if (!resume || !jobs) return res.status(400).json({ error: '데이터 부족' });

  // 환경변수 이름을 GROQ_API_KEY로 바꿔주세요
  const apiKey = process.env.GROQ_API_KEY; 
  if (!apiKey) return res.status(500).json({ error: 'API 키가 없습니다' });

  const prompt = `You are a job matching expert. Analyze this resume and find the TOP 10 best matching jobs from the list.
  
  RESUME: ${resume}
  JOB LIST: ${jobs}

  Return ONLY a JSON array. Each item: {"index": number, "score": number, "reason": "한글설명(20자이내)"}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // 성능이 매우 좋은 모델입니다
        messages: [
          { role: "system", content: "You are a helpful assistant that outputs only JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" } // JSON 출력 강제
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message });

    const content = data.choices[0].message.content;
    
    // Groq은 응답을 객체로 감쌀 때가 있어 배열만 추출합니다
    let matches = JSON.parse(content);
    if (matches.matches) matches = matches.matches; // { "matches": [...] } 대응

    res.status(200).json({ ok: true, matches: Array.isArray(matches) ? matches : [matches] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
