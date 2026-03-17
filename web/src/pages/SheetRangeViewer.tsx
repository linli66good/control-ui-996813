import { Button, Card, Form, Input, Table, Typography } from 'antd'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRange } from '../api/client'

function valuesToColumns(values: string[][]) {
  const header = values[0] || []
  return header.map((h, idx) => ({
    title: h || `Col${idx + 1}`,
    dataIndex: String(idx),
    key: String(idx),
    ellipsis: true,
  }))
}

function valuesToData(values: string[][]) {
  const rows = values.slice(1)
  return rows.map((r, i) => {
    const obj: Record<string, any> = { key: i }
    r.forEach((cell, idx) => (obj[String(idx)] = cell))
    return obj
  })
}

export default function SheetRangeViewer() {
  const [a1, setA1] = useState('Daily_News!A1:G10')
  const [submitted, setSubmitted] = useState(a1)

  const q = useQuery({
    queryKey: ['range', submitted],
    queryFn: () => getRange(submitted),
  })

  const values = q.data?.values || null

  return (
    <Card title="Range 查看器（通用读表）" bordered>
      <Form
        layout="inline"
        onFinish={() => {
          setSubmitted(a1)
        }}
      >
        <Form.Item label="A1">
          <Input style={{ width: 360 }} value={a1} onChange={(e) => setA1(e.target.value)} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={q.isFetching}>
            读取
          </Button>
        </Form.Item>
      </Form>

      <div style={{ marginTop: 12 }}>
        <Typography.Text type="secondary">返回范围：{q.data?.range || '-'}</Typography.Text>
      </div>

      {q.isError ? (
        <Typography.Paragraph type="danger">{String(q.error)}</Typography.Paragraph>
      ) : values && values.length ? (
        <Table
          style={{ marginTop: 12 }}
          size="small"
          pagination={{ pageSize: 20 }}
          scroll={{ x: true }}
          columns={valuesToColumns(values)}
          dataSource={valuesToData(values)}
        />
      ) : (
        <Typography.Paragraph style={{ marginTop: 12 }}>
          暂无数据（或 values=null）。
        </Typography.Paragraph>
      )}
    </Card>
  )
}
