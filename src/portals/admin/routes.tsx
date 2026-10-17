import type { RouteObject } from 'react-router'
import { placeholderRoute } from '../placeholder'

export const adminRoutes: RouteObject[] = [
  { index: true, lazy: async () => ({ Component: (await import('@/features/dashboard/AdminDashboard')).default }) },
  placeholderRoute('companies', '企业管理', 'M2', [
    '企业列表：关键字、状态筛选，过期时间标色，批量删除',
    '新建 / 编辑企业 (Logo 上传、过期时间)',
    '企业详情：成员 (分配角色)、设备 (授权 / 撤销)、园区 (只读 + 地图)',
  ]),
  placeholderRoute('users', '用户管理', 'M2', [
    '用户列表：关键字、系统角色、状态、只看公海用户',
    '新建 / 编辑 / 重置密码 / 批量删除 (不能操作自己的角色与状态)',
    '用户详情：所属企业与企业角色',
  ]),
  placeholderRoute('devices', '设备管理', 'M2', [
    '设备列表：关键字 (SN/名称/SIM/MAC)、类型、状态、只看公海；在线状态',
    '登记设备、批量授权 / 撤销授权',
    '设备配置：基本信息 (地图选点)、传感器 (校准 / 告警规则)、继电器、摄像头、授权企业',
  ]),
  {
    path: 'dicts',
    handle: { crumb: '字典管理' },
    children: [
      placeholderRoute('device-types', '设备类型', 'M2', ['名称、图标、描述、排序的增删改']),
      placeholderRoute('standard-sensors', '标准传感器', 'M2', ['名称、单位、量程、分辨率、图标的增删改']),
      placeholderRoute('standard-relays', '标准继电器', 'M2', ['名称、图标的增删改']),
    ],
  },
]
