import { randomUUID } from 'node:crypto'
import { isRight, unwrapEither } from '@/shared/either'
import { makeUpload } from '@/tests/factories/make-upload'
import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { getUploads } from './get-uploads'

describe('get uploads', () => {
  it('should be able to get the uploads', async () => {
    // mesmo nome de arquivo para restringir busca somente para esse teste evitando conflito no banco
    const namePattern = `${randomUUID()}.jpg`

    const [up1, up2, up3, up4, up5] = await Promise.all([
      makeUpload({ name: namePattern }),
      makeUpload({ name: namePattern }),
      makeUpload({ name: namePattern }),
      makeUpload({ name: namePattern }),
      makeUpload({ name: namePattern }),
    ])

    const sut = await getUploads({
      searchQuery: namePattern,
    })

    expect(isRight(sut)).toBe(true)
    expect(unwrapEither(sut).total).toEqual(5)
    expect(unwrapEither(sut).uploads).toEqual([
      expect.objectContaining({ id: up5.id }),
      expect.objectContaining({ id: up4.id }),
      expect.objectContaining({ id: up3.id }),
      expect.objectContaining({ id: up2.id }),
      expect.objectContaining({ id: up1.id }),
    ])
  })

  it('should be able to get the uploads', async () => {
    const namePattern = `${randomUUID()}.jpg`

    const [up1, up2, up3, up4, up5] = await Promise.all([
      makeUpload({ name: namePattern }),
      makeUpload({ name: namePattern }),
      makeUpload({ name: namePattern }),
      makeUpload({ name: namePattern }),
      makeUpload({ name: namePattern }),
    ])

    let sut = await getUploads({
      searchQuery: namePattern,
      pageSize: 3,
    })

    expect(isRight(sut)).toBe(true)
    expect(unwrapEither(sut).total).toEqual(5)
    expect(unwrapEither(sut).uploads).toEqual([
      expect.objectContaining({ id: up5.id }),
      expect.objectContaining({ id: up4.id }),
      expect.objectContaining({ id: up3.id }),
    ])

    sut = await getUploads({
      searchQuery: namePattern,
      pageSize: 3,
      page: 2,
    })

    expect(isRight(sut)).toBe(true)
    expect(unwrapEither(sut).total).toEqual(5)
    expect(unwrapEither(sut).uploads).toEqual([
      expect.objectContaining({ id: up2.id }),
      expect.objectContaining({ id: up1.id }),
    ])
  })

  it('should be able to get the uploads sorted', async () => {
    const namePattern = `${randomUUID()}.jpg`

    const [up1, up2, up3, up4, up5] = await Promise.all([
      makeUpload({ name: namePattern, createdAt: new Date() }),
      makeUpload({
        name: namePattern,
        createdAt: dayjs().subtract(1, 'days').toDate(),
      }),
      makeUpload({
        name: namePattern,
        createdAt: dayjs().subtract(2, 'days').toDate(),
      }),
      makeUpload({
        name: namePattern,
        createdAt: dayjs().subtract(3, 'days').toDate(),
      }),
      makeUpload({
        name: namePattern,
        createdAt: dayjs().subtract(4, 'days').toDate(),
      }),
    ])

    let sut = await getUploads({
      searchQuery: namePattern,
      sortBy: 'createdAt',
      sortDirection: 'asc',
    })

    expect(isRight(sut)).toBe(true)
    expect(unwrapEither(sut).total).toEqual(5)
    expect(unwrapEither(sut).uploads).toEqual([
      expect.objectContaining({ id: up5.id }),
      expect.objectContaining({ id: up4.id }),
      expect.objectContaining({ id: up3.id }),
      expect.objectContaining({ id: up2.id }),
      expect.objectContaining({ id: up1.id }),
    ])

    sut = await getUploads({
      searchQuery: namePattern,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    })

    expect(isRight(sut)).toBe(true)
    expect(unwrapEither(sut).total).toEqual(5)
    expect(unwrapEither(sut).uploads).toEqual([
      expect.objectContaining({ id: up1.id }),
      expect.objectContaining({ id: up2.id }),
      expect.objectContaining({ id: up3.id }),
      expect.objectContaining({ id: up4.id }),
      expect.objectContaining({ id: up5.id }),
    ])
  })
})
