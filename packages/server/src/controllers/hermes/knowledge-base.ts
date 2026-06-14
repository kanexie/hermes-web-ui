import * as kbService from '../../services/hermes/knowledge-base'
import { logger } from '../../services/logger'

export async function stats(ctx: any) {
  try {
    const data = await kbService.getKbStats()
    ctx.body = data
  } catch (err: any) {
    logger.error('[kb-controller] stats failed: %s', err.message)
    ctx.status = 500
    ctx.body = { error: err.message }
  }
}

export async function list(ctx: any) {
  try {
    const source = ctx.query.source as string | undefined
    const limit = ctx.query.limit ? parseInt(ctx.query.limit as string, 10) || 50 : 50
    const data = await kbService.listDocuments(source, limit)
    ctx.body = data
  } catch (err: any) {
    logger.error('[kb-controller] list failed: %s', err.message)
    ctx.status = 500
    ctx.body = { error: err.message }
  }
}

export async function ingest(ctx: any) {
  try {
    const { content, title, source, filepath } = ctx.request.body || {}

    let result
    if (filepath) {
      result = await kbService.ingestFile(filepath, title, source)
    } else if (content) {
      result = await kbService.ingestContent(content, title || 'Untitled', source)
    } else {
      ctx.status = 400
      ctx.body = { error: 'Either "content" or "filepath" is required.' }
      return
    }

    ctx.body = result
  } catch (err: any) {
    logger.error('[kb-controller] ingest failed: %s', err.message)
    ctx.status = 500
    ctx.body = { error: err.message }
  }
}

export async function search(ctx: any) {
  try {
    const { query, top_k, min_score } = ctx.request.body || ctx.query || {}
    if (!query) {
      ctx.status = 400
      ctx.body = { error: '"query" is required.' }
      return
    }
    const data = await kbService.searchDocuments(
      query,
      top_k ? parseInt(String(top_k), 10) : 5,
      min_score !== undefined ? parseFloat(String(min_score)) : undefined
    )
    ctx.body = data
  } catch (err: any) {
    logger.error('[kb-controller] search failed: %s', err.message)
    ctx.status = 500
    ctx.body = { error: err.message }
  }
}

export async function remove(ctx: any) {
  try {
    const docId = ctx.params.id as string
    if (!docId) {
      ctx.status = 400
      ctx.body = { error: '"id" is required.' }
      return
    }
    const data = await kbService.deleteDocument(docId)
    ctx.body = data
  } catch (err: any) {
    logger.error('[kb-controller] delete failed: %s', err.message)
    ctx.status = 500
    ctx.body = { error: err.message }
  }
}

export async function upload(ctx: any) {
  try {
    const files = ctx.request.files as any
    if (!files || !files.file) {
      ctx.status = 400
      ctx.body = { error: 'No file uploaded.' }
      return
    }

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file
    const filepath = uploadedFile.filepath || uploadedFile.path
    const title = (ctx.request.body as any)?.title || undefined
    const source = (ctx.request.body as any)?.source || 'upload'

    if (!filepath) {
      ctx.status = 400
      ctx.body = { error: 'File upload failed: no filepath.' }
      return
    }

    logger.info('[kb-controller] Uploading file: %s (title: %s)', filepath, title)
    const result = await kbService.ingestFile(filepath, title, source)
    ctx.body = result
  } catch (err: any) {
    logger.error('[kb-controller] upload failed: %s', err.message)
    ctx.status = 500
    ctx.body = { error: err.message }
  }
}
