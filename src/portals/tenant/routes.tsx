import type { RouteObject } from 'react-router'
import { placeholderRoute } from '../placeholder'

export const tenantRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => ({ Component: (await import('@/features/company/tenant/TenantOverview')).default }),
  },
  placeholderRoute('sites', '园区管理', 'M3', [
    '园区列表 (卡片 / 表格)：关键字、状态',
    '新建 / 编辑：地图选点回填省市区与地址、封面、图片墙',
    '园区详情：挂载 / 解除设备',
  ]),
  placeholderRoute('devices', '设备管理', 'M3', [
    '设备列表：关键字、类型、状态、园区',
    '登记设备 (必须挂载 1~50 个园区)；SN 冲突提示联系平台',
    '设备配置 (与平台共用) + 挂载园区；未挂载园区时提示数据端不可见',
  ]),
  placeholderRoute('users', '成员管理', 'M3', [
    '成员列表 (含管理员)、创建用户、批量移出普通成员',
    '不提供修改资料 / 密码 / 角色',
  ]),
  placeholderRoute('company', '企业信息', 'M3', ['查看与修改本企业资料；名称、状态、过期时间由平台管理']),
]
