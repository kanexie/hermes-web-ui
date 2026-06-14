<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue'
import {
  NButton, NCard, NDataTable, NInput, NModal,
  NSpace, NStatistic, NTag, NUpload, NUploadDragger, NText,
  NSpin, NGrid, NGi, NDivider, NPopconfirm, NEmpty, useMessage,
} from 'naive-ui'
import { useKnowledgeBaseStore } from '@/stores/hermes/knowledge-base'
import type { DataTableColumns, UploadFileInfo } from 'naive-ui'

const message = useMessage()
const store = useKnowledgeBaseStore()

const searchQuery = ref('')
const ingestModalVisible = ref(false)
const searchModalVisible = ref(false)
const ingestText = ref('')
const ingestTitle = ref('')
const ingestSource = ref('manual')

const statsGrid = computed(() => [
  { label: 'Total Documents', value: store.stats?.total_documents ?? 0 },
  { label: 'Total Chunks', value: store.stats?.total_chunks ?? 0 },
  { label: 'Total Characters', value: formatNumber(store.stats?.total_chars ?? 0) },
  { label: 'Vector DB Size', value: `${store.stats?.vectordb_size_mb ?? 0} MB` },
])

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}

const columns: DataTableColumns<any> = [
  { title: 'Title', key: 'title', ellipsis: { tooltip: true }, width: 250 },
  { title: 'Source', key: 'source', width: 100, render: (row) => h(NTag, { size: 'small', bordered: false }, () => row.source) },
  { title: 'Chunks', key: 'chunks', width: 80, align: 'right' },
  { title: 'Size', key: 'chars', width: 80, align: 'right', render: (row) => formatNumber(row.chars) },
  { title: 'Type', key: 'filetype', width: 70 },
  { title: 'Ingested At', key: 'ingested_at', width: 180, render: (row) => formatDate(row.ingested_at) },
  {
    title: 'Actions',
    key: 'actions',
    width: 80,
    render: (row) =>
      h(NPopconfirm, { onPositiveClick: () => handleDelete(row.doc_id) }, {
        trigger: () => h(NButton, { size: 'small', type: 'error', secondary: true }, () => 'Delete'),
        default: () => 'Delete this document and all its chunks?',
      }),
  },
]

async function handleDelete(docId: string) {
  await store.deleteDoc(docId)
  message.success('Document deleted')
}

async function handleSearch() {
  if (!searchQuery.value.trim()) return
  await store.search(searchQuery.value.trim(), 10)
}

async function handleIngestText() {
  if (!ingestText.value.trim() || !ingestTitle.value.trim()) {
    message.warning('Title and content are required')
    return
  }
  const result = await store.ingestText(ingestText.value, ingestTitle.value, ingestSource.value)
  if (result) {
    message.success(result.message)
    ingestModalVisible.value = false
    ingestText.value = ''
    ingestTitle.value = ''
  }
}

async function handleFileUpload(options: { file: UploadFileInfo; onFinish: () => void; onError: () => void }) {
  const rawFile = options.file.file
  if (!rawFile) {
    options.onError()
    return
  }
  const result = await store.uploadFile(rawFile)
  if (result) {
    message.success(result.message)
    options.onFinish()
  } else {
    options.onError()
  }
}

onMounted(async () => {
  await Promise.all([store.loadStats(), store.loadDocuments()])
})
</script>

<template>
  <div class="kb-view">
    <header class="page-header">
      <h2 class="header-title">Knowledge Base</h2>
      <NSpace>
        <NButton @click="ingestModalVisible = true" type="primary">Add Document</NButton>
        <NButton @click="searchModalVisible = true">Search</NButton>
      </NSpace>
    </header>

    <!-- Stats Cards -->
    <NGrid :cols="4" :x-gap="16" style="margin-top: 16px">
      <NGi v-for="stat in statsGrid" :key="stat.label">
        <NCard size="small">
          <NStatistic :label="stat.label" :value="stat.value" />
        </NCard>
      </NGi>
    </NGrid>

    <!-- Documents Table -->
    <NCard title="Documents" style="margin-top: 16px" :bordered="false">
      <NSpin :show="store.loading">
        <NDataTable
          v-if="store.documents.length > 0"
          :columns="columns"
          :data="store.documents"
          :row-key="(row: any) => row.doc_id"
          :pagination="{ pageSize: 20 }"
          size="small"
        />
        <NEmpty v-else description="No documents in knowledge base. Click 'Add Document' to get started." />
      </NSpin>
    </NCard>

    <!-- Ingest Modal -->
    <NModal v-model:show="ingestModalVisible" title="Add Document to Knowledge Base" style="width: 800px">
      <NCard :bordered="false">
        <NSpace vertical>
          <NText strong>Paste Content</NText>
          <NInput v-model:value="ingestTitle" placeholder="Document title" style="margin-bottom: 8px" />
          <NInput
            v-model:value="ingestText"
            type="textarea"
            placeholder="Paste your document content here (Markdown, text, etc.)"
            :rows="10"
          />
          <NInput v-model:value="ingestSource" placeholder="Source (e.g. manual, import, web)" />
          <NButton type="primary" @click="handleIngestText" :loading="store.loading">
            Ingest Content
          </NButton>
        </NSpace>
      <NDivider>or</NDivider>
        <NText strong style="margin-bottom: 8px; display: block">Upload File</NText>
        <NUpload
          :custom-request="handleFileUpload"
          accept=".md,.txt,.pdf,.docx,.py,.js,.ts,.json,.yaml,.yml,.html,.css,.csv"
          :max="1"
        >
          <NUploadDragger>
            <div style="padding: 20px 0">
              <NText style="font-size: 16px">Click or drag file here</NText>
              <NText depth="3" style="display: block; margin-top: 8px">
                Supports: Markdown, PDF, Word, Text, Code files
              </NText>
            </div>
          </NUploadDragger>
        </NUpload>
      </NCard>
    </NModal>

    <!-- Search Modal -->
    <NModal v-model:show="searchModalVisible" title="Search Knowledge Base" style="width: 800px">
      <NCard :bordered="false">
        <NSpace vertical>
          <NSpace>
            <NInput
              v-model:value="searchQuery"
              placeholder="Enter your search query..."
              style="width: 500px"
              @keyup.enter="handleSearch"
            />
            <NButton type="primary" @click="handleSearch" :loading="store.searchLoading">
              Search
            </NButton>
          </NSpace>

          <NSpin :show="store.searchLoading">
            <div v-if="store.searchResults.length > 0">
              <NText depth="3" style="margin-bottom: 12px; display: block">
                Found {{ store.searchResults.length }} results
              </NText>
              <NCard
                v-for="(result, idx) in store.searchResults"
                :key="idx"
                size="small"
                style="margin-bottom: 12px"
              >
                <template #header>
                  <NSpace align="center">
                    <NTag size="small" type="info">{{ result.score.toFixed(2) }}</NTag>
                    <NText strong>{{ result.title }}</NText>
                  </NSpace>
                </template>
                <NText>{{ result.content.slice(0, 500) }}{{ result.content.length > 500 ? '...' : '' }}</NText>
                <template #footer>
                  <NText depth="3" style="font-size: 12px">
                    Source: {{ result.source }} | Chunk: {{ result.chunk_index }}
                  </NText>
                </template>
              </NCard>
            </div>
            <NEmpty v-else-if="store.searchQuery && !store.searchLoading" description="No results found." />
          </NSpin>
        </NSpace>
      </NCard>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.kb-view {
  padding: 16px 24px;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
