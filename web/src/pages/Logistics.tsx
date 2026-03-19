import { Alert, Button, Card, Col, Row, Space, Table, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRange } from '../api/client'

const A1 = 'Logistics!A1:I2000'

type LogisticsRow = {
  key: string
  route: string
  channel: string
  carrier: string
  etd: string
  eta: string
  latestNode: string
  status: string
  note: string
}

function pick(obj: Record<string, any>, keys: string[]) {
  for (const k of keys) {
    const v = String(obj[k] ?? '').trim()
    if (v) return v
  }
  return ''
}

function statusColor(status: string) {
  const s = String(status || '')
  if (!s) return 'default'
  if (s.includes('异常') || s.includes('延误') || s.includes('失败') || s.includes('卡住')) return 'red'
  if (s.includes('预警') || s.includes('关注') || s.includes('待处理')) return 'orange'
  if (s.includes('签收') || s.includes('完成') || s.includes('已到仓')) return 'green'
  if (s.includes('运输') || s.includes('在途') || s.includes('清关')) return 'blue'
  return 'default'
}

function toRows(values: string[][] | null | undefined): LogisticsRow[] {
  if (!values || values.length < 2) return []
  const header = values[0] || []
  const body = values.slice(1)
  return body
    .map((r, i) => {
      const obj: Record<string, string> = {}
      header.forEach((h, idx) => {
        obj[h || `col_${idx}`] = r[idx] ?? ''
      })
      const route = pick(obj, ['Route', '线路'])
      const channel = pick(obj, ['Channel', '渠道'])
      const carrier = pick(obj, ['Carrier', '承运商'])
      const etd = pick(obj, ['ETD', '发货时间'])
      const eta = pick(obj, ['ETA', '预计到仓'])
      const latestNode = pick(obj, ['LatestNode', '最新节点'])
      const status = pick(obj, ['Status', '状态'])
      const note = pick(obj, ['Note', 'Notes', '备注'])
      if (![route, channel, carrier, etd, eta, latestNode, status, note].some(Boolean)) return null
      return {
        key: `${route || 'row'}-${i}`,
        route,
        channel,
        carrier,
        etd,
        eta,
        latestNode,
        status,
        note,
      }
    })
    .filter(Boolean) as LogisticsRow[]
}

export default function Logistics() {
  const q = useQuery({
    queryKey: ['range', A1, 'logistics'],
    queryFn: () => getRange(A1),
  })

  const rows = useMemo(() => toRows(q.data?.values), [q.data?.values])
  const abnormalCount = rows.filter((x) => ['异常', '延误', '失败', '卡住', '预警', '关注', '待处理'].some((w) => x.status.includes(w))).length
  const routeCount = new Set(rows.map((x) => x.route).filter(Boolean)).size
  const carrierCount = new Set(rows.map((x) => x.carrier).filter(Boolean)).size

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="物流监控"
        extra={
          <Space>
            <Button onClick={() => q.refetch()} loading={q.isFetching}>刷新</Button>
            <Tag color={rows.length ? 'green' : 'blue'}>{rows.length ? '真实数据' : '待填数据'}</Tag>
          </Space>
        }
      >
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          这里现在已经接上<strong>Logistics 表</strong>的真实数据了。先不造复杂系统，先把线路、渠道、承运商、时效、最新节点、状态跑通。
        </Typography.Paragraph>
        <Alert
          type={rows.length ? (abnormalCount ? 'warning' : 'success') : q.isError ? 'error' : 'info'}
          showIcon
          message={
            rows.length
              ? `已读取 ${rows.length} 条物流记录`
              : q.isError
                ? '读取 Logistics 表失败'
                : '当前还没有 Logistics 真实数据'
          }
          description={
            rows.length
              ? (abnormalCount ? `其中 ${abnormalCount} 条处于异常/关注状态。` : '当前未发现明显异常状态。')
              : '表头建议：Route | Channel | Carrier | ETD | ETA | LatestNode | Status | Note'
          }
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card size="small">
            <Typography.Text type="secondary">物流记录数</Typography.Text>
            <Typography.Title level={3} style={{ margin: '8px 0 0' }}>{rows.length}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small">
            <Typography.Text type="secondary">线路数</Typography.Text>
            <Typography.Title level={3} style={{ margin: '8px 0 0' }}>{routeCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small">
            <Typography.Text type="secondary">承运商数</Typography.Text>
            <Typography.Title level={3} style={{ margin: '8px 0 0' }}>{carrierCount}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card title="物流清单" extra={<Tag>{A1}</Tag>}>
        <Table
          size="small"
          loading={q.isLoading}
          dataSource={rows}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1200 }}
          locale={{ emptyText: q.isError ? '读取失败，请检查 Logistics 表或接口权限' : '暂无 Logistics 数据' }}
          columns={[
            { title: '线路', dataIndex: 'route', width: 140, fixed: 'left' },
            { title: '渠道', dataIndex: 'channel', width: 160 },
            { title: '承运商', dataIndex: 'carrier', width: 160 },
            { title: 'ETD', dataIndex: 'etd', width: 140 },
            { title: 'ETA', dataIndex: 'eta', width: 140 },
            { title: '最新节点', dataIndex: 'latestNode', width: 240 },
            {
              title: '状态',
              dataIndex: 'status',
              width: 140,
              render: (v: string) => <Tag color={statusColor(v)}>{v || '未标记'}</Tag>,
            },
            {
              title: '备注',
              dataIndex: 'note',
              render: (v: string) => v || <Typography.Text type="secondary">-</Typography.Text>,
            },
          ]}
        />
      </Card>
    </Space>
  )
}
