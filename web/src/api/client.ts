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
