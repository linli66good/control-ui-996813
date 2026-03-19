import { Alert, Card, Col, List, Row, Statistic, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { getLearnList, getNewsList, getRange, getTabs } from '../api/client'
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

  const learnApiQ = useQuery({
    queryKey: ['learn-list', 'dashboard', today],
    queryFn: () => getLearnList({ page: 1, page_size: 20, date: today }),
  })
  const newsApiQ = useQuery({
    queryKey: ['news-list', 'dashboard', today],
    queryFn: () => getNewsList({ page: 1, page_size: 20, date: today }),
  })

  const learnSheetQ = useQuery({
    queryKey: ['range', 'Learn_Top3', 'dashboard'],
    queryFn: () => getRange('Learn_Top3!A1:I200'),
    enabled: !(learnApiQ.data?.data.items?.length ?? 0),
  })
  const newsSheetQ = useQuery({
    queryKey: ['range', 'Daily_News', 'dashboard'],
    queryFn: () => getRange('Daily_News!A1:G200'),
    enabled: !(newsApiQ.data?.data.items?.length ?? 0),
  })

  const learnRows = useMemo(() => {
    const apiItems = learnApiQ.data?.data.items || []
    if (apiItems.length) {
      return apiItems.map((item) => ({ key: `api-${item.id}`, title: item.title }))
    }
    const rows = rowsFromRange(learnSheetQ.data?.values || null)
    return rows
      .filter((x) => String(x['Date'] || '') === today)
      .map((x, idx) => ({ key: `sheet-${idx}`, title: String(x['Title'] || '') }))
  }, [learnApiQ.data, learnSheetQ.data, today])

  const newsRows = useMemo(() => {
    const apiItems = newsApiQ.data?.data.items || []
    if (apiItems.length) {
      return apiItems.map((item) => ({ key: `api-${item.id}`, title: item.title }))
    }
    const rows = rowsFromRange(newsSheetQ.data?.values || null)
    return rows
      .filter((x) => String(x['日期(UTC+8)'] || '') === today)
      .map((x, idx) => ({ key: `sheet-${idx}`, title: String(x['标题'] || '') }))
  }, [newsApiQ.data, newsSheetQ.data, today])

  const learnUsingApi = (learnApiQ.data?.data.items || []).length > 0
  const newsUsingApi = (newsApiQ.data?.data.items || []).length > 0

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card
              title="自动学习（今日）"
              bordered
              extra={
                <>
                  <Tag color={learnUsingApi ? 'green' : 'gold'}>{learnUsingApi ? 'API' : 'Sheet'}</Tag>
                  <a href="/learn">进入</a>
                </>
              }
            >
              {learnApiQ.isError && !learnUsingApi ? (
                <Alert type="warning" showIcon message="Learn API 暂不可用，已回退到 Sheet。" style={{ marginBottom: 12 }} />
              ) : null}
              <Statistic value={learnRows.length} title="今日条目数" />
              <List
                style={{ marginTop: 12 }}
                size="small"
                dataSource={learnRows.slice(0, 3)}
                renderItem={(item) => (
                  <List.Item>
                    <Typography.Text ellipsis>{item.title}</Typography.Text>
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card
              title="每日新闻（今日）"
              bordered
              extra={
                <>
                  <Tag color={newsUsingApi ? 'green' : 'gold'}>{newsUsingApi ? 'API' : 'Sheet'}</Tag>
                  <a href="/news">进入</a>
                </>
              }
            >
              {newsApiQ.isError && !newsUsingApi ? (
                <Alert type="warning" showIcon message="News API 暂不可用，已回退到 Sheet。" style={{ marginBottom: 12 }} />
              ) : null}
              <Statistic value={newsRows.length} title="今日条目数" />
              <List
                style={{ marginTop: 12 }}
                size="small"
                dataSource={newsRows.slice(0, 3)}
                renderItem={(item) => (
                  <List.Item>
                    <Typography.Text ellipsis>{item.title}</Typography.Text>
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
          <Typography.Paragraph style={{ marginBottom: 0 }}>{today}</Typography.Paragraph>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Dashboard 已切为 API 优先 / Sheet 保底。
          </Typography.Paragraph>
        </Card>
      </Col>
    </Row>
  )
}
