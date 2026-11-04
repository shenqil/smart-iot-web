import { AdminLayout } from '@/layouts/AdminLayout'
import { adminMenu } from './menu'

export default function AdminPortalLayout() {
  return <AdminLayout portal="admin" basePath="/admin" menu={adminMenu} />
}
