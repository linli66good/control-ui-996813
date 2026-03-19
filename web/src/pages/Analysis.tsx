import { Alert, Button, Card, Drawer, Form, Input, Space, Table, Tag, Typography, message } from 'antd'
import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createAnalysis, getAnalysisDetail, getAnalysisList, type AnalysisReport } from '../api/client'

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
      message.success(resp.message || '已生成分析骨架')
      setSelectedId(resp.data.id)
      await listQ.refetch()
    },
    onError: (err) => message.error(String(err)),
  })

  const rows = useMemo(() => listQ.data?.data.items || [], [listQ.data])
  const current: AnalysisReport | null = detailQ.data?.data || null

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
          当前是骨架版：先把国家 + ASIN 入库并生成占位报告，后面再接真实抓取与 AI 分析。 
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
              title: '输入',
              dataIndex: 'input_payload',
              width: 260,
              render: (v) => <Typography.Text ellipsis={{ tooltip: String(v || '') }}>{String(v || '')}</Typography.Text>,
            },
            { title: '创建时间', dataIndex: 'created_at', width: 180 },
            {
              title: '状态',
              key: 'status',
              width: 100,
              render: () => <Tag color="green">ready</Tag>,
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

      <Drawer title={current ? `${current.country} / ${current.asin}` : '分析详情'} open={!!selectedId} onClose={() => setSelectedId(null)} width={760}>
        {detailQ.isLoading ? <Typography.Text>加载中...</Typography.Text> : null}
        {current ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Typography.Paragraph style={{ marginBottom: 0 }}><b>ID:</b> {current.id}</Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 0 }}><b>创建时间:</b> {current.created_at}</Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 0 }}><b>输入参数:</b> {current.input_payload}</Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 0 }}><b>报告内容</b></Typography.Paragraph>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{current.report_markdown}</Typography.Paragraph>
          </Space>
        ) : null}
      </Drawer>
    </>
  )
}
