import { Alert, Button, Card, Drawer, Form, Input, Popconfirm, Space, Table, Tag, Typography, message } from 'antd'
import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  createMonitorTarget,
  deleteMonitorTarget,
  getMonitorDetail,
  getMonitorList,
  getMonitorSnapshots,
  runMonitorTarget,
  type MonitorSnapshot,
  type MonitorTarget,
} from '../api/client'

export default function Comp() {
  const [country, setCountry] = useState('US')
  const [asin, setAsin] = useState('')
  const [note, setNote] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const listQ = useQuery({ queryKey: ['monitor-list'], queryFn: () => getMonitorList() })
  const detailQ = useQuery({
    queryKey: ['monitor-detail', selectedId],
    queryFn: () => getMonitorDetail(selectedId as number),
    enabled: !!selectedId,
  })
  const snapshotsQ = useQuery({
    queryKey: ['monitor-snapshots', selectedId],
    queryFn: () => getMonitorSnapshots(selectedId as number),
    enabled: !!selectedId,
  })

  const createM = useMutation({
    mutationFn: createMonitorTarget,
    onSuccess: async () => {
      message.success('已新增监控目标')
      setAsin('')
      setNote('')
      await listQ.refetch()
    },
    onError: (err) => message.error(String(err)),
  })

  const runM = useMutation({
    mutationFn: runMonitorTarget,
    onSuccess: async (_, id) => {
      message.success(`已执行扫描 #${id}`)
      await listQ.refetch()
      if (selectedId) {
        await detailQ.refetch()
        await snapshotsQ.refetch()
      }
    },
    onError: (err) => message.error(String(err)),
  })

  const deleteM = useMutation({
    mutationFn: deleteMonitorTarget,
    onSuccess: async () => {
      message.success('已删除监控目标')
      if (selectedId) setSelectedId(null)
      await listQ.refetch()
    },
    onError: (err) => message.error(String(err)),
  })

  const rows = useMemo(() => listQ.data?.data.items || [], [listQ.data])
  const current = detailQ.data?.data.target || null
  const latest = detailQ.data?.data.latest_snapshot || null
  const snapshots: MonitorSnapshot[] = snapshotsQ.data?.data.items || []

  return (
    <>
      <Card title="竞品监控" style={{ marginBottom: 16 }}>
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
              新增目标
            </Button>
          </Form.Item>
        </Form>
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          当前是监控骨架版：已支持目标入库、手动触发一次扫描、查看最近快照和历史快照。 
        </Typography.Paragraph>
      </Card>

      <Card title="监控目标">
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
            { title: '备注', dataIndex: 'note', width: 220 },
            { title: '最近价格', dataIndex: 'price_text', width: 120 },
            {
              title: '最近标题',
              dataIndex: 'latest_title',
              width: 260,
              render: (v) => <Typography.Text ellipsis={{ tooltip: String(v || '') }}>{String(v || '')}</Typography.Text>,
            },
            { title: '最近扫描', dataIndex: 'latest_captured_at', width: 180 },
            {
              title: '启用',
              dataIndex: 'enabled',
              width: 80,
              render: (v) => <Tag color={Number(v) ? 'green' : 'default'}>{Number(v) ? 'on' : 'off'}</Tag>,
            },
            {
              title: '操作',
              key: 'action',
              width: 220,
              render: (_, record: MonitorTarget) => (
                <Space>
                  <a onClick={() => setSelectedId(record.id)}>详情</a>
                  <a onClick={() => runM.mutate(record.id)}>扫描</a>
                  <Popconfirm title="确认删除这个监控目标？" onConfirm={() => deleteM.mutate(record.id)}>
                    <a>删除</a>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Drawer title={current ? `${current.country} / ${current.asin}` : '监控详情'} open={!!selectedId} onClose={() => setSelectedId(null)} width={860}>
        {detailQ.isLoading ? <Typography.Text>加载中...</Typography.Text> : null}
        {current ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small" title="目标信息">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Typography.Paragraph style={{ marginBottom: 0 }}><b>ID:</b> {current.id}</Typography.Paragraph>
                <Typography.Paragraph style={{ marginBottom: 0 }}><b>国家:</b> {current.country}</Typography.Paragraph>
                <Typography.Paragraph style={{ marginBottom: 0 }}><b>ASIN:</b> {current.asin}</Typography.Paragraph>
                <Typography.Paragraph style={{ marginBottom: 0 }}><b>备注:</b> {current.note || '-'}</Typography.Paragraph>
              </Space>
            </Card>

            <Card size="small" title="最近快照">
              {latest ? (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Typography.Paragraph style={{ marginBottom: 0 }}><b>时间:</b> {latest.captured_at}</Typography.Paragraph>
                  <Typography.Paragraph style={{ marginBottom: 0 }}><b>价格:</b> {latest.price_text || '-'}</Typography.Paragraph>
                  <Typography.Paragraph style={{ marginBottom: 0 }}><b>标题:</b> {latest.title || '-'}</Typography.Paragraph>
                  <Typography.Paragraph style={{ marginBottom: 0 }}><b>变更字段:</b> {latest.changed_fields || '-'}</Typography.Paragraph>
                </Space>
              ) : (
                <Typography.Text type="secondary">暂无快照</Typography.Text>
              )}
            </Card>

            <Card size="small" title="快照历史">
              <Table
                rowKey="id"
                size="small"
                dataSource={snapshots}
                pagination={{ pageSize: 5 }}
                loading={snapshotsQ.isLoading || snapshotsQ.isFetching}
                columns={[
                  { title: '时间', dataIndex: 'captured_at', width: 180 },
                  { title: '价格', dataIndex: 'price_text', width: 120 },
                  { title: '标题', dataIndex: 'title', width: 320 },
                  { title: '变更字段', dataIndex: 'changed_fields', width: 160 },
                ]}
              />
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </>
  )
}
