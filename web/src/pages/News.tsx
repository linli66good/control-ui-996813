import { Button, Card, Input, Space, Table, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRange } from '../api/client'

function toRows(values: string[][]) {
  const header = values[0] || []
  const rows = values.slice(1)
  return rows.map((r, i) => {
    const obj: Record<string, any> = { key: i }
    header.forEach((h, idx) => {
      obj[h || `col_${idx}`] = r[idx] ?? ''
    })
    return obj
  })
}

export default function News() {
  const [a1] = useState('Daily_News!A1:G200')
  const [qText, setQText] = useState('')

  const q = useQuery({
    queryKey: ['range', a1],
    queryFn: () => getRange(a1),
  })

  const values = q.data?.values || null

  const rows = useMemo(() => {
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
    return r
  }, [values, qText])

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
          <Button onClick={() => q.refetch()} loading={q.isFetching}>
            刷新
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        读取范围：<Tag>{a1}</Tag>
      </Typography.Paragraph>

      {q.isError ? (
        <Typography.Text type="danger">加载失败：{String(q.error)}</Typography.Text>
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
                // Sheet里可能是“打开”或 URL
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
          ]}
          loading={q.isLoading}
        />
      )}
    </Card>
  )
}
