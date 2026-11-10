import { describe, expect, it } from 'vitest'
import {
  FIRST_SYNC_TIME,
  applyPull,
  computePush,
  explodeState,
  hashValue,
  implodeState,
  shadowAfterPush,
  type DocMap,
  type Shadow,
  type StoreDoc,
} from './storeDocs'

describe('explodeState / implodeState', () => {
  it('splits id arrays into item docs plus an order doc, other fields whole', () => {
    const docs = explodeState({
      items: [{ id: 'a', n: 1 }, { id: 'b', n: 2 }],
      theme: 'dark',
      tags: ['x', 'y'],
      empty: [],
      fn: () => 1,
    })
    expect(docs).toEqual({
      'items#a': { id: 'a', n: 1 },
      'items#b': { id: 'b', n: 2 },
      'items@order': ['a', 'b'],
      theme: 'dark',
      tags: ['x', 'y'],
      empty: [],
    })
  })

  it('round-trips and keeps the stored order', () => {
    const state = { items: [{ id: 'b' }, { id: 'a' }, { id: 'c' }], theme: 'light' }
    expect(implodeState(explodeState(state))).toEqual(state)
  })

  it('appends items missing from the order doc', () => {
    const docs: DocMap = { 'items#a': { id: 'a' }, 'items#z': { id: 'z' }, 'items@order': ['a'] }
    expect(implodeState(docs)).toEqual({ items: [{ id: 'a' }, { id: 'z' }] })
  })

  it('empties an id array whose items are all gone and keeps unrelated base props', () => {
    const base = { items: [{ id: 'a' }], other: 5 }
    expect(implodeState({}, base)).toEqual({ items: [], other: 5 })
  })

  it('treats arrays with duplicate or missing ids as one document', () => {
    expect(Object.keys(explodeState({ a: [{ id: 'x' }, { id: 'x' }], b: [{ n: 1 }] }))).toEqual(['a', 'b'])
  })
})

describe('hashValue', () => {
  it('ignores object key order', () => {
    expect(hashValue({ a: 1, b: { c: 2, d: 3 } })).toBe(hashValue({ b: { d: 3, c: 2 }, a: 1 }))
    expect(hashValue({ a: 1 })).not.toBe(hashValue({ a: 2 }))
  })
})

/** In-memory server with the same last-write-wins rule as /api/sync/docs. */
class FakeServer {
  docs = new Map<string, StoreDoc>()
  push(changes: StoreDoc[]) {
    for (const c of changes) {
      const prev = this.docs.get(c.docId)
      if (!prev || Date.parse(prev.updatedAt) < Date.parse(c.updatedAt)) this.docs.set(c.docId, c)
    }
  }
  all() {
    return [...this.docs.values()]
  }
}

/** A device holding one store, syncing like docSync.syncOnce. */
class Device {
  shadow: Shadow | null = null
  constructor(public state: Record<string, unknown>) {}
  sync(server: FakeServer, now: string) {
    const local = explodeState(this.state)
    const pushed = computePush('s', local, this.shadow, now)
    server.push(pushed)
    this.shadow = shadowAfterPush(this.shadow, pushed)
    const merged = applyPull(explodeState(this.state), this.shadow, server.all())
    this.state = implodeState(merged.docs, this.state)
    this.shadow = merged.shadow
  }
}

const t = (n: number) => new Date(Date.UTC(2026, 10, 10, 0, 0, n)).toISOString()

