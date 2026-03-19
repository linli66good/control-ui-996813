import { Alert, Button, Card, Descriptions, Drawer, Form, Input, Space, Table, Tag, Typography, message } from 'antd'
import { useMemo, useState } from 'react'
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

export default function Analysis() {
  const [country, setCountry] = useState('US')
  const [asin, setAsin] = useState('')
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
  const currentPayload = parsePayload(current?.input_payload)

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
          现在已接入真实商品抓取：优先直抓 Amazon，遇到风控页会自动走镜像回退，并把结果直接落库。
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
                const payload = parsePayload(record.input_payload)
                const ok = !!payload?.fetch_ok
                return <Tag color={ok ? 'green' : 'orange'}>{ok ? '抓取成功' : '回退/失败'}</Tag>
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
              title: '状态',
              key: 'status',
              width: 100,
              render: (_, record: AnalysisReport) => {
                const payload = parsePayload(record.input_payload)
                const mode = payload?.fetch_ok ? 'ready' : 'fallback'
                return <Tag color={mode === 'ready' ? 'blue' : 'gold'}>{mode}</Tag>
              },
            },
            {
              title: '操作',
              key: 'action',
              width: 100,
              render: (_, record) => <a onClick={() => setSelectedId(record.id)}>查看</a>,
            },
          ]}
        />
      </Card>

      <Drawer title={current ? `${current.country} / ${current.asin}` : '分析详情'} open={!!selectedId} onClose={() => setSelectedId(null)} width={860}>
        {detailQ.isLoading ? <Typography.Text>加载中...</Typography.Text> : null}
        {current ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="ID">{current.id}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{current.created_at}</Descriptions.Item>
              <Descriptions.Item label="抓取状态">
                <Tag color={currentPayload?.fetch_ok ? 'green' : 'orange'}>{currentPayload?.fetch_ok ? '抓取成功' : '回退/失败'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="抓取模式">{currentPayload?.source_mode || '-'}</Descriptions.Item>
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
              <Descriptions.Item label="输入参数">
                <Typography.Text code>{current.input_payload}</Typography.Text>
              </Descriptions.Item>
            </Descriptions>

            {Array.isArray(currentPayload?.bullets) && currentPayload.bullets.length ? (
              <Card size="small" title="卖点提取">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {currentPayload.bullets.map((item: string, idx: number) => (
                    <li key={`${idx}-${item}`} style={{ marginBottom: 8 }}>{item}</li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {currentPayload?.description ? (
              <Card size="small" title="描述摘要">
                <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                  {currentPayload.description}
                </Typography.Paragraph>
              </Card>
            ) : null}

            <Card size="small" title="报告内容">
              <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{current.report_markdown}</Typography.Paragraph>
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </>
  )
}
