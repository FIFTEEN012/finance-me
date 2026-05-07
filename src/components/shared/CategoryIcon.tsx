import * as Icons from 'lucide-react'
import { LucideProps } from 'lucide-react'

interface CategoryIconProps extends LucideProps {
  name: string
}

export function CategoryIcon({ name, ...props }: CategoryIconProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (Icons as any)[name] as React.ComponentType<LucideProps> | undefined
  if (!Icon) return <Icons.Circle {...props} />
  return <Icon {...props} />
}
