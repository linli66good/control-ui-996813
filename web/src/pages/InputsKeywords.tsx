import { Button, Card, Checkbox, Form, Input, message, Space, Table, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRange } from '../api/client'
import { http } from '../api/http'

function toRows(values: string[][]) {
  const header = values[0] || []
  const rows = values.slice(1)
  return rows.map((r, i) => {
    const obj: Record<string, any> = { key: i, __row: i + 2 }
    header.forEach((h, idx) => {
      obj[h || `col_${idx}`] = r[idx] ?? ''
    })
    return obj
  })
}

export default function InputsKeywords() {
  const [a1] = useState('Inputs_Keywords!A1:F2000')
  const [form] = Form.useForm()

  const q = useQuery({
    queryKey: ['range', a1],
    queryFn: () => getRange(a1),
  })

  const values = q.data?.values || null
  const rows = useMemo(() => (values && values.length ? toRows(values) : []), [values])

  const index = useMemo(() => {
    const m = new Map<string, any>()
    for (const r of rows) {
      const k = `${String(r.Country || '').trim().toUpperCase()}|${String(r.Keyword || '').trim().toLowerCase()}`
      if (k !== '|') m.set(k, r)
    }
    return m
  }, [rows])

  async function addRow(v: any) {
    const country = String(v.Country || '').trim().toUpperCase()
    const keyword = String(v.Keyword || '').trim()
    const key = `${country}|${keyword.toLowerCase()}`

    const existed = index.get(key)
    if (existed) {
      message.warning(`已存在：第 ${existed.__row} 行（Country+Keyword）`)
      return
    }

    const nextRow = rows.length + 2
    const target = `Inputs_Keywords!A${nextRow}:F${nextRow}`
    await http.post('/v1/update', {
      A1: target,
      values: [[
        country,
        keyword,
        v.Tag || '',
        v.AMZ123_Entry_URL || '',
        v.Enabled ? 'TRUE' : 'FALSE',
        v.Notes || '',
      ]],
    })
    message.success('已写入表格')
    form.resetFields()
    q.refetch()
  }

  async function toggleEnabled(record: any) {
    const row = record.__row
    const cur = String(record.Enabled || '').toUpperCase() === 'TRUE'
    const next = cur ? 'FALSE' : 'TRUE'
    await http.post('/v1/update', { A1: `Inputs_Keywords!E${row}`, values: [[next]] })
    message.success('已更新')
    q.refetch()
  }

  return (
    <Card
      title="Inputs_Keywords"
      extra={
        <Space>
          <Button onClick={() => q.refetch()} loading={q.isFetching}>
            刷新
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        表头：<Tag>Country</Tag><Tag>Keyword</Tag><Tag>Tag</Tag><Tag>AMZ123_Entry_URL</Tag><Tag>Enabled</Tag><Tag>Notes</Tag>
      </Typography.Paragraph>

      <Card size="small" title="新增关键词" style={{ marginBottom: 12 }}>
        <Form form={form} layout="inline" onFinish={addRow} initialValues={{ Enabled: true }}>
          <Form.Item name="Country" label="Country" rules={[{ required: true }]}>
            <Input placeholder="US" style={{ width: 90 }} />
          </Form.Item>
          <Form.Item name="Keyword" label="Keyword" rules={[{ required: true }]}>
            <Input placeholder="关键词" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="Tag" label="Tag">
            <Input placeholder="标签" style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="AMZ123_Entry_URL" label="AMZ123" >
            <Input placeholder="入口URL" style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="Enabled" label="Enabled" valuePropName="checked">
            <Checkbox />
          </Form.Item>
          <Form.Item name="Notes" label="Notes">
            <Input placeholder="备注" style={{ width: 180 }} />
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
          { title: 'Country', dataIndex: 'Country', width: 120, fixed: 'left' },
          { title: 'Keyword', dataIndex: 'Keyword', width: 220 },
          { title: 'Tag', dataIndex: 'Tag', width: 160 },
          { title: 'AMZ123_Entry_URL', dataIndex: 'AMZ123_Entry_URL', width: 360 },
          {
            title: 'Enabled',
            dataIndex: 'Enabled',
            width: 120,
            render: (_, record) => (
              <a onClick={() => toggleEnabled(record)}>
                {String(record.Enabled || '') || 'FALSE'}
              </a>
            ),
          },
          { title: 'Notes', dataIndex: 'Notes', width: 240 },
          { title: 'Row', dataIndex: '__row', width: 80, fixed: 'right' },
        ]}
        loading={q.isLoading}
      />
    </Card>
  )
}
