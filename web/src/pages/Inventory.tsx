import { Alert, Button, Card, Col, Row, Space, Table, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'

const rows = [
  {
    key: '1',
    sku: 'DEMO-SKU-001',
    asin: 'B07FZ8S74R',
    site: 'US',
    status: '待接库存源',
    note: '后续接表格 / ERP / 手工补货计划。',
  },
  {
    key: '2',
    sku: 'DEMO-SKU-002',
    asin: 'B0XXXXXXX2',
    site: 'DE',
    status: '待接库存源',
    note: '先定义安全库存、补货周期、在途字段。',
  },
]

export default function Inventory() {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="库存管理" extra={<Button type="primary"><Link to="/inputs/asins">去维护 ASIN 池</Link></Button>}>
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          这个页先补成<strong>库存中控骨架</strong>：不再是空白页，但也不假装已经接好了 ERP。先把后面要接的字段和使用方式定住。
        </Typography.Paragraph>
        <Alert
          type="warning"
          showIcon
          message="当前状态：ASIN 池已可维护，库存/在途/补货数据源还没正式接入。"
          description="后续最省事的路线是先吃表格，再决定要不要接 ERP / 店铺报表。"
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card size="small" title="建议核心字段">
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>站点 / ASIN / SKU</li>
              <li>可售库存 / 在途库存</li>
              <li>日均销量 / 安全天数</li>
              <li>建议补货日期 / 缺货风险</li>
            </ul>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title="推荐判定">
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>库存可售天数 &lt; 安全天数</li>
              <li>在途覆盖不足</li>
              <li>连续高销量异常波动</li>
            </ul>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title="优先落地方式">
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>先手工导入 CSV / Sheet</li>
              <li>每天固定时间更新</li>
              <li>后续再补自动预警</li>
            </ul>
          </Card>
        </Col>
      </Row>

      <Card title="库存视图样例" extra={<Space><Tag color="gold">待接数据</Tag><Tag>结构已定</Tag></Space>}>
        <Table
          size="small"
          pagination={false}
          dataSource={rows}
          columns={[
            { title: 'SKU', dataIndex: 'sku', width: 160 },
            { title: 'ASIN', dataIndex: 'asin', width: 160 },
            { title: '站点', dataIndex: 'site', width: 100 },
            {
              title: '状态',
              dataIndex: 'status',
              width: 140,
              render: (v: string) => <Tag color="orange">{v}</Tag>,
            },
            { title: '说明', dataIndex: 'note' },
          ]}
        />
      </Card>
    </Space>
  )
}
