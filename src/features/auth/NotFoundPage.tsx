import { useNavigate } from 'react-router'
import { NotFoundResult } from '@/components/RouteError'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return <NotFoundResult onHome={() => navigate('/')} />
}
