import { randomUUID } from 'node:crypto'
import { exportUploads } from '@/app/functions/export-uploads'
import { makeUpload } from '@/tests/factories/make-upload'
import { describe, expect, it } from 'vitest'

describe('export uploads', () => {
  it('should be able to export uploads', async () => {
    const namePattern = randomUUID()

    const [up1, up2, up3, up4, up5] = await Promise.all([
      makeUpload({ name: namePattern }),
      makeUpload({ name: namePattern }),
      makeUpload({ name: namePattern }),
      makeUpload({ name: namePattern }),
      makeUpload({ name: namePattern }),
    ])

    const sut = await exportUploads({
      searchQuery: namePattern,
    })
  })
})
