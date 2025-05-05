import { uploadImage } from '@/app/functions/upload-image'
import { db } from '@/infra/db'
import { schema } from '@/infra/db/schemas'
import { isRight, unwrapEither } from '@/shared/either'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

export const uploadImageRoute: FastifyPluginAsyncZod = async server => {
  server.post(
    '/upload',
    {
      schema: {
        summary: 'Upload an image',
        consumes: ['multipart/form-data'],
        response: {
          201: z.null().describe('Upload successful'),
          400: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const uploadFile = await request.file({
        limits: {
          fileSize: 1024 * 1024 * 5, // 5MB
        },
      })

      if (!uploadFile) {
        return reply.status(400).send({
          message: 'File not found',
        })
      }

      const res = await uploadImage({
        fileName: uploadFile.filename,
        contentStream: uploadFile.file,
        contentType: uploadFile.mimetype,
      })

      if (isRight(res)) {
        return reply.status(201).send()
      }

      const error = unwrapEither(res)

      switch (error.constructor.name) {
        case 'InvalidFileFormat':
          return reply.status(400).send({
            message: 'Invalid file format',
          })
      }
    }
  )
}
