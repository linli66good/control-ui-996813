import { Alert, Button, Card, Col, Row, Space, Table, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getInputsAsins, type InputAsinItem } from '../api/client'

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

export default function Inventory() {
  const q = useQuery({
    queryKey: ['inputs-asins', 'inventory'],
    queryFn: getInputsAsins,
  })

  const rows = useMemo(() => {
    const items = q.data?.items || []
    return items.map((item: InputAsinItem, idx: number) => ({
      key: `${item.country}-${item.asin}-${idx}`,
      ...item,
      status: '已接 ASIN 池',
    }))
  }, [q.data])

  const countryCount = new Set(rows.map((x) => String(x.country || '').toUpperCase())).size

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="库存管理" extra={<Button type="primary"><Link to="/inputs/asins">去维护 ASIN 池</Link></Button>}>
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          现在这页先补成<strong>最小真实数据版</strong>：直接读取当前启用的 ASIN 池，先把库存管理的“对象清单”落到真数据，不再展示假样例。
        </Typography.Paragraph>
        <Alert
          type={rows.length ? 'info' : 'warning'}
          showIcon
          message={rows.length ? `已接入真实 ASIN 池：${rows.length} 条` : '当前还没有可用 ASIN 数据'}
          description={
            rows.length
              ? '现阶段先用 Inputs_ASIN 作为库存对象底座；后面再继续补库存数、在途数、日均销量、补货建议。'
              : '请先去 Inputs_ASIN 维护并启用 Country + ASIN，Inventory 页面会自动吃进来。'
          }
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card size="small" title="当前已接真实数据">
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>站点 / ASIN</li>
              <li>CategoryRank</li>
              <li>备注 Notes</li>
              <li>启用后的库存管理对象清单</li>
            </ul>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title="下一步最该补的字段">
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>可售库存</li>
              <li>在途库存</li>
              <li>日均销量 / 覆盖天数</li>
              <li>建议补货日期 / 风险等级</li>
            </ul>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title="当前页面价值">
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>先确认库存管理范围</li>
              <li>先按站点收口对象池</li>
              <li>为后续库存表/ERP接入保留稳定入口</li>
            </ul>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card size="small">
            <Typography.Text type="secondary">已启用 ASIN</Typography.Text>
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
            <Typography.Text type="secondary">数据源</Typography.Text>
            <Typography.Title level={4} style={{ margin: '8px 0 0' }}>Inputs_ASIN</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card title="库存对象清单" extra={<Space><Tag color="green">真实数据</Tag><Tag>最小版</Tag></Space>}>
        <Table
          size="small"
          loading={q.isLoading}
          pagination={{ pageSize: 20 }}
          dataSource={rows}
          locale={{ emptyText: q.isError ? '读取失败' : '暂无启用 ASIN' }}
          columns={[
            {
              title: '站点',
              dataIndex: 'country',
              width: 100,
              render: (v: string) => <Tag color={siteColor(v)}>{String(v || '').toUpperCase()}</Tag>,
            },
            { title: 'ASIN', dataIndex: 'asin', width: 180 },
            {
              title: 'CategoryRank',
              dataIndex: 'categoryRank',
              width: 160,
              render: (v: string) => v || <Typography.Text type="secondary">-</Typography.Text>,
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 140,
              render: (v: string) => <Tag color="green">{v}</Tag>,
            },
            {
              title: '备注',
              dataIndex: 'notes',
              render: (v: string) => v || <Typography.Text type="secondary">-</Typography.Text>,
            },
          ]}
        />
      </Card>
    </Space>
  )
}
