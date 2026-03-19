import { Alert, Button, Card, Input, Space, Table, Tag, Typography, message } from 'antd'
import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getNewsList, getRange, refreshNews, type NewsItem } from '../api/client'

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

function normalizeApiRows(items: NewsItem[]) {
  return items.map((item) => ({
    key: `api-${item.id}`,
    '日期(UTC+8)': item.news_date,
    标题: item.title,
    摘要: item.summary || item.content || '',
    来源: item.source || '',
    链接: item.source_url,
    Source: item.news_type,
    Notes: '',
    SourceMode: 'api',
  }))
}

export default function News() {
  const [a1] = useState('Daily_News!A1:G200')
  const [qText, setQText] = useState('')

  const apiQ = useQuery({
    queryKey: ['news-list', qText],
    queryFn: () => getNewsList({ page: 1, page_size: 100 }),
  })

  const sheetQ = useQuery({
    queryKey: ['range', a1],
    queryFn: () => getRange(a1),
    enabled: !(apiQ.data?.data.items?.length ?? 0),
  })

  const refreshMutation = useMutation({
    mutationFn: refreshNews,
    onSuccess: (res) => {
      void apiQ.refetch()
      void sheetQ.refetch()
      if (res?.ok) {
        message.success(
          `已同步新闻：有效 ${res.data.valid} 条，新增 ${res.data.inserted} 条，更新 ${res.data.updated} 条（Amazon ${res.data.amazon_count} / AI ${res.data.ai_count}）`,
        )
      } else {
        message.warning(res?.message || '同步完成，但返回异常')
      }
    },
    onError: (err: any) => {
      message.error(`同步失败：${String(err?.message || err)}`)
    },
  })

  const rows = useMemo(() => {
    const apiItems = apiQ.data?.data.items || []
    if (apiItems.length) {
      const base = normalizeApiRows(apiItems)
      if (!qText.trim()) return base
      const t = qText.trim().toLowerCase()
      return base.filter((x) =>
        String(x['标题'] || '').toLowerCase().includes(t) ||
        String(x['摘要'] || '').toLowerCase().includes(t) ||
        String(x['来源'] || '').toLowerCase().includes(t),
      )
    }

    const values = sheetQ.data?.values || null
    if (!values || !values.length) return []
    let r = toRows(values)
    if (qText.trim()) {
      const t = qText.trim().toLowerCase()
      r = r.filter((x) =>
        String(x['标题'] || '').toLowerCase().includes(t) ||
        String(x['摘要'] || '').toLowerCase().includes(t) ||
        String(x['来源'] || '').toLowerCase().includes(t),
      )
    }
    return r.map((x) => ({ ...x, SourceMode: 'sheet' }))
  }, [apiQ.data, sheetQ.data, qText])

  const usingApi = (apiQ.data?.data.items || []).length > 0
  const loading = apiQ.isLoading || sheetQ.isLoading
  const refreshing = apiQ.isFetching || sheetQ.isFetching
  const loadError = apiQ.isError && sheetQ.isError

  return (
    <Card
      title="每日新闻"
      extra={
        <Space>
          <Input.Search
            allowClear
            placeholder="搜 标题/摘要/来源"
            style={{ width: 260 }}
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
          <Button
            type="primary"
            onClick={() => {
              refreshMutation.mutate()
            }}
            loading={refreshMutation.isPending}
          >
            同步今日新闻
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
            { title: '日期(UTC+8)', dataIndex: '日期(UTC+8)', width: 120, fixed: 'left' },
            { title: '标题', dataIndex: '标题', width: 360 },
            { title: '摘要', dataIndex: '摘要', width: 520 },
            { title: '来源', dataIndex: '来源', width: 180 },
            {
              title: '链接',
              dataIndex: '链接',
              width: 120,
              render: (v) => {
                const s = String(v || '')
                const isUrl = /^https?:\/\//i.test(s)
                if (isUrl) {
                  return (
                    <a href={s} target="_blank" rel="noreferrer">
                      打开
                    </a>
                  )
                }
                return <span>{s}</span>
              },
            },
            { title: 'Source', dataIndex: 'Source', width: 120 },
            { title: 'Notes', dataIndex: 'Notes', width: 200 },
            {
              title: '数据来源',
              dataIndex: 'SourceMode',
              width: 90,
              render: (v) => <Tag color={v === 'api' ? 'green' : 'gold'}>{String(v || '')}</Tag>,
            },
          ]}
          loading={loading}
        />
      )}
    </Card>
  )
}
