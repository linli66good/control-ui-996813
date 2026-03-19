import { http } from './http'

export type SystemStatusResp = {
  ok: boolean
  message: string
  data: {
    api_ok: boolean
    db_path: string
    db_exists: boolean
    sheet_id_configured: boolean
    api_shared_secret_configured: boolean
    feishu_monitor_webhook_configured: boolean
    learn_last_sync_at: string | null
    news_last_sync_at: string | null
    monitor_last_scan_at: string | null
    analysis_last_report_at: string | null
    monitor_target_total: number
    monitor_target_enabled: number
    api_base_hint: string
    app_base_hint: string
  }
  meta: Record<string, never>
}

export async function getSystemStatus(): Promise<SystemStatusResp> {
  const { data } = await http.get<SystemStatusResp>('/v1/system/status')
  return data
}
