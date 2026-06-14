import { request } from '../client'

export interface KbStats {
  total_documents: number
  total_chunks: number
  total_chars: number
  chroma_collection_count: number | string
  vectordb_size_bytes: number
  vectordb_size_mb: number
  sources: Record<string, number>
  kb_path: string
}

export interface KbDocument {
  doc_id: string
  title: string
  source: string
  chunks: number
  chars: number
  ingested_at: string
  filetype: string
}

export interface KbSearchResult {
  doc_id: string
  title: string
  chunk_index: number
  score: number
  content: string
  source: string
}

export interface KbIngestResult {
  success: boolean
  doc_id: string
  title: string
  chunks: number
  chars: number
  message: string
}

export interface KbListResponse {
  documents: KbDocument[]
  total: number
  overall_total?: number
}

export interface KbSearchResponse {
  query: string
  results: KbSearchResult[]
  total_found: number
  context_for_llm: string
  message: string
}

export async function fetchStats(): Promise<KbStats> {
  return request<KbStats>('/api/hermes/kb/stats')
}

export async function fetchDocuments(source?: string, limit?: number): Promise<KbListResponse> {
  const params = new URLSearchParams()
  if (source) params.set('source', source)
  if (limit) params.set('limit', String(limit))
  const query = params.toString()
  return request<KbListResponse>(`/api/hermes/kb/documents${query ? `?${query}` : ''}`)
}

export async function ingestContent(content: string, title: string, source?: string): Promise<KbIngestResult> {
  return request<KbIngestResult>('/api/hermes/kb/ingest', {
    method: 'POST',
    body: JSON.stringify({ content, title, source }),
  })
}

export async function ingestFile(filepath: string, title?: string, source?: string): Promise<KbIngestResult> {
  return request<KbIngestResult>('/api/hermes/kb/ingest', {
    method: 'POST',
    body: JSON.stringify({ filepath, title, source }),
  })
}

export async function uploadFile(file: File, title?: string, source?: string): Promise<KbIngestResult> {
  const formData = new FormData()
  formData.append('file', file)
  if (title) formData.append('title', title)
  if (source) formData.append('source', source)

  // Use fetch directly for FormData (multipart)
  const token = localStorage.getItem('apiKey') || ''
  const baseUrl = localStorage.getItem('baseUrl') || ''

  const res = await fetch(`${baseUrl}/api/hermes/kb/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed: ${res.status} ${text}`)
  }

  return res.json()
}

export async function searchDocuments(
  query: string,
  topK?: number,
  minScore?: number
): Promise<KbSearchResponse> {
  return request<KbSearchResponse>('/api/hermes/kb/search', {
    method: 'POST',
    body: JSON.stringify({ query, top_k: topK, min_score: minScore }),
  })
}

export async function deleteDocument(docId: string): Promise<{ success: boolean; doc_id: string; title: string; message: string }> {
  return request<{ success: boolean; doc_id: string; title: string; message: string }>(
    `/api/hermes/kb/documents/${docId}`,
    { method: 'DELETE' }
  )
}
