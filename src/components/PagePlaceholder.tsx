import { Card, Tag } from 'antd'

/** 骨架阶段的占位页：说明该页将实现的内容与所属里程碑 */
export function PagePlaceholder({ title, milestone, items }: { title: string; milestone: string; items: string[] }) {
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          {title}
          <Tag color="default">{milestone} 实现</Tag>
        </span>
      }
    >
      <ul className="m-0 list-disc space-y-1.5 pl-5 text-fg-secondary">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </Card>
  )
}
