import { Card, Col, List, Row, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { getTabs } from '../api/client'

export default function Dashboard() {
  const tabsQ = useQuery({ queryKey: ['tabs'], queryFn: getTabs })

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        <Card title="模块" bordered>
          <Row gutter={[12, 12]}>
            {[
              ['每日新闻', '/news'],
              ['自动学习', '/learn'],
              ['竞品监控', '/comp'],
              ['选品', '/finder'],
              ['关键词/趋势', '/kw'],
              ['库存管理', '/inventory'],
              ['物流监控', '/logistics'],
            ].map(([name, path]) => (
              <Col key={path} xs={12} md={8}>
                <Card size="small" hoverable>
                  <a href={path} style={{ fontWeight: 600 }}>
                    {name}
                  </a>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
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
      </Col>
    </Row>
  )
}
