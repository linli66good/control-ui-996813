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

function rankColor(rank: string) {
  const v = String(rank || '').trim()
  if (!v) return 'default'
  if (/top\s*10|前\s*10|#?[1-9]\b/i.test(v)) return 'red'
  if (/top\s*50|前\s*50|#?[1-4]?\d\b/i.test(v)) return 'orange'
  return 'blue'
}

export default function Finder() {
  const q = useQuery({
    queryKey: ['inputs-asins', 'finder'],
    queryFn: getInputsAsins,
  })

  const rows = useMemo(
    () =>
      (q.data?.items || []).map((item: InputAsinItem, idx: number) => ({
        key: `${item.country}-${item.asin}-${idx}`,
        ...item,
      })),
    [q.data],
  )

  const countryCount = new Set(rows.map((r) => String(r.country || '').toUpperCase())).size
  const rankedCount = rows.filter((r) => String(r.categoryRank || '').trim()).length
  const notedCount = rows.filter((r) => String(r.notes || '').trim()).length

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="选品 Finder"
        extra={
          <Space>
            <Button onClick={() => q.refetch()} loading={q.isFetching}>刷新</Button>
            <Button type="primary"><Link to="/inputs/asins">去维护 ASIN 池</Link></Button>
          </Space>
        }
      >
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          这里先做成<strong>真实选品对象池 MVP</strong>：直接读取 `Inputs_ASIN` 中已启用的真实对象，解决“选品列表可看、可筛、可衔接后续分析/监控”这一步。
        </Typography.Paragraph>
        <Alert
          type={rows.length ? 'success' : q.isError ? 'error' : 'info'}
          showIcon
          message={rows.length ? `已接入真实选品池：${rows.length} 个启用 ASIN` : q.isError ? '选品池读取失败' : '当前还没有启用 ASIN'}
          description={
            rows.length
              ? '当前 Finder 先聚焦真实对象池。下一步如果要继续深化，再叠加评分、去重、竞品密度、利润/物流约束都可以。'
              : q.isError
                ? String(q.error)
                : '请先去 Inputs_ASIN 维护并启用选品对象。'
          }
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card size="small">
            <Typography.Text type="secondary">启用 ASIN 数</Typography.Text>
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
            <Typography.Text type="secondary">带 Rank / 备注</Typography.Text>
            <Typography.Title level={3} style={{ margin: '8px 0 0' }}>{`${rankedCount} / ${notedCount}`}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card title="当前 Finder 能做什么">
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Card size="small" title="现在已接通">
              <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                <li>真实 ASIN 池展示</li>
                <li>按国家查看对象</li>
                <li>记录类目排名和备注</li>
              </ul>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" title="可直接衔接">
              <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                <li>去 /analysis 做单品分析</li>
                <li>去 /comp 建竞品监控</li>
                <li>去 /inventory 看库存覆盖</li>
              </ul>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" title="下一步可增强">
              <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                <li>选品打分</li>
                <li>利润/物流约束</li>
                <li>关键词/趋势联动</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </Card>

      <Card title="真实选品对象池" extra={<Space><Tag color="green">真实数据</Tag><Tag>Inputs_ASIN</Tag></Space>}>
        <Table
          size="small"
          dataSource={rows}
          loading={q.isLoading || q.isFetching}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1300 }}
          locale={{ emptyText: q.isError ? '读取失败' : '暂无启用 ASIN' }}
          columns={[
            {
              title: '国家',
              dataIndex: 'country',
              width: 100,
              fixed: 'left',
              render: (v: string) => <Tag color={siteColor(v)}>{String(v || '').toUpperCase()}</Tag>,
            },
            {
              title: 'ASIN',
              dataIndex: 'asin',
              width: 180,
              fixed: 'left',
              render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
            },
            {
              title: 'Category Rank',
              dataIndex: 'categoryRank',
              width: 180,
              render: (v: string) => v ? <Tag color={rankColor(v)}>{v}</Tag> : <Typography.Text type="secondary">-</Typography.Text>,
            },
            {
              title: '备注',
              dataIndex: 'notes',
              render: (v: string) => v || <Typography.Text type="secondary">-</Typography.Text>,
            },
            {
              title: '后续动作',
              key: 'actions',
              width: 260,
              fixed: 'right',
              render: (_: unknown) => (
                <Space wrap>
                  <Link to="/analysis">分析</Link>
                  <Link to="/comp">监控</Link>
                  <Link to="/inventory">库存</Link>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  )
}
