import { Alert, Button, Card, Col, Row, Space, Table, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getInputsKeywords, type InputKeywordItem } from '../api/client'

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

function tagColor(tag: string) {
  const v = String(tag || '').toLowerCase()
  if (!v) return 'default'
  if (v.includes('核心')) return 'red'
  if (v.includes('品牌')) return 'purple'
  if (v.includes('竞品')) return 'orange'
  if (v.includes('长尾')) return 'blue'
  return 'green'
}

export default function Keywords() {
  const q = useQuery({
    queryKey: ['inputs-keywords'],
    queryFn: getInputsKeywords,
  })

  const rows = useMemo(
    () =>
      (q.data?.items || []).map((item: InputKeywordItem, idx: number) => ({
        key: `${item.country}-${item.keyword}-${idx}`,
        ...item,
      })),
    [q.data],
  )

  const countryCount = new Set(rows.map((r) => String(r.country || '').toUpperCase())).size
  const tagCount = new Set(rows.map((r) => String(r.tag || '').trim()).filter(Boolean)).size
  const withEntryCount = rows.filter((r) => String(r.amz123EntryUrl || '').trim()).length

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="关键词 / 趋势" extra={<Button type="primary"><Link to="/inputs/keywords">去维护词池</Link></Button>}>
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          这里现在已经接上<strong>真实关键词池</strong>：直接读取 `Inputs_Keywords` 里已启用的关键词对象，不再是演示数据。
        </Typography.Paragraph>
        <Alert
          type={rows.length ? 'success' : q.isError ? 'error' : 'info'}
          showIcon
          message={rows.length ? `已接入真实关键词池：${rows.length} 个启用关键词` : q.isError ? '关键词池读取失败' : '当前还没有启用关键词'}
          description={
            rows.length
              ? '当前页面先解决“真实词池可看、可跳、可作为后续趋势/广告/采集入口”，后续再叠加 Trends / 广告表现 / 搜索建议。'
              : q.isError
                ? String(q.error)
                : '请先去 Inputs_Keywords 维护并启用关键词。'
          }
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card size="small">
            <Typography.Text type="secondary">启用关键词数</Typography.Text>
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
            <Typography.Text type="secondary">已挂入口链接</Typography.Text>
            <Typography.Title level={3} style={{ margin: '8px 0 0' }}>{withEntryCount}</Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card title="关键词池" extra={<Space><Tag color="green">真实数据</Tag><Tag>{`标签 ${tagCount}`}</Tag></Space>}>
        <Table
          size="small"
          dataSource={rows}
          loading={q.isLoading || q.isFetching}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1200 }}
          locale={{ emptyText: q.isError ? '读取失败' : '暂无启用关键词' }}
          columns={[
            {
              title: '国家',
              dataIndex: 'country',
              width: 100,
              fixed: 'left',
              render: (v: string) => <Tag color={siteColor(v)}>{String(v || '').toUpperCase()}</Tag>,
            },
            {
              title: '关键词',
              dataIndex: 'keyword',
              width: 260,
              fixed: 'left',
              render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
            },
            {
              title: '标签',
              dataIndex: 'tag',
              width: 140,
              render: (v: string) => v ? <Tag color={tagColor(v)}>{v}</Tag> : <Typography.Text type="secondary">-</Typography.Text>,
            },
            {
              title: 'AMZ123 入口',
              dataIndex: 'amz123EntryUrl',
              width: 360,
              render: (v: string) =>
                v ? (
                  <Typography.Link href={v} target="_blank">
                    {v}
                  </Typography.Link>
                ) : (
                  <Typography.Text type="secondary">-</Typography.Text>
                ),
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
