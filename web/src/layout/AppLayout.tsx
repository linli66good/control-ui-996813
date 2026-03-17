import { Layout, Menu, Typography } from 'antd'
import {
  AppstoreOutlined,
  DatabaseOutlined,
  ReadOutlined,
  NotificationOutlined,
  LineChartOutlined,
  ShoppingOutlined,
  CarOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { Link, useLocation } from 'react-router-dom'

const { Sider, Header, Content } = Layout

const items = [
  { key: '/', icon: <AppstoreOutlined />, label: <Link to="/">Dashboard</Link> },
  { key: '/news', icon: <NotificationOutlined />, label: <Link to="/news">每日新闻</Link> },
  { key: '/learn', icon: <ReadOutlined />, label: <Link to="/learn">自动学习</Link> },
  { key: '/comp', icon: <LineChartOutlined />, label: <Link to="/comp">竞品监控</Link> },
  { key: '/finder', icon: <ShoppingOutlined />, label: <Link to="/finder">选品</Link> },
  { key: '/kw', icon: <LineChartOutlined />, label: <Link to="/kw">关键词/趋势</Link> },
  { key: '/inventory', icon: <DatabaseOutlined />, label: <Link to="/inventory">库存管理</Link> },
  { key: '/logistics', icon: <CarOutlined />, label: <Link to="/logistics">物流监控</Link> },
  { key: '/range', icon: <DatabaseOutlined />, label: <Link to="/range">Range查看器</Link> },
  { key: '/config', icon: <SettingOutlined />, label: <Link to="/config">配置</Link> },
]

export function AppLayout(props: { children: React.ReactNode }) {
  const loc = useLocation()
  const selected = items.find((x) => loc.pathname === x.key)?.key || '/'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="dark" collapsible>
        <div style={{ padding: '14px 16px' }}>
          <Typography.Title level={5} style={{ color: '#fff', margin: 0 }}>
            996813 控制台
          </Typography.Title>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selected]} items={items} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 16px' }}>
          <Typography.Text strong>{loc.pathname}</Typography.Text>
        </Header>
        <Content style={{ padding: 16 }}>{props.children}</Content>
      </Layout>
    </Layout>
  )
}
