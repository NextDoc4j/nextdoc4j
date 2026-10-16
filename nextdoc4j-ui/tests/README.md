# 测试目录约定

所有自动化测试统一放在项目根目录 `tests/`，不在 `src/` 中放置测试文件。

```text
tests/
├── fixtures/                 # 可复用 OpenAPI、网关与请求测试数据
├── lib/                      # 固定 Hash、通用工具测试
└── features/
    ├── aggregation/
    ├── documentation/
    ├── openapi/
    ├── playground/
    └── security/
```

规则：

- 测试文件命名为 `*.test.ts` 或 `*.test.tsx`。
- 生产代码从 `src/` 相对导入；测试 Fixture 从 `tests/fixtures` 导入。
- 新增业务逻辑时，先在 `tests/fixtures` 补充可复用数据，再添加测试用例。
- `pnpm typecheck` 通过 `tsconfig.test.json` 校验测试代码；`pnpm test` 发现 `tests/**/*.test.{ts,tsx}`。
