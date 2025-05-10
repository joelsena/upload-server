import { randomUUID } from 'node:crypto'
import { exportUploads } from '@/app/functions/export-uploads'
import * as uploadFileToStorage from '@/infra/storage/upload-file-to-storage'
import { isRight, unwrapEither } from '@/shared/either'
import { makeUpload } from '@/tests/factories/make-upload'
import { describe, expect, it, vi } from 'vitest'

describe('export uploads', () => {
  it('should be able to export uploads', async () => {
    // spy => monitorar que algo foi executado
    // stub => implementar/modificar o comportamento de algo
    const uploadStub = vi
      .spyOn(uploadFileToStorage, 'uploadFileToStorage')
      .mockImplementationOnce(async () => {
        return {
          key: `${randomUUID()}.csv`,
          url: 'https://example.com/file.csv',
        }
      })

    const fileName = randomUUID()

    const up1 = await makeUpload({ name: fileName })
    const up2 = await makeUpload({ name: fileName })
    const up3 = await makeUpload({ name: fileName })
    const up4 = await makeUpload({ name: fileName })
    const up5 = await makeUpload({ name: fileName })

    const sut = await exportUploads({
      searchQuery: fileName,
    })

    expect(isRight(sut)).toBe(true)
    expect(unwrapEither(sut)).toEqual({
      reportUrl: 'https://example.com/file.csv',
    })

    const csvStream = uploadStub.mock.calls[0][0].contentStream

    // usa promise porque dessa forma garante que o teste espera a stream completar para resolver a promise e retornar o csv completo como string
    const csvAsString = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = []

      csvStream.on('data', chunk => chunks.push(chunk))

      csvStream.on('end', () => resolve(Buffer.concat(chunks).toString()))

      csvStream.on('error', err => reject(err))
    })

    const splitedCsv = csvAsString
      .trim()
      .split('\n')
      .map(row => row.split(','))

    expect(splitedCsv).toEqual([
      ['ID', 'Name', 'URL', 'Uploaded at'],
      [up1.id, up1.name, up1.remoteUrl, expect.any(String)],
      [up2.id, up2.name, up2.remoteUrl, expect.any(String)],
      [up3.id, up3.name, up3.remoteUrl, expect.any(String)],
      [up4.id, up4.name, up4.remoteUrl, expect.any(String)],
      [up5.id, up5.name, up5.remoteUrl, expect.any(String)],
    ])
  })
})
