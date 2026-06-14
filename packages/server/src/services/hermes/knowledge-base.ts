import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { homedir } from 'os'
import { logger } from '../logger'

const execFileAsync = promisify(execFile)

function getHermesHome(): string {
  const envHome = process.env.HERMES_HOME?.trim()
  if (envHome) return envHome

  // Windows: %LOCALAPPDATA%\hermes or $HOME\AppData\Local\hermes
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA
    if (localAppData) return resolve(localAppData, 'hermes')
    return resolve(homedir(), 'AppData', 'Local', 'hermes')
  }

  return resolve(homedir(), '.hermes')
}

function getHermesPython(): string {
  const hermesHome = getHermesHome()
  if (process.platform === 'win32') {
    return resolve(hermesHome, 'hermes-agent', 'venv', 'Scripts', 'python.exe')
  }
  return resolve(hermesHome, 'hermes-agent', 'venv', 'bin', 'python')
}

function getKbCliPath(): string {
  return resolve(getHermesHome(), 'hermes-agent', 'tools', 'kb_cli.py')
}

function runKbCli(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const pythonPath = getHermesPython()
  const cliPath = getKbCliPath()

  if (!existsSync(pythonPath)) {
    return Promise.reject(new Error(`Python not found at: ${pythonPath}`))
  }
  if (!existsSync(cliPath)) {
    return Promise.reject(new Error(`kb_cli.py not found at: ${cliPath}`))
  }

  const env = {
    ...process.env,
    HERMES_HOME: getHermesHome(),
  }

  logger.debug(`[kb-service] Running: ${pythonPath} ${cliPath} ${args.join(' ')}`)

  return execFileAsync(pythonPath, [cliPath, ...args], {
    env,
    windowsHide: true,
    timeout: 60000, // 60s timeout
    maxBuffer: 10 * 1024 * 1024, // 10MB
  })
}

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

function parseOutput(stdout: string): any {
  try {
    return JSON.parse(stdout.trim())
  } catch {
    throw new Error(`Failed to parse KB CLI output: ${stdout.slice(0, 200)}`)
  }
}

export async function getKbStats(): Promise<KbStats> {
  const { stdout } = await runKbCli(['stats'])
  return parseOutput(stdout)
}

export async function listDocuments(source?: string, limit?: number): Promise<{ documents: KbDocument[]; total: number }> {
  const args = ['list']
  if (source) args.push('--source', source)
  if (limit) args.push('--limit', String(limit))
  const { stdout } = await runKbCli(args)
  return parseOutput(stdout)
}

export async function ingestContent(content: string, title: string, source?: string): Promise<KbIngestResult> {
  const args = ['ingest', '--content', content, '--title', title]
  if (source) args.push('--source', source)
  const { stdout } = await runKbCli(args)
  return parseOutput(stdout)
}

export async function ingestFile(filepath: string, title?: string, source?: string): Promise<KbIngestResult> {
  const args = ['ingest', '--file', filepath]
  if (title) args.push('--title', title)
  if (source) args.push('--source', source)
  const { stdout } = await runKbCli(args)
  return parseOutput(stdout)
}

export async function searchDocuments(query: string, topK?: number, minScore?: number): Promise<{
  query: string
  results: KbSearchResult[]
  total_found: number
  context_for_llm: string
  message: string
}> {
  const args = ['search', '--query', query]
  if (topK) args.push('--top-k', String(topK))
  if (minScore !== undefined) args.push('--min-score', String(minScore))
  const { stdout } = await runKbCli(args)
  return parseOutput(stdout)
}

export async function deleteDocument(docId: string): Promise<{
  success: boolean
  doc_id: string
  title: string
  message: string
}> {
  const { stdout } = await runKbCli(['delete', '--doc-id', docId])
  return parseOutput(stdout)
}
