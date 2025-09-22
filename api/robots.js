export const config = {
  runtime: 'edge',
};

export default async function handler() {
  const newline = decodeURIComponent('%0A');
  const body = 'User-agent: ' + '*' + newline + 'Disallow:';
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
