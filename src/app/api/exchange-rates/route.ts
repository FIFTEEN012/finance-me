import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface ExchangeRates {
  THB: number
  USD: number
  EUR: number
  SGD: number
  JPY: number
  GBP: number
}

const FALLBACK_RATES: ExchangeRates = {
  THB: 1,
  USD: 33.0,
  EUR: 38.5,
  SGD: 26.0,
  JPY: 0.22,
  GBP: 44.5,
}

// In-memory cache for 30 minutes
let cachedRates: { rates: ExchangeRates; timestamp: number } | null = null
const CACHE_TTL_MS = 30 * 60 * 1000

async function fetchYahooRate(pair: string, fallback: number): Promise<number> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(pair)}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
        next: { revalidate: 1800 },
      }
    )
    if (!res.ok) return fallback
    const data = await res.json()
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
    return typeof price === 'number' && price > 0 ? price : fallback
  } catch {
    return fallback
  }
}

export async function GET() {
  const now = Date.now()
  if (cachedRates && now - cachedRates.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      rates: cachedRates.rates,
      cached: true,
      updatedAt: new Date(cachedRates.timestamp).toISOString(),
    })
  }

  const [usd, eur, sgd, jpy, gbp] = await Promise.all([
    fetchYahooRate('USDTHB=X', FALLBACK_RATES.USD),
    fetchYahooRate('EURTHB=X', FALLBACK_RATES.EUR),
    fetchYahooRate('SGDTHB=X', FALLBACK_RATES.SGD),
    fetchYahooRate('JPYTHB=X', FALLBACK_RATES.JPY),
    fetchYahooRate('GBPTHB=X', FALLBACK_RATES.GBP),
  ])

  const rates: ExchangeRates = {
    THB: 1,
    USD: Number(usd.toFixed(4)),
    EUR: Number(eur.toFixed(4)),
    SGD: Number(sgd.toFixed(4)),
    JPY: Number(jpy.toFixed(4)),
    GBP: Number(gbp.toFixed(4)),
  }

  cachedRates = { rates, timestamp: now }

  return NextResponse.json({
    rates,
    cached: false,
    updatedAt: new Date(now).toISOString(),
  })
}
