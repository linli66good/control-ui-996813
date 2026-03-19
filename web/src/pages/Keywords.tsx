import { Alert, Button, Card, Col, Row, Space, Table, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'

const seeds = [
  {
    key: '1',
    country: 'US',
    keyword: 'wireless earbuds',
    source: 'Inputs_Keywords',
    status: '待补采集',
    note: '先维护词池，再补趋势/竞价/热度抓取。',
  },
  {
    key: '2',
    country: 'DE',
    keyword: 'küchen organizer',
    source: 'Inputs_Keywords',
    status: '待补采集',
    note: '后续接 Google Trends / Amazon Ads 词报表。',
  },
]

export default function Keywords() {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="关键词 / 趋势" extra={<Button type="primary"><Link to="/inputs/keywords">去维护词池</Link></Button>}>
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          这里先收尾成<strong>可用 MVP 页面</strong>：当前先把关键词输入池、后续采集方向、以及模块边界讲清楚，避免继续空着。
        </Typography.Paragraph>
        <Alert
          type="info"
          showIcon
          message="当前状态：词池入口已就位，趋势/广告/搜索量抓取还没正式接。"
          description="建议先持续维护 Inputs_Keywords，后面直接把 Trends / 搜索建议 / 广告词报表结果灌进来。"
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card size="small" title="当前能做">
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>维护关键词池</li>
              <li>按国家分词</li>
              <li>记录标签 / 入口链接 / 启用状态</li>
            </ul>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title="下一步接入">
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>Google Trends 趋势</li>
              <li>Amazon 站内建议词</li>
              <li>广告关键词表现同步</li>
            </ul>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title="推荐动作">
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>先补 20~50 个核心词</li>
              <li>按站点拆标签</li>
              <li>只保留真的会追踪的词</li>
            </ul>
          </Card>
        </Col>
      </Row>

      <Card title="词池样例预览" extra={<Space><Tag color="blue">MVP</Tag><Tag>输入先行</Tag></Space>}>
        <Table
          size="small"
          pagination={false}
          dataSource={seeds}
          columns={[
            { title: '国家', dataIndex: 'country', width: 100 },
            { title: '关键词', dataIndex: 'keyword', width: 240 },
            { title: '来源', dataIndex: 'source', width: 160 },
            {
              title: '状态',
              dataIndex: 'status',
              width: 120,
              render: (v: string) => <Tag color="orange">{v}</Tag>,
            },
            { title: '说明', dataIndex: 'note' },
          ]}
        />
      </Card>
    </Space>
  )
}
