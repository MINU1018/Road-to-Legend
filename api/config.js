// Vercel 서버리스 함수: 클라우드 저장에 필요한 Supabase 공개 설정만 돌려준다 (v44)
// Vercel ↔ Supabase 연동이 넣어 주는 환경 변수 이름을 차례로 찾는다. 비밀 키(service role / secret)는 절대 내보내지 않는다
module.exports = (req, res) => {
  const E = process.env;
  const url = E.SUPABASE_URL || E.NEXT_PUBLIC_SUPABASE_URL || E.SUPABASE_SUPABASE_URL || E.SUPABASE_NEXT_PUBLIC_SUPABASE_URL || '';
  const key = E.SUPABASE_PUBLISHABLE_KEY || E.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || E.SUPABASE_ANON_KEY || E.NEXT_PUBLIC_SUPABASE_ANON_KEY || E.SUPABASE_NEXT_PUBLIC_SUPABASE_ANON_KEY || E.SUPABASE_SUPABASE_ANON_KEY || '';
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).send(JSON.stringify(url && key ? { url, key } : { url: null, key: null, missing: true }));
};
