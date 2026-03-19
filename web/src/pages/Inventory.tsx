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

type InventoryViewRow = {
  key: string
  country: string
  asin: string
  sellable_stock: number
  inbound_stock: number
  reserved_stock: number
  avg_daily_sales: number
  sales_7d: number
  sales_14d: number
  sales_30d: number
  suggested_replenishment: number
  formula_replenishment: number
  replenishment_source: 'sheet' | 'formula' | 'fallback'
  formula_text: string
  risk_level: string
  note: string
  source: string
}

function computeFormulaReplenishment(item: {
  sellable_stock?: number
  inbound_stock?: number
  reserved_stock?: number
  avg_daily_sales?: number
}) {
  const targetDays = 21
  const sellable = Number(item.sellable_stock || 0)
  const inbound = Number(item.inbound_stock || 0)
  const reserved = Number(item.reserved_stock || 0)
  const avgDaily = Number(item.avg_daily_sales || 0)
  const usableStock = Math.max(0, sellable + inbound - reserved)
  const targetStock = Math.ceil(avgDaily * targetDays)
  const recommend = Math.max(0, targetStock - usableStock)
  return {
    targetDays,
    usableStock,
    targetStock,
    recommend,
    formulaText: `max(0, 日均销量×${targetDays} - (可售+在途-预留)) = max(0, ${avgDaily}×${targetDays} - (${sellable}+${inbound}-${reserved}))`,
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

  const rows = useMemo<InventoryViewRow[]>(() => {
    if (hasInventoryData) {
      return inventoryItems.map((item: InventoryItem) => {
        const formula = computeFormulaReplenishment(item)
        const sheetSuggested = Number(item.suggested_replenishment || 0)
        const hasSheetSuggested = sheetSuggested > 0
        return {
          key: `${item.country}-${item.asin}-${item.id}`,
          country: item.country,
          asin: item.asin,
          sellable_stock: item.sellable_stock,
          inbound_stock: item.inbound_stock,
          reserved_stock: item.reserved_stock,
          avg_daily_sales: item.avg_daily_sales,
          sales_7d: item.sales_7d,
          sales_14d: item.sales_14d,
          sales_30d: item.sales_30d,
          suggested_replenishment: hasSheetSuggested ? sheetSuggested : formula.recommend,
          formula_replenishment: formula.recommend,
          replenishment_source: hasSheetSuggested ? 'sheet' : 'formula',
          formula_text: formula.formulaText,
          risk_level: item.risk_level,
          note: item.note,
          source: 'Inventory',
        }
      })
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
      formula_replenishment: 0,
      replenishment_source: 'fallback',
      formula_text: '待 Inventory 表同步后计算',
      risk_level: '待同步库存',
      note: item.notes,
      source: 'Inputs_ASIN',
    }))
  }, [hasInventoryData, inventoryItems, fallbackItems])

  const countryCount = new Set(rows.map((x) => String(x.country || '').toUpperCase())).size
  const riskCount = rows.filter((x) => ['缺货', '高风险', '关注'].includes(String(x.risk_level || ''))).length
  const formulaCount = rows.filter((x) => x.replenishment_source === 'formula').length
  const sheetCount = rows.filter((x) => x.replenishment_source === 'sheet').length

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
              ? '建议补货数量现在支持两种来源：优先显示表内值；未填写时按页面公式自动估算。'
              : '请在 Inventory Sheet 维护库存字段后点击“同步库存”，页面会切到真实库存模式。'
          }
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} md={6}>
          <Card size="small">
            <Typography.Text type="secondary">库存对象数</Typography.Text>
            <Typography.Title level={3} style={{ margin: '8px 0 0' }}>{rows.length}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card size="small">
            <Typography.Text type="secondary">覆盖站点</Typography.Text>
            <Typography.Title level={3} style={{ margin: '8px 0 0' }}>{countryCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card size="small">
            <Typography.Text type="secondary">风险/关注数</Typography.Text>
            <Typography.Title level={3} style={{ margin: '8px 0 0' }}>{riskCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card size="small">
            <Typography.Text type="secondary">公式估算条数</Typography.Text>
            <Typography.Title level={3} style={{ margin: '8px 0 0' }}>{formulaCount}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card title="建议补货规则" extra={<Space><Tag color="green">表内值 {sheetCount}</Tag><Tag color="blue">公式估算 {formulaCount}</Tag></Space>}>
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          当前最小规则：<strong>建议补货数量 = max(0, 日均销量 × 21天 - (可售 + 在途 - 预留))</strong>
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          页面展示逻辑：
          <br />1) 如果 Inventory 表里已经填写 <strong>SuggestedReplenishment</strong>，优先显示表内值；
          <br />2) 如果表里没填，就按上面的 21 天覆盖规则自动估算；
          <br />3) Inputs_ASIN 兜底模式下不做补货估算。
        </Typography.Paragraph>
      </Card>

      <Card title="库存清单" extra={<Space><Tag color={hasInventoryData ? 'green' : 'blue'}>{hasInventoryData ? '真实库存' : '对象池兜底'}</Tag><Tag>{hasInventoryData ? 'Inventory' : 'Inputs_ASIN'}</Tag></Space>}>
        <Table
          size="small"
          loading={inventoryQ.isLoading || fallbackQ.isLoading}
          pagination={{ pageSize: 20 }}
          dataSource={rows}
          scroll={{ x: 1700 }}
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
            {
              title: '建议补货数量',
              dataIndex: 'suggested_replenishment',
              width: 140,
              render: (v: number, record: InventoryViewRow) => (
                <Space>
                  <span>{v}</span>
                  <Tag color={record.replenishment_source === 'sheet' ? 'green' : record.replenishment_source === 'formula' ? 'blue' : 'default'}>
                    {record.replenishment_source === 'sheet' ? '表内值' : record.replenishment_source === 'formula' ? '公式值' : '待同步'}
                  </Tag>
                </Space>
              ),
            },
            {
              title: '公式说明',
              dataIndex: 'formula_text',
              width: 360,
              render: (v: string) => <Typography.Text type="secondary">{v}</Typography.Text>,
            },
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
