# Deployment & Vercel-inställningar

Detta dokument visar steg för att få projektet i drift på Vercel och vilka miljövariabler som krävs.

1) Lokalt (valfritt)
- Klona repo: git clone git@github.com:Sunkan111/AI-aktie-hjalp-new.git
- Installera beroenden: npm install
- Kör lokalt (Next.js): npx vercel dev eller npm run dev (om script finns)

2) Vercel - skapa projekt
- Gå till https://vercel.com och logga in.
- Klicka "New Project" -> importera GitHub-repo.
- Välj branch (t.ex. main).

3) Miljövariabler (Settings → Environment Variables)
Sätt följande i Vercel (Production + Preview):
- ALPHA_VANTAGE_API_KEY
- TWELVE_DATA_API_KEY
- NEWSAPI_API_KEY
- SERPER_API_KEY
- OPENROUTER_API_KEY
- GEMINI_API_KEY
- OPENAI_API_KEY
- X_API_BEARER
- SUPABASE_URL (om du använder Supabase)
- SUPABASE_KEY (om du använder Supabase)

4) Runtimes / Edge
- Vissa filer exporterar `export const config = { runtime: 'edge' }`.
- Edge-runtime använder global fetch – ta bort node-fetch i de filerna.
- Om du behöver node-specifika paket (node-fetch, fs, mm) så kör serverless (Node 18) och ta bort `runtime: 'edge'`.

5) Testa endpoints efter deploy (byt ut <DEPLOY_URL>)
- sitemap: curl -i https://<DEPLOY_URL>/api/sitemap
- gemini-analysis: curl -i -X POST https://<DEPLOY_URL>/api/gemini-analysis -H "Content-Type: application/json" -d '{"symbol":"AAPL"}'
- serper: curl -i -X POST https://<DEPLOY_URL>/api/serper -H "Content-Type: application/json" -d '{"query":"AAPL aktienyheter"}'

6) Felsökning
- Kolla Deployment → Build Logs i Vercel.
- Kolla Functions / Logs för runtimefel.
- Om du får 500, kopiera stacktrace till issues / support.

7) Nästa steg (rekommenderat)
- Implementera DB för loggning (Supabase).
- Skapa backend endpoints: /api/signals, /api/backtest och /api/journal.
- Bygg lib/indicators.js med RSI, MACD osv. och återanvänd i både signals och backtest.
