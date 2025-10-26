export const config = {
  runtime: 'edge',
};

export default async function handler() {
  // Enkel statisk sitemap. Byt ut eller generera dynamiskt vid behov.
  const xml = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    '<url><loc>https://ai-aktie-hjalp-new.vercel.app/</loc><priority>1.0</priority></url>' +
    '</urlset>';
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
