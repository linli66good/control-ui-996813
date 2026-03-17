import { Card, Typography } from 'antd'

export default function Placeholder(props: { title: string }) {
  return (
    <Card title={props.title} bordered>
      <Typography.Paragraph type="secondary">模块骨架已就位，待填充数据/交互。</Typography.Paragraph>
    </Card>
  )
}
