import { Card, Col, List, Row, Statistic, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { getRange, getTabs } from '../api/client'
import { useMemo } from 'react'

function todayLocalYYYYMMDD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function rowsFromRange(values: string[][] | null) {
  if (!values || values.length < 2) return []
  const header = values[0]
  return values.slice(1).map((r, i) => {
    const obj: Record<string, any> = { key: i }
    header.forEach((h, idx) => (obj[h || `col_${idx}`] = r[idx] ?? ''))
    return obj
  })
}

export default function Dashboard() {
  const today = todayLocalYYYYMMDD()

  const tabsQ = useQuery({ queryKey: ['tabs'], queryFn: getTabs })

  const newsQ = useQuery({
    queryKey: ['range', 'Daily_News'],
    queryFn: () => getRange('Daily_News!A1:G200'),
  })

  const learnQ = useQuery({
    queryKey: ['range', 'Learn_Top3'],
    queryFn: () => getRange('Learn_Top3!A1:I200'),
  })

  const newsRows = useMemo(() => {
    const rows = rowsFromRange(newsQ.data?.values || null)
    return rows.filter((x) => String(x['日期(UTC+8)'] || '') === today)
  }, [newsQ.data, today])

  const learnRows = useMemo(() => {
    const rows = rowsFromRange(learnQ.data?.values || null)
    return rows.filter((x) => String(x['Date'] || '') === today)
  }, [learnQ.data, today])

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="自动学习（今日）" bordered extra={<a href="/learn">进入</a>}>
              <Statistic value={learnRows.length} title="今日条目数" />
              <List
                style={{ marginTop: 12 }}
                size="small"
                dataSource={learnRows.slice(0, 3)}
                renderItem={(item) => (
                  <List.Item>
                    <Typography.Text ellipsis>{String(item['Title'] || '')}</Typography.Text>
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="每日新闻（今日）" bordered extra={<a href="/news">进入</a>}>
              <Statistic value={newsRows.length} title="今日条目数" />
              <List
                style={{ marginTop: 12 }}
                size="small"
                dataSource={newsRows.slice(0, 3)}
                renderItem={(item) => (
                  <List.Item>
                    <Typography.Text ellipsis>{String(item['标题'] || '')}</Typography.Text>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Col>

      <Col xs={24} lg={8}>
        <Card title="主表 Tabs" bordered>
          {tabsQ.isLoading ? (
            <Typography.Text>加载中…</Typography.Text>
          ) : tabsQ.isError ? (
            <Typography.Text type="danger">加载失败：{String(tabsQ.error)}</Typography.Text>
          ) : (
            <List
              size="small"
              dataSource={tabsQ.data?.tabs || []}
              renderItem={(item) => (
                <List.Item>
                  <Typography.Text>{item.title}</Typography.Text>
                </List.Item>
              )}
            />
          )}
        </Card>

        <Card style={{ marginTop: 16 }} title="今天" bordered>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            {today}
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            （按本地时间筛选 Learn/News）
          </Typography.Paragraph>
        </Card>
      </Col>
    </Row>
  )
}
