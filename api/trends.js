import https from 'https';

const APP_ID = '22308f32';
const APP_KEY = '4902733d7210f0c75a0ad5a8d38a3c17';

const COUNTRIES = ['gb','de','nl','fr','es','it','be','at','ch'];
const COUNTRY_NAMES = {
  gb:'영국', de:'독일', nl:'네덜란드', fr:'프랑스', es:'스페인',
  it:'이탈리아', be:'벨기에', at:'오스트리아', ch:'스위스'
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

let cache = null;
let cachedAt = null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // 24시간 캐시
  if (cache && cachedAt && (Date.now() - cachedAt) < 24 * 3600000) {
    return res.status(200).json(cache);
  }

  try {
    const results = {};

    for (const country of COUNTRIES) {
      try {
        const url = `https://api.adzuna.com/v1/api/jobs/${country}/categories?app_id=${APP_ID}&app_key=${APP_KEY}`;
        const data = await fetchJSON(url);
        
        // 각 카테고리별 공고 수 조회
        const categories = data.results || [];
        const topCats = categories.slice(0, 10); // 15→10으로 줄이기
        
        const catCounts = await Promise.all(
          topCats.map(async cat => {
            try {
              const countUrl = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${APP_ID}&app_key=${APP_KEY}&category=${cat.tag}&results_per_page=1`;
              const countData = await fetchJSON(countUrl);
              return { label: cat.label, tag: cat.tag, count: countData.count || 0 };
            } catch(e) {
              return { label: cat.label, tag: cat.tag, count: 0 };
            }
          })
        );

        catCounts.sort((a, b) => b.count - a.count);
        results[country] = {
          name: COUNTRY_NAMES[country],
          categories: catCounts
        };

        // API 속도 제한 방지
        await new Promise(r => setTimeout(r, 500));

      } catch(e) {
        results[country] = { name: COUNTRY_NAMES[country], categories: [], error: e.message };
      }
    }

    cache = { results, fetchedAt: new Date().toISOString() };
    cachedAt = Date.now();

    return res.status(200).json(cache);

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
