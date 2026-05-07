import { NextResponse } from 'next/server'

const SUPPORTED = ['USD', 'EUR', 'JPY', 'SGD', 'GBP']

// Revalidate cached response every hour
export const revalidate = 3600

export async function GET() {
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?base=THB&symbols=${SUPPORTED.join(',')}`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) throw new Error(`Frankfurter returned ${res.status}`)

    const data = await res.json()

    // Frankfurter returns rates as THB→foreign; we need foreign→THB
    const rates: Record<string, number> = { THB: 1 }
    for (const [code, rate] of Object.entries(data.rates as Record<string, number>)) {
      rates[code] = Math.round((1 / rate) * 10000) / 10000
    }

    return NextResponse.json({ rates, updatedAt: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Fetch failed' },
      { status: 502 }
    )
  }
}
