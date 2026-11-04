import { useNavigate } from 'react-router'
import { entryPath } from '@/app/navigation'
import { NotFoundResult } from '@/components/RouteError'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return <NotFoundResult onHome={() => navigate(entryPath())} />
}
