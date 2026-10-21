# smart-iot-web

Smart IoT 前端：平台管理端、企业管理端、数据使用端与数据大屏在同一份代码中。

- 技术栈与工程规范：[../docs/FRONTEND_ARCHITECTURE.md](../docs/FRONTEND_ARCHITECTURE.md)
- 页面、交互与接口调用：[../docs/FRONTEND_DESIGN.md](../docs/FRONTEND_DESIGN.md)

## 开发

```bash
corepack enable            # 启用 pnpm (版本见 package.json packageManager)
pnpm install
pnpm dev                   # http://localhost:5173，/api 代理到 DEV_API_TARGET (默认 127.0.0.1:10888)
```

所有环境变量都有默认值 (见 `.env.example`)。需要覆盖时 (如后端地址、天地图 Key) 复制为 `.env.development.local` (不入库) 再修改。

## 接口类型

后端接口变更后，在仓库根目录导出 OpenAPI，再生成前端类型，两个文件一起提交：

```bash
make openapi               # 仓库根目录：导出 api/openapi.json (不需要数据库)
cd web && pnpm gen:api     # 生成 src/api/schema.d.ts
```

## 常用命令

| 命令 | 说明 |
| :--- | :--- |
| `pnpm check` | Biome + 类型检查 + 单测 (提交前) |
| `pnpm build` | 生产构建，产物在 `dist/` |
| `pnpm format` | 自动格式化与整理 import |

## 目录

```
src/
├── api/          接口客户端 (openapi-fetch)、错误模型、分页工具、生成的 schema.d.ts
├── app/          Provider、QueryClient 与全局错误处理、路由守卫、主题、会话监听
├── stores/       Zustand：会话、本机偏好
├── layouts/      AdminLayout (平台 / 企业)、app/ (数据端外壳与园区设备树)
├── portals/      各端的路由与菜单
├── features/     按业务功能分目录 (与后端 internal/business 对齐)
├── components/   通用组件
├── hooks/        通用 Hook
└── lib/          端与权限计算、业务时区、表单错误回填
```

## 部署

`pnpm build` 后把 `dist/` 交给 Nginx，配置模板见 `nginx/default.conf.template`。
