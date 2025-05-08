import { db } from '@/infra/db'
import { schema } from '@/infra/db/schemas'
import { makeRight } from '@/shared/either'
import type { Either } from '@/shared/either'
import { asc, count, desc, ilike } from 'drizzle-orm'
import { z } from 'zod'

const getUploadsInput = z.object({
  searchQuery: z.string().optional(),
  sortBy: z.enum(['createdAt']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  page: z.number().optional().default(1),
  pageSize: z.number().optional().default(20),
})

type GetUploadsInput = z.input<typeof getUploadsInput>

type GetUploadsOutput = {
  uploads: {
    id: string
    name: string
    remoteKey: string
    remoteUrl: string
    createdAt: Date
  }[]
  total: number
}

// retornando never indica que não é para ser retornado erro esperado
export async function getUploads(
  input: GetUploadsInput
): Promise<Either<never, GetUploadsOutput>> {
  const { searchQuery, sortBy, sortDirection, page, pageSize } =
    getUploadsInput.parse(input)

  // ilike = insensitive case like
  // QUERY => pesquisa registros exatamente iguais a query
  // %_QUERY => pesquisa registros que terminam com a query
  // QUERY_% => pesquisa registros que começam com a query
  // %_QUERY_% => pesquisa registros que possuem a query em algum lugar
  const uploadsFilteredQuery = db
    .select({
      id: schema.uploads.id,
      name: schema.uploads.name,
      remoteKey: schema.uploads.remoteKey,
      remoteUrl: schema.uploads.remoteUrl,
      createdAt: schema.uploads.createdAt,
    })
    .from(schema.uploads)
    .where(
      searchQuery ? ilike(schema.uploads.name, `%${searchQuery}%`) : undefined
    )
    .orderBy(fields => {
      if (sortBy && sortDirection === 'asc') {
        return asc(fields[sortBy])
      }

      if (sortBy && sortDirection === 'desc') {
        return desc(fields[sortBy])
      }

      return desc(fields.id)
    })
    .offset((page - 1) * pageSize) // pula x registros
    .limit(pageSize) // só retorna o tanto que suporta o pageSize

  const totalFilteredUploadsQuery = db
    .select({ total: count(schema.uploads.id) })
    .from(schema.uploads)
    .where(
      searchQuery ? ilike(schema.uploads.name, `%${searchQuery}%`) : undefined
    )

  const [uploads, [{ total }]] = await Promise.all([
    uploadsFilteredQuery,
    totalFilteredUploadsQuery,
  ])

  return makeRight({
    uploads,
    total,
  })
}
