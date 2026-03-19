import { Alert, Card, Col, Descriptions, Row, Space, Spin, Statistic, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { getSystemStatus } from '../api/system'

export default function ConfigPage() {
  const statusQ = useQuery({ queryKey: ['system-status'], queryFn: getSystemStatus })

  const data = statusQ.data?.data

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="配置中心 / 系统状态">
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          这里是<strong>只读配置 / 状态页</strong>：统一看 API / DB / 同步 / 通知钩子的当前状态。敏感配置仍在服务端维护，不在前端暴露或修改。
        </Typography.Paragraph>
        {statusQ.isLoading ? (
          <Spin />
        ) : statusQ.isError || !data ? (
          <Alert type="error" showIcon message="无法获取系统状态" />
        ) : (
          <Alert
            type="info"
            showIcon
            message="当前状态：配置展示可用，敏感项只读。"
            description="如果下方有红色状态，优先检查环境变量 / DB / worker / tunnel。"
          />
        )}
      </Card>

      {data && (
        <>
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
              <Card size="small" title="环境变量 / 钩子状态">
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="API_SHARED_SECRET">
                    <Space>
                      <Tag color={data.api_shared_secret_configured ? 'green' : 'red'}>
                        {data.api_shared_secret_configured ? '已配置' : '未配置'}
                      </Tag>
                      <Typography.Text type="secondary">用于前后端鉴权</Typography.Text>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="SHEET_ID">
                    <Space>
                      <Tag color={data.sheet_id_configured ? 'green' : 'red'}>
                        {data.sheet_id_configured ? '已配置' : '未配置'}
                      </Tag>
                      <Typography.Text type="secondary">Google Sheet 数据源</Typography.Text>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="FEISHU_MONITOR_WEBHOOK">
                    <Space>
                      <Tag color={data.feishu_monitor_webhook_configured ? 'green' : 'default'}>
                        {data.feishu_monitor_webhook_configured ? '已配置' : '未配置'}
                      </Tag>
                      <Typography.Text type="secondary">Monitor 通知钩子（可选）</Typography.Text>
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card size="small" title="数据库状态">
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="DB 文件">
                    <Space>
                      <Typography.Text>{data.db_path}</Typography.Text>
                      <Tag color={data.db_exists ? 'green' : 'red'}>{data.db_exists ? '存在' : '缺失'}</Tag>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="监控目标数">
                    <Space>
                      <Statistic value={data.monitor_target_total} />
                      <Typography.Text type="secondary">
                        启用：{data.monitor_target_enabled}
                      </Typography.Text>
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card size="small" title="最近任务时间">
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="Learn 最近同步">
                    {data.learn_last_sync_at || <Typography.Text type="secondary">暂无记录</Typography.Text>}
                  </Descriptions.Item>
                  <Descriptions.Item label="News 最近同步">
                    {data.news_last_sync_at || <Typography.Text type="secondary">暂无记录</Typography.Text>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Monitor 最近扫描">
                    {data.monitor_last_scan_at || <Typography.Text type="secondary">暂无记录</Typography.Text>}
                  </Descriptions.Item>
                  <Descriptions.Item label="Analysis 最近报告">
                    {data.analysis_last_report_at || <Typography.Text type="secondary">暂无记录</Typography.Text>}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Space>
  )
}
