import { Button, Card, Form, Input, message, Space, Table, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRange } from '../api/client'
import { http } from '../api/http'

function toRows(values: string[][]) {
  const header = values[0] || []
  const rows = values.slice(1)
  return rows.map((r, i) => {
    const obj: Record<string, any> = { key: i, __row: i + 2 } // row number in sheet (1-based; +2 for header)
    header.forEach((h, idx) => {
      obj[h || `col_${idx}`] = r[idx] ?? ''
    })
    return obj
  })
}

export default function InputsAsin() {
  const [a1] = useState('Inputs_ASIN!A1:D1000')
  const [form] = Form.useForm()

  const q = useQuery({
    queryKey: ['range', a1],
    queryFn: () => getRange(a1),
  })

  const values = q.data?.values || null
  const rows = useMemo(() => (values && values.length ? toRows(values) : []), [values])

  async function addRow(v: any) {
    // naive append: find next empty row by current count
    const nextRow = rows.length + 2 // header row + existing rows
    const target = `Inputs_ASIN!A${nextRow}:D${nextRow}`
    await http.post('/v1/update', {
      A1: target,
      values: [[v.Country, v.ASIN, v.CategoryRank || '', v.Notes || '']],
    })
    message.success('已写入表格')
    form.resetFields()
    q.refetch()
  }

  return (
    <Card
      title="Inputs_ASIN"
      extra={
        <Space>
          <Button onClick={() => q.refetch()} loading={q.isFetching}>
            刷新
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        表头：<Tag>Country</Tag><Tag>ASIN</Tag><Tag>CategoryRank</Tag><Tag>Notes</Tag>
      </Typography.Paragraph>

      <Card size="small" title="新增监控 ASIN" style={{ marginBottom: 12 }}>
        <Form form={form} layout="inline" onFinish={addRow}>
          <Form.Item name="Country" label="Country" rules={[{ required: true }]}>
            <Input placeholder="US" style={{ width: 90 }} />
          </Form.Item>
          <Form.Item name="ASIN" label="ASIN" rules={[{ required: true }]}>
            <Input placeholder="B0..." style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="CategoryRank" label="CategoryRank">
            <Input placeholder="可空" style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="Notes" label="Notes">
            <Input placeholder="备注" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              写入
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Table
        size="small"
        dataSource={rows}
        pagination={{ pageSize: 30 }}
        scroll={{ x: true }}
        columns={[
          { title: 'Country', dataIndex: 'Country', width: 90, fixed: 'left' },
          { title: 'ASIN', dataIndex: 'ASIN', width: 160 },
          { title: 'CategoryRank', dataIndex: 'CategoryRank', width: 140 },
          { title: 'Notes', dataIndex: 'Notes', width: 260 },
          { title: 'Row', dataIndex: '__row', width: 80, fixed: 'right' },
        ]}
        loading={q.isLoading}
      />
    </Card>
  )
}
