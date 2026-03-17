import { Button, Card, Drawer, Input, Space, Table, Tag, Typography } from 'antd'
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

export default function Learn() {
  const [a1] = useState('Learn_Top3!A1:I200')
  const [qText, setQText] = useState('')
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<Record<string, any> | null>(null)

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
        String(x['Title'] || '').toLowerCase().includes(t) ||
        String(x['Summary'] || '').toLowerCase().includes(t) ||
        String(x['URL'] || '').toLowerCase().includes(t) ||
        String(x['Item'] || '').toLowerCase().includes(t),
      )
    }
    return r
  }, [values, qText])

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
            loading={q.isLoading}
          />
        )}
      </Card>

      <Drawer
        title={current?.Title || '详情'}
        open={open}
        onClose={() => setOpen(false)}
        width={720}
      >
        {current ? (
          <>
            <Typography.Paragraph>
              <b>Date:</b> {String(current.Date || '')}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <b>Item:</b> {String(current.Item || '')}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <b>Score:</b> {String(current.Score || '')}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <b>URL:</b>{' '}
              <a href={String(current.URL || '')} target="_blank" rel="noreferrer">
                {String(current.URL || '')}
              </a>
            </Typography.Paragraph>
            <Typography.Paragraph>
              <b>Summary/正文:</b>
            </Typography.Paragraph>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
              {String(current.Summary || '')}
            </Typography.Paragraph>
          </>
        ) : null}
      </Drawer>
    </>
  )
}
