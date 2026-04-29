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
 
  const prompt = `You are a professional job matching expert specializing in European job markets for Korean job seekers.
 
Analyze the resume carefully and find the TOP 10 best matching jobs from the job list.
 
IMPORTANT MATCHING RULES:
1. Match based on the candidate's ACTUAL job function, industry, and skills — not just keyword overlap.
2. If the candidate has a Sales/BD background, prioritize Sales/BD/Account Management roles, NOT data or engineering roles.
3. If the candidate mentions remote work preference, prioritize Remote positions over On-site.
4. Consider seniority level — a Director-level candidate should be matched with Senior/Lead/Director roles.
5. Language requirements must match — if the candidate only speaks English, avoid roles requiring local languages.
6. Score must reflect TRUE relevance (0-100). A Sales Director should score <30 for Data Engineer roles.
 
JOB LIST FORMAT: [index] title | company | country | remoteType | skills | languages | description_snippet
 
RESUME:
${resume}
 
JOB LIST:
${jobs}
 
Return ONLY a JSON array (no wrapper object). Each item must have:
{"index": number, "score": number, "reason": "한글로 매칭 이유 설명(25자이내)"}`;
 
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
