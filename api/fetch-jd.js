export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ ok: false, error: 'URL이 필요해요' });

  // LinkedIn 차단
  if (/linkedin\.com/i.test(url)) {
    return res.status(400).json({ ok: false, error: 'LinkedIn은 로그인이 필요해 자동 가져오기가 불가해요' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EuroGate/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    // HTML → 텍스트 추출 (태그 제거 + 정리)
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // 너무 짧으면 실패
    if (text.length < 200) throw new Error('내용이 너무 짧아요. 해당 사이트는 직접 접근이 제한될 수 있어요');

    // 최대 8000자로 제한
    return res.json({ ok: true, text: text.slice(0, 8000) });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
