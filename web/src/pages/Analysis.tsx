import { Alert, Button, Card, Descriptions, Drawer, Form, Input, List, Space, Table, Tag, Typography, message } from 'antd'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createAnalysis, getAnalysisDetail, getAnalysisList, type AnalysisReport } from '../api/client'

function parsePayload(payload: string | null | undefined): Record<string, any> | null {
  if (!payload) return null
  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

function parseMarkdownSections(markdown: string | null | undefined): { title: string; body: string[] }[] {
  const text = String(markdown || '')
  const lines = text.split('\n')
  const sections: { title: string; body: string[] }[] = []
  let current: { title: string; body: string[] } | null = null

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith('## ')) {
      current = { title: line.replace(/^##\s+/, '').trim(), body: [] }
      sections.push(current)
      continue
    }
    if (line.startsWith('# ')) continue
    if (!current) continue
    current.body.push(line)
  }
  return sections
}

function fetchMeta(report: AnalysisReport) {
  const payload = parsePayload(report.input_payload)
  const ok = !!payload?.fetch_ok
  const mode = payload?.source_mode || '-'
  return {
    ok,
    payload,
    statusText: ok ? '抓取成功' : '回退/失败',
    statusColor: ok ? 'green' : ('orange' as const),
    modeColor: mode === 'direct_html' ? ('blue' as const) : mode === 'mirror_markdown' ? ('gold' as const) : ('default' as const),
  }
}

export default function Analysis() {
  const [searchParams] = useSearchParams()
  const presetCountry = String(searchParams.get('country') || 'US').toUpperCase()
  const presetAsin = String(searchParams.get('asin') || '').toUpperCase()

  const [country, setCountry] = useState(presetCountry)
  const [asin, setAsin] = useState(presetAsin)
  const [note, setNote] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const listQ = useQuery({
    queryKey: ['analysis-list'],
    queryFn: () => getAnalysisList({ page: 1, page_size: 50 }),
  })

  const detailQ = useQuery({
    queryKey: ['analysis-detail', selectedId],
    queryFn: () => getAnalysisDetail(selectedId as number),
    enabled: !!selectedId,
  })

  const createM = useMutation({
    mutationFn: createAnalysis,
    onSuccess: async (resp) => {
      message.success(resp.message || '已生成分析')
      setSelectedId(resp.data.id)
      await listQ.refetch()
    },
    onError: (err) => message.error(String(err)),
  })

  const rows = useMemo(() => listQ.data?.data.items || [], [listQ.data])
  const current: AnalysisReport | null = detailQ.data?.data || null
  const currentMeta = current ? fetchMeta(current) : null
  const currentPayload = currentMeta?.payload || null
  const currentSections = useMemo(() => parseMarkdownSections(current?.report_markdown), [current?.report_markdown])

  return (
    <>
      <Card title="竞品分析" style={{ marginBottom: 16 }}>
        <Form layout="inline" onFinish={() => createM.mutate({ country, asin, note })}>
          <Form.Item label="国家">
            <Input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} style={{ width: 100 }} />
          </Form.Item>
          <Form.Item label="ASIN">
            <Input value={asin} onChange={(e) => setAsin(e.target.value.toUpperCase())} style={{ width: 180 }} />
          </Form.Item>
          <Form.Item label="备注">
            <Input value={note} onChange={(e) => setNote(e.target.value)} style={{ width: 260 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createM.isPending} disabled={!country || !asin}>
              生成分析
            </Button>
          </Form.Item>
        </Form>
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          现在会优先直抓 Amazon，遇到风控页自动回退镜像；报告内容也已经按「基础信息 / 卖点 / 场景 / 风险 / 建议 / 结论」结构重写，方便直接看重点。
        </Typography.Paragraph>
      </Card>

      <Card title="历史报告">
        {listQ.isError ? <Alert type="error" showIcon message={String(listQ.error)} /> : null}
        <Table
          rowKey="id"
          dataSource={rows}
          loading={listQ.isLoading || listQ.isFetching}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 80 },
            { title: '国家', dataIndex: 'country', width: 90 },
            { title: 'ASIN', dataIndex: 'asin', width: 140 },
            {
              title: '抓取状态',
              key: 'fetch_status',
              width: 120,
              render: (_, record: AnalysisReport) => {
                const meta = fetchMeta(record)
                return <Tag color={meta.statusColor}>{meta.statusText}</Tag>
              },
            },
            {
              title: '抓取模式',
              key: 'source_mode',
              width: 140,
              render: (_, record: AnalysisReport) => {
                const meta = fetchMeta(record)
                return <Tag color={meta.modeColor}>{String(meta.payload?.source_mode || '-')}</Tag>
              },
            },
            {
              title: '标题/说明',
              key: 'title_hint',
              width: 280,
              render: (_, record: AnalysisReport) => {
                const payload = parsePayload(record.input_payload)
                const text = payload?.title || payload?.error || '-'
                return <Typography.Text ellipsis={{ tooltip: String(text) }}>{String(text)}</Typography.Text>
              },
            },
            { title: '创建时间', dataIndex: 'created_at', width: 180 },
            {
              title: '操作',
              key: 'action',
              width: 100,
              render: (_, record) => <a onClick={() => setSelectedId(record.id)}>查看</a>,
            },
          ]}
        />
      </Card>

      <Drawer title={current ? `${current.country} / ${current.asin}` : '分析详情'} open={!!selectedId} onClose={() => setSelectedId(null)} width={980}>
        {detailQ.isLoading ? <Typography.Text>加载中...</Typography.Text> : null}
        {current && currentMeta ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="ID">{current.id}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{current.created_at}</Descriptions.Item>
              <Descriptions.Item label="抓取状态">
                <Tag color={currentMeta.statusColor}>{currentMeta.statusText}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="抓取模式">
                <Tag color={currentMeta.modeColor}>{String(currentPayload?.source_mode || '-')}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="商品链接">
                {currentPayload?.product_url ? (
                  <Typography.Link href={currentPayload.product_url} target="_blank">
                    {currentPayload.product_url}
                  </Typography.Link>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="标题">{currentPayload?.title || '-'}</Descriptions.Item>
              <Descriptions.Item label="价格">{currentPayload?.price_text || '-'}</Descriptions.Item>
              <Descriptions.Item label="主图">{currentPayload?.main_image_url || '-'}</Descriptions.Item>
              <Descriptions.Item label="错误信息">{currentPayload?.error || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注">{currentPayload?.note || '-'}</Descriptions.Item>
            </Descriptions>

            {Array.isArray(currentPayload?.bullets) && currentPayload.bullets.length ? (
              <Card size="small" title="原始卖点提取">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {currentPayload.bullets.map((item: string, idx: number) => (
                    <li key={`${idx}-${item}`} style={{ marginBottom: 8 }}>{item}</li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {currentPayload?.description ? (
              <Card size="small" title="原始描述摘要">
                <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                  {currentPayload.description}
                </Typography.Paragraph>
              </Card>
            ) : null}

            <Card size="small" title="结构化分析结果">
              <List
                dataSource={currentSections}
                renderItem={(section) => (
                  <List.Item>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Typography.Title level={5} style={{ margin: 0 }}>{section.title}</Typography.Title>
                      <div>
                        {section.body.filter(Boolean).length ? (
                          section.body
                            .filter(Boolean)
                            .map((line, idx) => (
                              <Typography.Paragraph key={`${section.title}-${idx}`} style={{ marginBottom: 6 }}>
                                {line}
                              </Typography.Paragraph>
                            ))
                        ) : (
                          <Typography.Text type="secondary">-</Typography.Text>
                        )}
                      </div>
                    </Space>
                  </List.Item>
                )}
              />
            </Card>

            <Card size="small" title="完整 Markdown">
              <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{current.report_markdown}</Typography.Paragraph>
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </>
  )
}
