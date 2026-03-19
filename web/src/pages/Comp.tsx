import { Alert, Button, Card, Descriptions, Drawer, Form, Input, Popconfirm, Space, Table, Tag, Typography, message } from 'antd'
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

function renderChangedTags(changedFields: string | string[] | null | undefined) {
  const arr = parseChangedFields(changedFields)
  if (!arr.length) return <Typography.Text type="secondary">-</Typography.Text>
  return (
    <Space size={[4, 4]} wrap>
      {arr.map((item) => (
        <Tag key={item} color={item === 'fetch_error' ? 'red' : item === 'first_capture' ? 'blue' : 'green'}>
          {item}
        </Tag>
      ))}
    </Space>
  )
}

function statusMeta(record: MonitorTarget) {
  const changed = parseChangedFields(record.latest_changed_fields)
  if (changed.includes('fetch_error')) return { text: '抓取失败', color: 'red' as const }
  if (changed.length && !changed.includes('first_capture')) return { text: '有变化', color: 'orange' as const }
  if (changed.includes('first_capture')) return { text: '首次建档', color: 'blue' as const }
  if (record.latest_captured_at) return { text: '正常', color: 'green' as const }
  return { text: '未扫描', color: 'default' as const }
}

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
    onSuccess: async (resp, id) => {
      if (resp?.ok) {
        const changed = parseChangedFields(resp?.data?.changed_fields)
        if (changed.length && !changed.includes('first_capture')) {
          message.warning(`扫描完成：#${id} 检测到变化`)
        } else {
          message.success(`已执行扫描 #${id}`)
        }
      } else {
        message.error(resp?.message || `扫描失败 #${id}`)
      }
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
  const latestPayload = parsePayload(latest?.raw_payload)
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
          当前已接入真实商品抓取：现在会额外高亮“抓取失败 / 有变化 / 首次建档 / 正常”，方便一眼判断是否要处理。
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
            {
              title: '状态',
              key: 'status',
              width: 110,
              render: (_, record: MonitorTarget) => {
                const meta = statusMeta(record)
                return <Tag color={meta.color}>{meta.text}</Tag>
              },
            },
            { title: '备注', dataIndex: 'note', width: 160 },
            { title: '最近价格', dataIndex: 'price_text', width: 120 },
            {
              title: '最近标题',
              dataIndex: 'latest_title',
              width: 240,
              render: (v) => <Typography.Text ellipsis={{ tooltip: String(v || '') }}>{String(v || '')}</Typography.Text>,
            },
            {
              title: '最近变化',
              dataIndex: 'latest_changed_fields',
              width: 220,
              render: (v) => renderChangedTags(v),
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

      <Drawer title={current ? `${current.country} / ${current.asin}` : '监控详情'} open={!!selectedId} onClose={() => setSelectedId(null)} width={960}>
        {detailQ.isLoading ? <Typography.Text>加载中...</Typography.Text> : null}
        {current ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small" title="目标信息">
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="ID">{current.id}</Descriptions.Item>
                <Descriptions.Item label="国家">{current.country}</Descriptions.Item>
                <Descriptions.Item label="ASIN">{current.asin}</Descriptions.Item>
                <Descriptions.Item label="备注">{current.note || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card size="small" title="最近快照">
              {latest ? (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="状态">
                      <Tag color={statusMeta({ ...current, latest_changed_fields: latest.changed_fields, latest_captured_at: latest.captured_at }).color}>
                        {statusMeta({ ...current, latest_changed_fields: latest.changed_fields, latest_captured_at: latest.captured_at }).text}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="时间">{latest.captured_at}</Descriptions.Item>
                    <Descriptions.Item label="价格">{latest.price_text || '-'}</Descriptions.Item>
                    <Descriptions.Item label="标题">{latest.title || '-'}</Descriptions.Item>
                    <Descriptions.Item label="变更字段">{renderChangedTags(latest.changed_fields)}</Descriptions.Item>
                    <Descriptions.Item label="抓取模式">{latestPayload?.source_mode || '-'}</Descriptions.Item>
                    <Descriptions.Item label="商品链接">
                      {latestPayload?.product_url ? (
                        <Typography.Link href={latestPayload.product_url} target="_blank">
                          {latestPayload.product_url}
                        </Typography.Link>
                      ) : (
                        '-'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="错误信息">{latestPayload?.error || '-'}</Descriptions.Item>
                  </Descriptions>

                  {Array.isArray(latestPayload?.bullets) && latestPayload.bullets.length ? (
                    <Card size="small" title="本次卖点提取">
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {latestPayload.bullets.map((item: string, idx: number) => (
                          <li key={`${idx}-${item}`} style={{ marginBottom: 8 }}>{item}</li>
                        ))}
                      </ul>
                    </Card>
                  ) : null}
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
                  {
                    title: '变更字段',
                    dataIndex: 'changed_fields',
                    width: 220,
                    render: (v) => renderChangedTags(v),
                  },
                ]}
              />
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </>
  )
}
