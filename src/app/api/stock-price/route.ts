import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')
  if (!symbol) return Response.json({ error: 'symbol required' }, { status: 400 })

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    )
    if (!res.ok) return Response.json({ error: `Yahoo returned ${res.status}` }, { status: res.status })

    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return Response.json({ error: 'Price not found' }, { status: 404 })

    return Response.json({
      price: meta.regularMarketPrice as number,
      currency: meta.currency as string,
      symbol,
    })
  } catch (err) {
    return Response.json({ error: 'Fetch failed' }, { status: 500 })
  }
}
