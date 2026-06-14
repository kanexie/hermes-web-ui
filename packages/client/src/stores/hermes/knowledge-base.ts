import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { KbStats, KbDocument, KbSearchResult, KbIngestResult } from '@/api/hermes/knowledge-base'
import * as kbApi from '@/api/hermes/knowledge-base'

export const useKnowledgeBaseStore = defineStore('knowledgeBase', () => {
  const stats = ref<KbStats | null>(null)
  const documents = ref<KbDocument[]>([])
  const searchResults = ref<KbSearchResult[]>([])
  const searchQuery = ref('')
  const loading = ref(false)
  const searchLoading = ref(false)
  const error = ref<string | null>(null)

  async function loadStats() {
    try {
      stats.value = await kbApi.fetchStats()
    } catch (e: any) {
      error.value = e.message || 'Failed to load stats'
    }
  }

  async function loadDocuments(source?: string) {
    loading.value = true
    error.value = null
    try {
      const res = await kbApi.fetchDocuments(source)
      documents.value = res.documents
    } catch (e: any) {
      error.value = e.message || 'Failed to load documents'
    } finally {
      loading.value = false
    }
  }

  async function ingestText(content: string, title: string, source?: string): Promise<KbIngestResult | null> {
    loading.value = true
    error.value = null
    try {
      const result = await kbApi.ingestContent(content, title, source)
      await loadDocuments()
      await loadStats()
      return result
    } catch (e: any) {
      error.value = e.message || 'Failed to ingest content'
      return null
    } finally {
      loading.value = false
    }
  }

  async function uploadFile(file: File, title?: string, source?: string): Promise<KbIngestResult | null> {
    loading.value = true
    error.value = null
    try {
      const result = await kbApi.uploadFile(file, title, source)
      await loadDocuments()
      await loadStats()
      return result
    } catch (e: any) {
      error.value = e.message || 'Failed to upload file'
      return null
    } finally {
      loading.value = false
    }
  }

  async function search(query: string, topK?: number): Promise<KbSearchResult[]> {
    searchLoading.value = true
    error.value = null
    searchQuery.value = query
    try {
      const res = await kbApi.searchDocuments(query, topK)
      searchResults.value = res.results
      return res.results
    } catch (e: any) {
      error.value = e.message || 'Search failed'
      searchResults.value = []
      return []
    } finally {
      searchLoading.value = false
    }
  }

  async function deleteDoc(docId: string) {
    loading.value = true
    error.value = null
    try {
      await kbApi.deleteDocument(docId)
      await loadDocuments()
      await loadStats()
    } catch (e: any) {
      error.value = e.message || 'Failed to delete document'
    } finally {
      loading.value = false
    }
  }

  return {
    stats,
    documents,
    searchResults,
    searchQuery,
    loading,
    searchLoading,
    error,
    loadStats,
    loadDocuments,
    ingestText,
    uploadFile,
    search,
    deleteDoc,
  }
})
