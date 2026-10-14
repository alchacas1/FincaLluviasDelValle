import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  database: { name: 'database' },
  visitsRef: { name: 'visits-ref' },
  queryRef: { name: 'query-ref' },
  documentRef: { name: 'document-ref' },
  whereConstraint: { name: 'where-constraint' },
  orderConstraint: { name: 'order-constraint' },
  serverTimestampValue: { name: 'server-timestamp' },
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  where: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  collection: mocks.collection,
  doc: mocks.doc,
  getDocs: mocks.getDocs,
  orderBy: mocks.orderBy,
  query: mocks.query,
  serverTimestamp: mocks.serverTimestamp,
  setDoc: mocks.setDoc,
  where: mocks.where,
}))

vi.mock('./firebase', () => ({
  getFirebaseDb: vi.fn(() => mocks.database),
}))

import { visitorStorage } from './visitorStorage'

const draft = {
  firstName: 'Ana',
  firstLastName: 'Perez',
  secondLastName: 'Solis',
  identification: '1-1111-1111',
  visitDate: '2026-10-13',
  nationality: 'Costa Rica',
  visitorType: 'adult' as const,
  entryMode: 'individual' as const,
  groupMembers: [],
}

const remoteData = {
  ...draft,
  id: 'visit-1',
  ownerUid: 'uid-a',
}

const remoteDoc = {
  id: 'visit-1',
  data: () => ({
    ...remoteData,
    createdAt: { toDate: () => new Date('2026-10-13T10:00:00.000Z') },
  }),
}

describe('visitorStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mocks.collection.mockReturnValue(mocks.visitsRef)
    mocks.doc.mockReturnValue(mocks.documentRef)
    mocks.where.mockReturnValue(mocks.whereConstraint)
    mocks.orderBy.mockReturnValue(mocks.orderConstraint)
    mocks.query.mockReturnValue(mocks.queryRef)
    mocks.serverTimestamp.mockReturnValue(mocks.serverTimestampValue)
    mocks.getDocs.mockResolvedValue({ docs: [] })
    mocks.setDoc.mockResolvedValue(undefined)
  })

  it('queries only the owner records ordered newest first', async () => {
    mocks.getDocs.mockResolvedValue({ docs: [remoteDoc] })
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem')

    await visitorStorage.list('uid-a')

    expect(mocks.where).toHaveBeenCalledWith('ownerUid', '==', 'uid-a')
    expect(mocks.orderBy).toHaveBeenCalledWith('createdAt', 'desc')
    expect(mocks.query).toHaveBeenCalledWith(
      mocks.visitsRef,
      mocks.whereConstraint,
      mocks.orderConstraint,
    )
    expect(getItemSpy).not.toHaveBeenCalled()
  })

  it('maps a Firestore timestamp to an ISO date', async () => {
    mocks.getDocs.mockResolvedValue({ docs: [remoteDoc] })

    await expect(visitorStorage.list('uid-a')).resolves.toEqual([
      expect.objectContaining({
        id: 'visit-1',
        ownerUid: 'uid-a',
        createdAt: '2026-10-13T10:00:00.000Z',
      }),
    ])
  })

  it('writes ownership and a server timestamp but returns a renderable ISO entry', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('visit-1')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-13T10:00:00.000Z'))

    const entry = await visitorStorage.create('uid-a', draft)

    expect(mocks.setDoc).toHaveBeenCalledWith(mocks.documentRef, {
      ...draft,
      id: 'visit-1',
      ownerUid: 'uid-a',
      createdAt: mocks.serverTimestampValue,
    })
    expect(entry).toEqual({
      ...draft,
      id: 'visit-1',
      ownerUid: 'uid-a',
      createdAt: '2026-10-13T10:00:00.000Z',
    })
    vi.useRealTimers()
  })

  it('propagates a remote read failure instead of returning shared local data', async () => {
    localStorage.setItem('finca-lluvias:visitors:v1', JSON.stringify([{ id: 'other-user' }]))
    mocks.getDocs.mockRejectedValue(new Error('permission-denied'))

    await expect(visitorStorage.list('uid-a')).rejects.toThrow(
      'No fue posible cargar los ingresos registrados.',
    )
  })

  it('rejects malformed remote records', async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [{ id: 'bad', data: () => ({ ownerUid: 'uid-a', createdAt: null }) }],
    })

    await expect(visitorStorage.list('uid-a')).rejects.toThrow(
      'No fue posible cargar los ingresos registrados.',
    )
  })

  it('translates remote write failures', async () => {
    mocks.setDoc.mockRejectedValue(new Error('permission-denied'))

    await expect(visitorStorage.create('uid-a', draft)).rejects.toThrow(
      'No fue posible guardar el registro.',
    )
  })
})
