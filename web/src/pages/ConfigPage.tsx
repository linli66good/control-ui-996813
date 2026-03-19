import { Alert, Card, Col, Descriptions, Row, Space, Tag, Typography } from 'antd'

const envRows = [
  { key: '1', name: 'API_BASE', value: 'https://api.996813.xyz', status: '已使用' },
  { key: '2', name: 'API_SHARED_SECRET', value: 'Pages / API 保持一致', status: '关键' },
  { key: '3', name: 'SHEET_ID', value: 'Google Sheet 数据源', status: '已使用' },
  { key: '4', name: 'FEISHU_MONITOR_WEBHOOK', value: 'Monitor 通知钩子', status: '可选' },
]

export default function ConfigPage() {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="配置中心">
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          这个页面先补成<strong>配置说明页</strong>，统一记录当前系统依赖、关键环境变量和后续接入点。先不在前端直接改敏感配置，避免误操作。
        </Typography.Paragraph>
        <Alert
          type="warning"
          showIcon
          message="当前状态：配置展示可用，在线编辑未开放。"
          description="像 API_SHARED_SECRET、SHEET_ID、Webhook 这类敏感项，仍建议只在服务器 / Pages 环境变量里维护。"
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card size="small" title="当前系统角色">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="前端">app.996813.xyz / Cloudflare Pages</Descriptions.Item>
              <Descriptions.Item label="后端">api.996813.xyz / Tunnel → 127.0.0.1:8787</Descriptions.Item>
              <Descriptions.Item label="数据">SQLite + Google Sheets 保底</Descriptions.Item>
              <Descriptions.Item label="自动化">cron + Python workers</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title="配置原则">
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>敏感值不落前端</li>
              <li>页面只做说明，不直接改生产密钥</li>
              <li>新增集成先补 env，再补页面入口</li>
            </ul>
          </Card>
        </Col>
      </Row>

      <Card title="关键环境项">
        <Space size={[8, 8]} wrap style={{ marginBottom: 12 }}>
          <Tag color="blue">说明页</Tag>
          <Tag color="gold">敏感项只读</Tag>
        </Space>
        <Descriptions bordered size="small" column={1}>
          {envRows.map((item) => (
            <Descriptions.Item
              key={item.key}
              label={item.name}
            >
              <Space>
                <Typography.Text>{item.value}</Typography.Text>
                <Tag color={item.status === '关键' ? 'red' : item.status === '可选' ? 'default' : 'green'}>{item.status}</Tag>
              </Space>
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Card>
    </Space>
  )
}
