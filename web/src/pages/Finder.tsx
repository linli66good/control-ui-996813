import { Alert, Button, Card, Col, Input, Row, Select, Space, Table, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
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
  const [countryFilter, setCountryFilter] = useState<string>('ALL')
  const [keyword, setKeyword] = useState('')

  const q = useQuery({
    queryKey: ['inputs-asins', 'finder'],
    queryFn: getInputsAsins,
  })

  const allRows = useMemo(
    () =>
      (q.data?.items || []).map((item: InputAsinItem, idx: number) => ({
        key: `${item.country}-${item.asin}-${idx}`,
        ...item,
      })),
    [q.data],
  )

  const countryOptions = useMemo(() => {
    const countries = Array.from(new Set(allRows.map((r) => String(r.country || '').toUpperCase()).filter(Boolean))).sort()
    return [{ label: '全部站点', value: 'ALL' }, ...countries.map((c) => ({ label: c, value: c }))]
  }, [allRows])

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return allRows.filter((r) => {
      const matchCountry = countryFilter === 'ALL' || String(r.country || '').toUpperCase() === countryFilter
      const matchKeyword = !kw || [r.asin, r.categoryRank, r.notes]
        .map((v) => String(v || '').toLowerCase())
        .some((v) => v.includes(kw))
      return matchCountry && matchKeyword
    })
  }, [allRows, countryFilter, keyword])

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
          message={allRows.length ? `已接入真实选品池：${allRows.length} 个启用 ASIN` : q.isError ? '选品池读取失败' : '当前还没有启用 ASIN'}
          description={
            allRows.length
              ? '现在已经支持按站点筛选、按 ASIN/备注/Rank 搜索。下一步如果要继续深化，再叠加评分、去重、竞品密度、利润/物流约束都可以。'
              : q.isError
                ? String(q.error)
                : '请先去 Inputs_ASIN 维护并启用选品对象。'
          }
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card size="small">
            <Typography.Text type="secondary">筛选后对象数</Typography.Text>
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

      <Card title="筛选条件">
        <Space wrap>
          <Select
            style={{ width: 180 }}
            value={countryFilter}
            options={countryOptions}
            onChange={setCountryFilter}
          />
          <Input
            allowClear
            style={{ width: 320 }}
            placeholder="搜 ASIN / Category Rank / 备注"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Button onClick={() => { setCountryFilter('ALL'); setKeyword('') }}>重置筛选</Button>
        </Space>
      </Card>

      <Card title="真实选品对象池" extra={<Space><Tag color="green">真实数据</Tag><Tag>Inputs_ASIN</Tag></Space>}>
        <Table
          size="small"
          dataSource={rows}
          loading={q.isLoading || q.isFetching}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1300 }}
          locale={{ emptyText: q.isError ? '读取失败' : '暂无匹配对象' }}
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
