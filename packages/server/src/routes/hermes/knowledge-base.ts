import Router from '@koa/router'
import * as ctrl from '../../controllers/hermes/knowledge-base'

export const knowledgeBaseRoutes = new Router()

knowledgeBaseRoutes.get('/api/hermes/kb/stats', ctrl.stats)
knowledgeBaseRoutes.get('/api/hermes/kb/documents', ctrl.list)
knowledgeBaseRoutes.post('/api/hermes/kb/ingest', ctrl.ingest)
knowledgeBaseRoutes.post('/api/hermes/kb/upload', ctrl.upload)
knowledgeBaseRoutes.post('/api/hermes/kb/search', ctrl.search)
knowledgeBaseRoutes.get('/api/hermes/kb/search', ctrl.search)
knowledgeBaseRoutes.delete('/api/hermes/kb/documents/:id', ctrl.remove)
