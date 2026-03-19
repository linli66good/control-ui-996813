import { Alert, Card, Col, Row, Space, Table, Tag, Typography } from 'antd'

const rows = [
  {
    key: '1',
    route: 'CN → US',
    channel: '海运整柜 / 美西',
    status: '待接时效数据',
    note: '后续接承运商节点 / 到港 / 签收 / 异常状态。',
  },
  {
    key: '2',
    route: 'CN → DE',
    channel: '铁路 / 卡航',
    status: '待接时效数据',
    note: '先统一节点口径，再补延误预警。',
  },
]

export default function Logistics() {
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="物流监控">
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          这个页先补成<strong>物流监控占位 MVP</strong>：把未来要看的线路、时效、异常节点先收口，不再留空白。
        </Typography.Paragraph>
        <Alert
          type="info"
          showIcon
          message="当前状态：页面已补齐，实际物流节点/承运商数据尚未接入。"
          description="建议后续先接最少字段：线路、渠道、发货时间、预计到仓时间、最新节点、异常标记。"
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={8}>
          <Card size="small" title="建议追踪字段">
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>线路 / 渠道 / 承运商</li>
              <li>发货时间 / ETA / 实际签收</li>
              <li>最新节点 / 当前状态</li>
              <li>异常标签 / 处理备注</li>
            </ul>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title="重点异常">
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>超 ETA 未更新</li>
              <li>清关异常</li>
              <li>预约入仓延迟</li>
              <li>尾程签收异常</li>
            </ul>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title="后续最小闭环">
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              <li>每天同步一次节点</li>
              <li>异常单独高亮</li>
              <li>必要时再补通知钩子</li>
            </ul>
          </Card>
        </Col>
      </Row>

      <Card title="物流线路样例" extra={<Space><Tag color="cyan">MVP</Tag><Tag>待接数据</Tag></Space>}>
        <Table
          size="small"
          pagination={false}
          dataSource={rows}
          columns={[
            { title: '线路', dataIndex: 'route', width: 140 },
            { title: '渠道', dataIndex: 'channel', width: 220 },
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
