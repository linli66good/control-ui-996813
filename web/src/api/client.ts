import { http } from './http'

export type TabsResp = {
  tabs: Array<{ title: string; sheetId: number | null }>
}

export async function getTabs(): Promise<TabsResp> {
  const { data } = await http.get<TabsResp>('/v1/tabs')
  return data
}

export type RangeResp = {
  range: string
  values: string[][] | null
}

export async function getRange(A1: string): Promise<RangeResp> {
  const { data } = await http.get<RangeResp>('/v1/range', { params: { A1 } })
  return data
}

export type LearnCard = {
  id: number
  date: string
  title: string
  source_url: string
  source_domain: string
  score: number
  summary: string
  content: string
  market_feedback: string
  final_view: string
  is_top3: boolean
  created_at: string
  updated_at: string
}

export type LearnTop3Resp = {
  ok: boolean
  message: string
  data: {
    date: string
    items: LearnCard[]
  }
  meta: {
    count: number
  }
}

export type LearnListResp = {
  ok: boolean
  message: string
  data: {
    items: LearnCard[]
  }
  meta: {
    page: number
    page_size: number
    total: number
  }
}

export type LearnDetailResp = {
  ok: boolean
  message: string
  data: LearnCard | null
  meta: Record<string, never>
}

export async function getLearnTop3(date?: string): Promise<LearnTop3Resp> {
  const { data } = await http.get<LearnTop3Resp>('/v1/learn/top3', { params: { date } })
  return data
}

export async function getLearnList(params?: {
  page?: number
  page_size?: number
  date?: string
  keyword?: string
}): Promise<LearnListResp> {
  const { data } = await http.get<LearnListResp>('/v1/learn/list', { params })
  return data
}

export async function getLearnDetail(itemId: number): Promise<LearnDetailResp> {
  const { data } = await http.get<LearnDetailResp>(`/v1/learn/${itemId}`)
  return data
}

export async function generateDailyLearn() {
  const { data } = await http.post('/v1/learn/generate-daily')
  return data as { ok: boolean; message: string; data: any; meta: any }
}

export type NewsItem = {
  id: number
  news_date: string
  news_type: string
  title: string
  source: string
  source_url: string
  summary: string
  content: string
  sort_order: number
  created_at: string
  updated_at: string
}

export type NewsDailyResp = {
  ok: boolean
  message: string
  data: {
    date: string
    amazon: NewsItem[]
    ai: NewsItem[]
    other: NewsItem[]
  }
  meta: {
    amazon_count: number
    ai_count: number
    other_count: number
  }
}

export type NewsListResp = {
  ok: boolean
  message: string
  data: {
    items: NewsItem[]
  }
  meta: {
    page: number
    page_size: number
    total: number
    type: string | null
    date: string | null
  }
}

export async function getNewsDaily(date?: string): Promise<NewsDailyResp> {
  const { data } = await http.get<NewsDailyResp>('/v1/news/daily', { params: { date } })
  return data
}

export async function getNewsList(params?: {
  page?: number
  page_size?: number
  news_type?: string
  date?: string
}): Promise<NewsListResp> {
  const { data } = await http.get<NewsListResp>('/v1/news/list', { params })
  return data
}

export async function refreshNews() {
  const { data } = await http.post('/v1/news/refresh')
  return data as { ok: boolean; message: string; data: any; meta: any }
}

export type AnalysisReport = {
  id: number
  country: string
  asin: string
  input_payload: string
  report_markdown: string
  created_at: string
  updated_at: string
}

export type AnalysisListResp = {
  ok: boolean
  message: string
  data: { items: AnalysisReport[] }
  meta: { page: number; page_size: number; total: number }
}

export type AnalysisDetailResp = {
  ok: boolean
  message: string
  data: AnalysisReport | null
  meta: Record<string, never>
}

export type AnalysisCreateResp = {
  ok: boolean
  message: string
  data: AnalysisReport
  meta: Record<string, never>
}

export async function getAnalysisList(params?: {
  page?: number
  page_size?: number
  country?: string
  asin?: string
}): Promise<AnalysisListResp> {
  const { data } = await http.get<AnalysisListResp>('/v1/analysis/list', { params })
  return data
}

export async function getAnalysisDetail(reportId: number): Promise<AnalysisDetailResp> {
  const { data } = await http.get<AnalysisDetailResp>(`/v1/analysis/${reportId}`)
  return data
}

export async function createAnalysis(payload: {
  country: string
  asin: string
  note?: string
}): Promise<AnalysisCreateResp> {
  const { data } = await http.post<AnalysisCreateResp>('/v1/analysis/create', payload)
  return data
}

export type MonitorTarget = {
  id: number
  country: string
  asin: string
  enabled: number
  note: string
  created_at: string
  updated_at: string
  price_text?: string
  latest_title?: string
  latest_captured_at?: string
  latest_changed_fields?: string
  latest_raw_payload?: string
}

export type MonitorSnapshot = {
  id: number
  target_id: number
  price_text: string
  title: string
  main_image_url: string
  a_plus_text: string
  changed_fields: string
  raw_payload: string
  captured_at: string
}

export type MonitorListResp = {
  ok: boolean
  message: string
  data: { items: MonitorTarget[] }
  meta: { total: number }
}

export type MonitorDetailResp = {
  ok: boolean
  message: string
  data: {
    target: MonitorTarget | null
    latest_snapshot: MonitorSnapshot | null
  }
  meta: Record<string, never>
}

export type MonitorSnapshotsResp = {
  ok: boolean
  message: string
  data: { items: MonitorSnapshot[] }
  meta: { target_id: number; total: number }
}

export async function getMonitorList(): Promise<MonitorListResp> {
  const { data } = await http.get<MonitorListResp>('/v1/monitor/list')
  return data
}

export async function createMonitorTarget(payload: {
  country: string
  asin: string
  note?: string
}) {
  const { data } = await http.post('/v1/monitor/create', payload)
  return data
}

export async function deleteMonitorTarget(targetId: number) {
  const { data } = await http.post('/v1/monitor/delete', null, { params: { target_id: targetId } })
  return data
}

export async function runMonitorTarget(targetId: number) {
  const { data } = await http.post('/v1/monitor/run', { target_id: targetId })
  return data
}

export async function getMonitorDetail(targetId: number): Promise<MonitorDetailResp> {
  const { data } = await http.get<MonitorDetailResp>(`/v1/monitor/${targetId}`)
  return data
}

export async function getMonitorSnapshots(targetId: number): Promise<MonitorSnapshotsResp> {
  const { data } = await http.get<MonitorSnapshotsResp>(`/v1/monitor/${targetId}/snapshots`)
  return data
}
