import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY, visitorStorage } from './visitorStorage'

const draft = {
  firstName: 'Ana',
  firstLastName: 'Perez',
  secondLastName: 'Solis',
  identification: '1-1111-1111',
  visitDate: '2026-08-04',
  nationality: 'Costa Rica',
  visitorType: 'adult' as const,
  entryMode: 'individual' as const,
  groupMembers: [],
}

describe('visitorStorage', () => {
  beforeEach(() => localStorage.clear())

  it('returns an empty list when storage is missing or invalid', async () => {
    await expect(visitorStorage.list()).resolves.toEqual([])
    localStorage.setItem(STORAGE_KEY, '{invalid')
    await expect(visitorStorage.list()).resolves.toEqual([])
  })

  it('creates, persists and returns entries newest first', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('first').mockReturnValueOnce('second')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-04T10:00:00.000Z'))
    await visitorStorage.create(draft)
    vi.setSystemTime(new Date('2026-08-04T11:00:00.000Z'))
    await visitorStorage.create({ ...draft, firstName: 'Luis', firstLastName: 'Mora' })
    await expect(visitorStorage.list()).resolves.toEqual([
      expect.objectContaining({ id: 'second' }),
      expect.objectContaining({ id: 'first' }),
    ])
    vi.useRealTimers()
  })

  it('throws when the browser rejects a write', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded')
    })
    await expect(visitorStorage.create(draft)).rejects.toThrow('No fue posible guardar el registro.')
  })
})
