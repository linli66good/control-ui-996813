import { Alert, Button, Card, Col, Row, Space, Table, Tag, Typography, message } from 'antd'
import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  getInputsAsins,
  getInventoryList,
  syncInventory,
  type InputAsinItem,
  type InventoryItem,
} from '../api/client'

function siteColor(country: string) {
  switch (String(country || '').toUpperCase()) {
    case 'US':
      return 'blue'
    case 'DE':
      return 'gold'
    case 'UK':
      return 'cyan'
    case 'JP':
      return 'volcano'
    default:
      return 'default'
  }
}

function riskColor(risk: string) {
  switch (risk) {
    case '缺货':
      return 'red'
    case '高风险':
      return 'orange'
    case '关注':
      return 'gold'
    case '正常':
      return 'green'
    default:
      return 'default'
  }
}

export default function Inventory() {
  const inventoryQ = useQuery({
    queryKey: ['inventory-list'],
    queryFn: () => getInventoryList({ page: 1, page_size: 500 }),
  })

  const fallbackQ = useQuery({
    queryKey: ['inputs-asins', 'inventory-fallback'],
    queryFn: getInputsAsins,
  })

  const syncM = useMutation({
    mutationFn: syncInventory,
    onSuccess: async (resp: any) => {
      message.success(`库存同步完成：有效 ${resp?.data?.valid ?? 0}，新增 ${resp?.data?.inserted ?? 0}，更新 ${resp?.data?.updated ?? 0}`)
      await inventoryQ.refetch()
      await fallbackQ.refetch()
    },
    onError: (err: any) => {
      message.error(err?.message || '库存同步失败')
    },
  })

  const inventoryItems = inventoryQ.data?.data?.items || []
  const fallbackItems = fallbackQ.data?.items || []
  const hasInventoryData = inventoryItems.length > 0

  const rows = useMemo(() => {
    if (hasInventoryData) {
      return inventoryItems.map((item: InventoryItem) => ({
        key: `${item.country}-${item.asin}-${item.id}`,
        ...item,
        source: 'Inventory',
      }))
    }

    return fallbackItems.map((item: InputAsinItem, idx: number) => ({
      key: `${item.country}-${item.asin}-${idx}`,
      country: item.country,
      asin: item.asin,
      sellable_stock: 0,
      inbound_stock: 0,
      reserved_stock: 0,
      avg_daily_sales: 0,
      sales_7d: 0,
      sales_14d: 0,
      sales_30d: 0,
      suggested_replenishment: 0,
      risk_level: '待同步库存',
      note: item.notes,
      source: 'Inputs_ASIN',
    }))
  }, [hasInventoryData, inventoryItems, fallbackItems])

  const countryCount = new Set(rows.map((x) => String(x.country || '').toUpperCase())).size
  const riskCount = rows.filter((x) => ['缺货', '高风险', '关注'].includes(String(x.risk_level || ''))).length

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="库存管理"
        extra={
          <Space>
            <Button onClick={() => inventoryQ.refetch()} loading={inventoryQ.isFetching || fallbackQ.isFetching}>刷新</Button>
            <Button type="primary" onClick={() => syncM.mutate()} loading={syncM.isPending}>同步库存</Button>
            <Button><Link to="/inputs/asins">去维护 ASIN 池</Link></Button>
          </Space>
        }
      >
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          现在这页已经支持<strong>最小真实库存链路</strong>：优先读取 Inventory 表同步后的真实库存数据；如果还没同步，就用 Inputs_ASIN 真实对象池兜底。
        </Typography.Paragraph>
        <Alert
          type={hasInventoryData ? 'success' : rows.length ? 'info' : 'warning'}
          showIcon
          message={
            hasInventoryData
              ? `已接入真实库存数据：${rows.length} 条`
              : rows.length
                ? `当前使用 ASIN 池兜底：${rows.length} 条，库存字段待同步`
                : '当前还没有可用库存对象'
          }
          description={
            hasInventoryData
              ? '可售 / 在途 / 预留 / 日均销量 / 7/14/30天销量 / 建议补货数量 已可展示。'
              : '请在 Inventory Sheet 维护库存字段后点击“同步库存”，页面会切到真实库存模式。'
          }
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card size="small">
            <Typography.Text type="secondary">库存对象数</Typography.Text>
            <Typography.Title level={3} style={{ margin: '8px 0 0' }}>{rows.length}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small">
            <Typography.Text type="secondary">覆盖站点</Typography.Text>
            <Typography.Title level={3} style={{ margin: '8px 0 0' }}>{countryCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small">
            <Typography.Text type="secondary">风险/关注数</Typography.Text>
            <Typography.Title level={3} style={{ margin: '8px 0 0' }}>{riskCount}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card title="库存清单" extra={<Space><Tag color={hasInventoryData ? 'green' : 'blue'}>{hasInventoryData ? '真实库存' : '对象池兜底'}</Tag><Tag>{hasInventoryData ? 'Inventory' : 'Inputs_ASIN'}</Tag></Space>}>
        <Table
          size="small"
          loading={inventoryQ.isLoading || fallbackQ.isLoading}
          pagination={{ pageSize: 20 }}
          dataSource={rows}
          scroll={{ x: 1400 }}
          locale={{ emptyText: inventoryQ.isError && !rows.length ? '读取失败' : '暂无数据' }}
          columns={[
            {
              title: '站点',
              dataIndex: 'country',
              width: 90,
              fixed: 'left',
              render: (v: string) => <Tag color={siteColor(v)}>{String(v || '').toUpperCase()}</Tag>,
            },
            { title: 'ASIN', dataIndex: 'asin', width: 170, fixed: 'left' },
            { title: '可售库存', dataIndex: 'sellable_stock', width: 110 },
            { title: '在途', dataIndex: 'inbound_stock', width: 90 },
            { title: '预留', dataIndex: 'reserved_stock', width: 90 },
            { title: '日均销量', dataIndex: 'avg_daily_sales', width: 100 },
            { title: '7天销量', dataIndex: 'sales_7d', width: 100 },
            { title: '14天销量', dataIndex: 'sales_14d', width: 100 },
            { title: '30天销量', dataIndex: 'sales_30d', width: 100 },
            { title: '建议补货数量', dataIndex: 'suggested_replenishment', width: 130 },
            {
              title: '风险',
              dataIndex: 'risk_level',
              width: 110,
              render: (v: string) => <Tag color={riskColor(v)}>{v}</Tag>,
            },
            {
              title: '备注',
              dataIndex: 'note',
              width: 220,
              render: (v: string) => v || <Typography.Text type="secondary">-</Typography.Text>,
            },
            {
              title: '来源',
              dataIndex: 'source',
              width: 120,
              render: (v: string) => <Tag>{v}</Tag>,
            },
          ]}
        />
      </Card>
    </Space>
  )
}
