import { Alert, Button, Card, Drawer, Input, Space, Table, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getLearnList, getRange, type LearnCard } from '../api/client'

function toRows(values: string[][]) {
  const header = values[0] || []
  const rows = values.slice(1)
  return rows.map((r, i) => {
    const obj: Record<string, any> = { key: `sheet-${i}` }
    header.forEach((h, idx) => {
      obj[h || `col_${idx}`] = r[idx] ?? ''
    })
    return obj
  })
}

function normalizeApiRows(items: LearnCard[]) {
  return items.map((item) => ({
    key: `api-${item.id}`,
    id: item.id,
    Date: item.date,
    Round: '',
    Item: '',
    ItemTitle: '',
    Score: item.score,
    Title: item.title,
    SourceHost: item.source_domain,
    URL: item.source_url,
    Summary: item.summary || item.content || '',
    Content: item.content || '',
    MarketFeedback: item.market_feedback || '',
    FinalView: item.final_view || '',
    SourceMode: 'api',
  }))
}

export default function Learn() {
  const [a1] = useState('Learn_Top3!A1:I200')
  const [qText, setQText] = useState('')
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<Record<string, any> | null>(null)

  const apiQ = useQuery({
    queryKey: ['learn-list', qText],
    queryFn: () => getLearnList({ page: 1, page_size: 100, keyword: qText || undefined }),
  })

  const sheetQ = useQuery({
    queryKey: ['range', a1],
    queryFn: () => getRange(a1),
    enabled: !apiQ.data?.data.items?.length,
  })

  const rows = useMemo(() => {
    const apiItems = apiQ.data?.data.items || []
    if (apiItems.length) {
      return normalizeApiRows(apiItems)
    }

    const values = sheetQ.data?.values || null
    if (!values || !values.length) return []
    let r = toRows(values)
    if (qText.trim()) {
      const t = qText.trim().toLowerCase()
      r = r.filter((x) =>
        String(x['Title'] || '').toLowerCase().includes(t) ||
        String(x['Summary'] || '').toLowerCase().includes(t) ||
        String(x['URL'] || '').toLowerCase().includes(t) ||
        String(x['Item'] || '').toLowerCase().includes(t),
      )
    }
    return r.map((x) => ({ ...x, SourceMode: 'sheet' }))
  }, [apiQ.data, sheetQ.data, qText])

  const usingApi = (apiQ.data?.data.items || []).length > 0
  const loading = apiQ.isLoading || sheetQ.isLoading
  const refreshing = apiQ.isFetching || sheetQ.isFetching
  const loadError = apiQ.isError && sheetQ.isError

  return (
    <>
      <Card
        title="自动学习 Top3"
        extra={
          <Space>
            <Input.Search
              allowClear
              placeholder="搜 Title/Summary/URL/Item"
              style={{ width: 280 }}
              onSearch={setQText}
              onChange={(e) => setQText(e.target.value)}
              value={qText}
            />
            <Button
              onClick={() => {
                void apiQ.refetch()
                void sheetQ.refetch()
              }}
              loading={refreshing}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 12 }}>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            API 优先，Sheets 保底。当前来源：<Tag color={usingApi ? 'green' : 'gold'}>{usingApi ? 'API' : 'Sheet'}</Tag>
          </Typography.Paragraph>
          {!usingApi ? (
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              读取范围：<Tag>{a1}</Tag>
            </Typography.Paragraph>
          ) : null}
          {apiQ.isError && !usingApi ? (
            <Alert type="warning" showIcon message="新接口暂无数据或加载失败，已自动回退到 Sheet 数据。" />
          ) : null}
        </Space>

        {loadError ? (
          <Typography.Text type="danger">加载失败：{String(apiQ.error || sheetQ.error)}</Typography.Text>
        ) : (
          <Table
            size="small"
            rowKey="key"
            dataSource={rows}
            pagination={{ pageSize: 20 }}
            scroll={{ x: true }}
            columns={[
              { title: 'Date', dataIndex: 'Date', width: 120, fixed: 'left' },
              { title: 'Round', dataIndex: 'Round', width: 80 },
              { title: 'Item', dataIndex: 'Item', width: 140 },
              { title: 'ItemTitle', dataIndex: 'ItemTitle', width: 220 },
              { title: 'Score', dataIndex: 'Score', width: 80 },
              { title: 'Title', dataIndex: 'Title', width: 360 },
              { title: 'SourceHost', dataIndex: 'SourceHost', width: 160 },
              {
                title: 'URL',
                dataIndex: 'URL',
                width: 220,
                render: (v) => {
                  const s = String(v || '')
                  if (!s) return null
                  return (
                    <a href={s} target="_blank" rel="noreferrer">
                      打开
                    </a>
                  )
                },
              },
              {
                title: '来源',
                dataIndex: 'SourceMode',
                width: 90,
                render: (v) => <Tag color={v === 'api' ? 'green' : 'gold'}>{String(v || '')}</Tag>,
              },
              {
                title: '详情',
                key: 'detail',
                width: 90,
                fixed: 'right',
                render: (_, record) => (
                  <a
                    onClick={() => {
                      setCurrent(record)
                      setOpen(true)
                    }}
                  >
                    查看
                  </a>
                ),
              },
            ]}
            loading={loading}
          />
        )}
      </Card>

      <Drawer
        title={current?.Title || '详情'}
        open={open}
        onClose={() => setOpen(false)}
        width={760}
      >
        {current ? (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <b>Date:</b> {String(current.Date || '')}
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <b>Item:</b> {String(current.Item || '')}
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <b>Score:</b> {String(current.Score || '')}
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <b>URL:</b>{' '}
              <a href={String(current.URL || '')} target="_blank" rel="noreferrer">
                {String(current.URL || '')}
              </a>
            </Typography.Paragraph>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <b>摘要 / 内容提炼</b>
            </Typography.Paragraph>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
              {String(current.Summary || '')}
            </Typography.Paragraph>
            {String(current.Content || '').trim() ? (
              <>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  <b>完整内容</b>
                </Typography.Paragraph>
                <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                  {String(current.Content || '')}
                </Typography.Paragraph>
              </>
            ) : null}
            {String(current.MarketFeedback || '').trim() ? (
              <>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  <b>市面反馈</b>
                </Typography.Paragraph>
                <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                  {String(current.MarketFeedback || '')}
                </Typography.Paragraph>
              </>
            ) : null}
            {String(current.FinalView || '').trim() ? (
              <>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  <b>整体总结和看法</b>
                </Typography.Paragraph>
                <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                  {String(current.FinalView || '')}
                </Typography.Paragraph>
              </>
            ) : null}
          </Space>
        ) : null}
      </Drawer>
    </>
  )
}