describe('multi-device sync', () => {
  it('a new device takes the server copy instead of overwriting it with its defaults', () => {
    const server = new FakeServer()
    const web = new Device({ theme: 'dark', payday: 25, items: [{ id: 'a' }] })
    web.sync(server, t(1))
    web.state = { ...web.state, theme: 'light' }
    web.sync(server, t(2))

    const phone = new Device({ theme: 'system', payday: 1, items: [] })
    phone.sync(server, t(3))
    expect(phone.state).toEqual({ theme: 'light', payday: 25, items: [{ id: 'a' }] })
  })

  it('first upload of existing local data is stored when the server has none', () => {
    const server = new FakeServer()
    const web = new Device({ items: [{ id: 'a' }] })
    web.sync(server, t(1))
    expect(server.docs.get('items#a')?.updatedAt).toBe(FIRST_SYNC_TIME)
    const phone = new Device({ items: [] })
    phone.sync(server, t(2))
    expect(phone.state.items).toEqual([{ id: 'a' }])
  })

  it('edits to different items on two devices both survive', () => {
    const server = new FakeServer()
    const web = new Device({ items: [{ id: 'a', n: 0 }, { id: 'b', n: 0 }] })
    web.sync(server, t(1))
    const phone = new Device({})
    phone.sync(server, t(2))

    web.state = { items: [{ id: 'a', n: 1 }, { id: 'b', n: 0 }] }
    phone.state = { items: [{ id: 'a', n: 0 }, { id: 'b', n: 2 }] }
    web.sync(server, t(3))
    phone.sync(server, t(4))
    web.sync(server, t(5))

    expect(web.state.items).toEqual([{ id: 'a', n: 1 }, { id: 'b', n: 2 }])
    expect(phone.state.items).toEqual([{ id: 'a', n: 1 }, { id: 'b', n: 2 }])
  })

  it('the later edit of the same item wins on both devices', () => {
    const server = new FakeServer()
    const web = new Device({ items: [{ id: 'a', n: 0 }] })
    web.sync(server, t(1))
    const phone = new Device({})
    phone.sync(server, t(2))

    web.state = { items: [{ id: 'a', n: 'web' }] }
    phone.state = { items: [{ id: 'a', n: 'phone' }] }
    // phone edited later but syncs first; web's push has an older clock
    phone.sync(server, t(10))
    web.sync(server, t(9))
    phone.sync(server, t(11))

    expect(web.state.items).toEqual([{ id: 'a', n: 'phone' }])
    expect(phone.state.items).toEqual([{ id: 'a', n: 'phone' }])
  })

  it('a deletion reaches the other device and is not uploaded again', () => {
    const server = new FakeServer()
    const web = new Device({ items: [{ id: 'a' }, { id: 'b' }] })
    web.sync(server, t(1))
    const phone = new Device({})
    phone.sync(server, t(2))

    web.state = { items: [{ id: 'b' }] }
    web.sync(server, t(3))
    phone.sync(server, t(4))
    web.sync(server, t(5))

    expect(phone.state.items).toEqual([{ id: 'b' }])
    expect(web.state.items).toEqual([{ id: 'b' }])
    expect(server.docs.get('items#a')?.deleted).toBe(true)
  })

  it('deleting the last item empties the list everywhere', () => {
    const server = new FakeServer()
    const web = new Device({ items: [{ id: 'a' }] })
    web.sync(server, t(1))
    const phone = new Device({ items: [] })
    phone.sync(server, t(2))
    expect(phone.state.items).toEqual([{ id: 'a' }])

    web.state = { items: [] }
    web.sync(server, t(3))
    phone.sync(server, t(4))
    expect(phone.state.items).toEqual([])

    phone.state = { items: [{ id: 'c' }] }
    phone.sync(server, t(5))
    web.sync(server, t(6))
    expect(web.state.items).toEqual([{ id: 'c' }])
  })

  it('keeps a local edit made while the push was in flight', () => {
    const local: DocMap = { theme: 'b' }
    const shadow: Shadow = { theme: hashValue('a') }
    const server: StoreDoc[] = [{ storeKey: 's', docId: 'theme', data: 'a', deleted: false, updatedAt: t(1) }]
    const merged = applyPull(local, shadow, server)
    expect(merged.docs.theme).toBe('b')
    expect(merged.changed).toBe(false)
    expect(computePush('s', merged.docs, merged.shadow, t(2))).toHaveLength(1)
  })

  it('re-pushes a shadowed document the server no longer has', () => {
    const local: DocMap = { theme: 'a' }
    const merged = applyPull(local, { theme: hashValue('a') }, [])
    expect(merged.shadow).toEqual({})
    expect(computePush('s', merged.docs, merged.shadow, t(1))).toEqual([
      { storeKey: 's', docId: 'theme', data: 'a', deleted: false, updatedAt: t(1) },
    ])
  })
})
