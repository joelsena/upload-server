import { randomUUID } from 'node:crypto'
import { basename, extname } from 'node:path'
import { Readable } from 'node:stream'
import { env } from '@/env'
import { Upload } from '@aws-sdk/lib-storage'
import { z } from 'zod'
import { r2 } from './client'

const uploadFileSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  contentStream: z.instanceof(Readable),
  folder: z.enum(['images', 'downloads']),
})

type UploadFile = z.input<typeof uploadFileSchema>

export async function uploadFileToStorage(file: UploadFile) {
  const { fileName, contentStream, contentType, folder } =
    uploadFileSchema.parse(file)

  const fileExt = extname(fileName)
  const fileNameWithoutExt = basename(fileName)
  // remove tudo o que não é alfanumérico
  const sanitizedFileName = fileNameWithoutExt.replace(/^[a-zA-Z0-9]/g, '')

  const uniqueFileName = `${folder}/${randomUUID()}-${sanitizedFileName.concat(fileExt)}`

  const upload = new Upload({
    client: r2,
    params: {
      Bucket: env.CLOUDFLARE_BUCKET,
      Key: uniqueFileName,
      Body: contentStream,
      ContentType: contentType,
    },
  })

  await upload.done()

  return {
    url: new URL(uniqueFileName, env.CLOUDFLARE_PUBLIC_URL).toString(),
    key: uniqueFileName,
  }
}
