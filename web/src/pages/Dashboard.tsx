import { Alert, Button, Card, Col, List, Row, Space, Statistic, Tag, Typography, message } from 'antd'
import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  generateDailyLearn,
  getAnalysisList,
  getLearnList,
  getMonitorList,
  getNewsList,
  getRange,
  refreshNews,
  type MonitorTarget,
} from '../api/client'

function todayLocalYYYYMMDD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function rowsFromRange(values: string[][] | null) {
  if (!values || values.length < 2) return []
  const header = values[0]
  return values.slice(1).map((r, i) => {
    const obj: Record<string, any> = { key: i }
    header.forEach((h, idx) => (obj[h || `col_${idx}`] = r[idx] ?? ''))
    return obj
  })
}

function parsePayload(payload: string | null | undefined): Record<string, any> | null {
  if (!payload) return null
  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

function parseChangedFields(changedFields: string | string[] | null | undefined): string[] {
  return Array.isArray(changedFields)
    ? changedFields
    : String(changedFields || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
}

function monitorStatusMeta(record: MonitorTarget) {
  const changed = parseChangedFields(record.latest_changed_fields)
  const payload = parsePayload(record.latest_raw_payload)
  if (changed.includes('fetch_error') || payload?.error) return { text: '抓取失败', color: 'red' as const }
  if (changed.length && !changed.includes('first_capture')) return { text: '检测到变化', color: 'orange' as const }
  if (changed.includes('first_capture')) return { text: '首次建档', color: 'blue' as const }
  if (record.latest_captured_at) return { text: '正常', color: 'green' as const }
  return { text: '未扫描', color: 'default' as const }
}

export default function Dashboard() {
  const today = todayLocalYYYYMMDD()

  const learnApiQ = useQuery({
    queryKey: ['learn-list', 'dashboard', today],
    queryFn: () => getLearnList({ page: 1, page_size: 20, date: today }),
  })
  const newsApiQ = useQuery({
    queryKey: ['news-list', 'dashboard', today],
    queryFn: () => getNewsList({ page: 1, page_size: 20, date: today }),
  })
  const analysisQ = useQuery({
    queryKey: ['analysis-list', 'dashboard'],
    queryFn: () => getAnalysisList({ page: 1, page_size: 10 }),
  })
  const monitorQ = useQuery({
    queryKey: ['monitor-list', 'dashboard'],
    queryFn: () => getMonitorList(),
  })

  const learnSheetQ = useQuery({
    queryKey: ['range', 'Learn_Top3', 'dashboard'],
    queryFn: () => getRange('Learn_Top3!A1:I200'),
    enabled: !(learnApiQ.data?.data.items?.length ?? 0),
  })
  const newsSheetQ = useQuery({
    queryKey: ['range', 'Daily_News', 'dashboard'],
    queryFn: () => getRange('Daily_News!A1:G200'),
    enabled: !(newsApiQ.data?.data.items?.length ?? 0),
  })

  const learnSyncM = useMutation({
    mutationFn: generateDailyLearn,
    onSuccess: async (resp) => {
      message.success(resp.message || 'Learn 同步完成')
      await Promise.all([learnApiQ.refetch(), learnSheetQ.refetch()])
    },
    onError: (err) => message.error(String(err)),
  })

  const newsSyncM = useMutation({
    mutationFn: refreshNews,
    onSuccess: async (resp) => {
      message.success(resp.message || 'News 同步完成')
      await Promise.all([newsApiQ.refetch(), newsSheetQ.refetch()])
    },
    onError: (err) => message.error(String(err)),
  })

  const learnRows = useMemo(() => {
    const apiItems = learnApiQ.data?.data.items || []
    if (apiItems.length) {
      return apiItems.map((item) => ({ key: `api-${item.id}`, title: item.title, score: item.score }))
    }
    const rows = rowsFromRange(learnSheetQ.data?.values || null)
    return rows
      .filter((x: any) => String(x['Date'] || '') === today)
      .map((x: any, idx: number) => ({ key: `sheet-${idx}`, title: String(x['Title'] || ''), score: Number(x['Score'] || 0) }))
  }, [learnApiQ.data, learnSheetQ.data, today])

  const newsRows = useMemo(() => {
    const apiItems = newsApiQ.data?.data.items || []
    if (apiItems.length) {
      return apiItems.map((item) => ({ key: `api-${item.id}`, title: item.title, type: item.news_type }))
    }
    const rows = rowsFromRange(newsSheetQ.data?.values || null)
    return rows
      .filter((x: any) => String(x['日期(UTC+8)'] || '') === today)
      .map((x: any, idx: number) => ({ key: `sheet-${idx}`, title: String(x['标题'] || ''), type: String(x['Source'] || x['类型'] || 'other') }))
  }, [newsApiQ.data, newsSheetQ.data, today])

  const analysisRows = useMemo(() => analysisQ.data?.data.items || [], [analysisQ.data])
  const monitorRows = useMemo(() => monitorQ.data?.data.items || [], [monitorQ.data])

  const latestAnalysis = analysisRows[0]
  const latestAnalysisPayload = parsePayload(latestAnalysis?.input_payload)
  const latestMonitor = monitorRows[0]
  const latestMonitorStatus = latestMonitor ? monitorStatusMeta(latestMonitor) : { text: '未扫描', color: 'default' as const }

  const learnUsingApi = (learnApiQ.data?.data.items || []).length > 0
  const newsUsingApi = (newsApiQ.data?.data.items || []).length > 0

  const monitorDoneCount = monitorRows.filter((x) => !!x.latest_captured_at).length
  const monitorFailedCount = monitorRows.filter((x) => monitorStatusMeta(x).text === '抓取失败').length
  const monitorChangedCount = monitorRows.filter((x) => monitorStatusMeta(x).text === '检测到变化').length
  const analysisSuccessCount = analysisRows.filter((x) => !!parsePayload(x.input_payload)?.fetch_ok).length

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Control UI 总览
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              今天：{today} ｜ 现在先把 learn / news / monitor / analysis 四块统一收口。
            </Typography.Paragraph>
          </Col>
          <Col xs={24} md={12}>
            <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button onClick={() => learnApiQ.refetch()}>刷新 Learn</Button>
              <Button onClick={() => newsApiQ.refetch()}>刷新 News</Button>
              <Button type="primary" loading={learnSyncM.isPending} onClick={() => learnSyncM.mutate()}>
                同步 Learn
              </Button>
              <Button type="primary" loading={newsSyncM.isPending} onClick={() => newsSyncM.mutate()}>
                同步 News
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {monitorFailedCount > 0 ? (
        <Alert showIcon type="error" message={`Monitor 当前有 ${monitorFailedCount} 个抓取失败项`} />
      ) : monitorChangedCount > 0 ? (
        <Alert showIcon type="warning" message={`Monitor 当前有 ${monitorChangedCount} 个检测到变化的目标`} />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card
            title="Learn 今日状态"
            extra={<Tag color={learnUsingApi ? 'green' : 'gold'}>{learnUsingApi ? 'API' : 'Sheet'}</Tag>}
          >
            {learnApiQ.isError && !learnUsingApi ? (
              <Alert type="warning" showIcon message="Learn API 暂不可用，已回退到 Sheet。" style={{ marginBottom: 12 }} />
            ) : null}
            <Statistic title="今日条目" value={learnRows.length} />
            <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 8 }}>
              最近 Top：{learnRows[0]?.title || '-'}
            </Typography.Paragraph>
            <a href="/learn">进入 Learn</a>
          </Card>
        </Col>

        <Col xs={24} md={12} xl={6}>
          <Card
            title="News 今日状态"
            extra={<Tag color={newsUsingApi ? 'green' : 'gold'}>{newsUsingApi ? 'API' : 'Sheet'}</Tag>}
          >
            {newsApiQ.isError && !newsUsingApi ? (
              <Alert type="warning" showIcon message="News API 暂不可用，已回退到 Sheet。" style={{ marginBottom: 12 }} />
            ) : null}
            <Statistic title="今日新闻" value={newsRows.length} />
            <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 8 }}>
              最近一条：{newsRows[0]?.title || '-'}
            </Typography.Paragraph>
            <a href="/news">进入 News</a>
          </Card>
        </Col>

        <Col xs={24} md={12} xl={6}>
          <Card title="Monitor 监控状态" extra={<Tag color={latestMonitorStatus.color}>{latestMonitorStatus.text}</Tag>}>
            <Statistic title="目标数" value={monitorRows.length} />
            <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 4 }}>
              已有快照：{monitorDoneCount}
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
              失败项：{monitorFailedCount} ｜ 变化项：{monitorChangedCount}
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
              最近目标：{latestMonitor ? `${latestMonitor.country} / ${latestMonitor.asin}` : '-'}
            </Typography.Paragraph>
            <a href="/comp">进入 Monitor</a>
          </Card>
        </Col>

        <Col xs={24} md={12} xl={6}>
          <Card title="Analysis 分析状态" extra={<Tag color={latestAnalysisPayload?.fetch_ok ? 'green' : 'gold'}>{latestAnalysisPayload?.fetch_ok ? '最近成功' : '含回退'}</Tag>}>
            <Statistic title="累计报告" value={analysisRows.length} />
            <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 4 }}>
              成功抓取：{analysisSuccessCount}
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
              最近分析：{latestAnalysis ? `${latestAnalysis.country} / ${latestAnalysis.asin}` : '-'}
            </Typography.Paragraph>
            <a href="/analysis">进入 Analysis</a>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="Learn / News 最近结果预览">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <Typography.Title level={5}>Learn</Typography.Title>
                <List
                  size="small"
                  dataSource={learnRows.slice(0, 3)}
                  locale={{ emptyText: '今天还没有 learn 数据' }}
                  renderItem={(item: any) => (
                    <List.Item>
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Typography.Text ellipsis>{item.title}</Typography.Text>
                        {'score' in item ? <Typography.Text type="secondary">score: {item.score || 0}</Typography.Text> : null}
                      </Space>
                    </List.Item>
                  )}
                />
              </div>

              <div>
                <Typography.Title level={5}>News</Typography.Title>
                <List
                  size="small"
                  dataSource={newsRows.slice(0, 5)}
                  locale={{ emptyText: '今天还没有 news 数据' }}
                  renderItem={(item: any) => (
                    <List.Item>
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Typography.Text ellipsis>{item.title}</Typography.Text>
                        {'type' in item ? <Typography.Text type="secondary">type: {item.type || '-'}</Typography.Text> : null}
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card title="Monitor / Analysis 最近结果预览">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <Typography.Title level={5}>Monitor</Typography.Title>
                <List
                  size="small"
                  dataSource={monitorRows.slice(0, 5)}
                  locale={{ emptyText: '还没有 monitor 目标' }}
                  renderItem={(item) => {
                    const status = monitorStatusMeta(item)
                    return (
                      <List.Item>
                        <Space direction="vertical" size={0} style={{ width: '100%' }}>
                          <Space>
                            <Typography.Text>{item.country} / {item.asin}</Typography.Text>
                            <Tag color={status.color}>{status.text}</Tag>
                          </Space>
                          <Typography.Text type="secondary">
                            最近扫描：{item.latest_captured_at || '未扫描'} ｜ 价格：{item.price_text || '-'}
                          </Typography.Text>
                        </Space>
                      </List.Item>
                    )
                  }}
                />
              </div>

              <div>
                <Typography.Title level={5}>Analysis</Typography.Title>
                <List
                  size="small"
                  dataSource={analysisRows.slice(0, 5)}
                  locale={{ emptyText: '还没有 analysis 报告' }}
                  renderItem={(item) => {
                    const payload = parsePayload(item.input_payload)
                    return (
                      <List.Item>
                        <Space direction="vertical" size={0} style={{ width: '100%' }}>
                          <Typography.Text>{item.country} / {item.asin}</Typography.Text>
                          <Typography.Text type="secondary" ellipsis>
                            {payload?.title || payload?.error || '无详情'}
                          </Typography.Text>
                        </Space>
                      </List.Item>
                    )
                  }}
                />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
