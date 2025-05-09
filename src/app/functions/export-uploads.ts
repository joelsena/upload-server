import { PassThrough, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { db, pg } from '@/infra/db'
import { schema } from '@/infra/db/schemas'
import { uploadFileToStorage } from '@/infra/storage/upload-file-to-storage'
import { type Either, makeRight } from '@/shared/either'
import { stringify } from 'csv-stringify'
import { ilike } from 'drizzle-orm'
import { z } from 'zod'

const exportUploadsInput = z.object({
  searchQuery: z.string().optional(),
})

type ExportUploadsInput = z.input<typeof exportUploadsInput>

type ExportUploadsOutput = {
  reportUrl: string
}

// ao exportar um arquivo populando-o com dados do banco é importante seguir algumas recomendações:
// 1. O arquivo deve ser gerado em um formato que seja fácil de ler e manipular, como CSV ou JSON.
// 2. O arquivo deve conter apenas os dados necessários para a exportação, evitando incluir informações sensíveis ou desnecessárias.
// 3. As querys para o banco de dados não podem ser armazenadas em memória, pois isso vai causar problemas de desempenho e segurança.
// 3.1 Uma solução para isso é utilizar o cursor pattern do postgres, que permite consumir os registros aos poucos, evitando o armazenamento em memória.
// 4. Evitar de armazenar dados em memória no geral.
// 5. Utilizar estratégias como o streaming para lidar com grandes volumes de dados aos poucos tanto na leitura quanto na 'escrita'.
export async function exportUploads(
  input: ExportUploadsInput
): Promise<Either<never, ExportUploadsOutput>> {
  const { searchQuery } = exportUploadsInput.parse(input)

  // params = parâmetros utilizados na query
  const { sql, params } = db
    .select({
      id: schema.uploads.id,
      name: schema.uploads.name,
      remoteUrl: schema.uploads.remoteUrl,
      createdAt: schema.uploads.createdAt,
    })
    .from(schema.uploads)
    .where(
      searchQuery ? ilike(schema.uploads.name, `%${searchQuery}%`) : undefined
    )
    .toSQL()

  // unsafe = não segura, porque permite executar qualquer query SQL diretamente no banco
  const cursor = pg.unsafe(sql, params as string[]).cursor(2)

  const csv = stringify({
    delimiter: ',',
    header: true,
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Name' },
      { key: 'remote_url', header: 'URL' },
      { key: 'created_at', header: 'Uploaded at' },
    ],
  })

  // como é um passthrough ele vai repassar os dados da stream csv como stream para o contentStream
  const uploadToStorageStream = new PassThrough()

  const uploadToStorage = uploadFileToStorage({
    contentType: 'text/csv',
    folder: 'downloads',
    fileName: `uploads-${new Date().toISOString()}.csv`,
    contentStream: uploadToStorageStream,
  })

  // cria uma linha de processamento (pipeline) que utilizando de streams de entrada (leitura), N streams de transform no meio e uma stream de saída (escrita)
  const convertToCSVPipeline = pipeline(
    cursor,
    new Transform({
      objectMode: true,
      transform(chunks: unknown[], encoding, callback) {
        // cada pedacinho recebido do cursor é transformado e enviado singularmente para a stream de escrita do CSV
        for (const chunk of chunks) {
          this.push(chunk)
        }

        // o callback é chamado quando a transformação é concluída, para que a stream continue a processar os dados
        callback()
      },
    }),
    csv,
    uploadToStorageStream
  )

  const [{ url }] = await Promise.all([uploadToStorage, convertToCSVPipeline])

  return makeRight({
    reportUrl: url,
  })
}
