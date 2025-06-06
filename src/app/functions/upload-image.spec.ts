import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { db } from '@/infra/db'
import { schema } from '@/infra/db/schemas'
import { isLeft, isRight, unwrapEither } from '@/shared/either'
import { fakerPT_BR as faker } from '@faker-js/faker'
import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { InvalidFileFormat } from './errors/invalid-file-format'
import { uploadImage } from './upload-image'

describe('upload image', () => {
  beforeAll(() => {
    vi.mock('@/infra/storage/upload-file-to-storage.ts', () => {
      const fileName = faker.system.fileName()
      return {
        uploadFileToStorage: vi.fn().mockImplementation(() => ({
          url: `https://example.com/${fileName}`,
          key: `images/${fileName}`,
        })),
      }
    })
  })

  it('should be able to upload an image', async () => {
    const fileName = `${randomUUID()}.jpg`

    const sut = await uploadImage({
      fileName,
      contentStream: Readable.from('test'),
      contentType: 'image/png',
    })

    expect(isRight(sut)).toBe(true)

    const result = await db
      .select()
      .from(schema.uploads)
      .where(eq(schema.uploads.name, fileName))

    expect(result).toHaveLength(1)
  })

  it('should not be able to upload a non-image file', async () => {
    const fileName = `${randomUUID()}.jpg`

    const sut = await uploadImage({
      fileName,
      contentStream: Readable.from('test'),
      contentType: 'document/pdf',
    })

    expect(isLeft(sut)).toBe(true)
    expect(unwrapEither(sut)).toBeInstanceOf(InvalidFileFormat)
  })
})
