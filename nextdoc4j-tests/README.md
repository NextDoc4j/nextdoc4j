# nextdoc4j-tests 集中测试

[返回仓库总览](../README.md)

这里集中维护产品模块的单元测试和跨模块验证。生产模块不再分散维护测试源码，测试模块通过依赖产品模块统一运行测试，但自身不安装、不部署、不发布到 Maven Central。

## 目录结构

```text
nextdoc4j-tests/
├── pom.xml                 # 测试聚合模块，继承 nextdoc4j 后端 POM
└── src/
    └── test/
        └── java/top/nextdoc4j/
            ├── core/       # 核心 JSON、路径和工具测试
            ├── adapter/    # Jackson 2/3 适配器测试
            ├── plugin/     # 网关路由、元数据和 OpenAPI 改写测试
            ├── security/   # Sa-Token 和安全排除逻辑测试
            ├── spring/     # Spring 公共过滤器、资源和 WebFlux 测试
            └── springboot/ # Starter 配置和校验测试
```

测试包名应与被测产品包保持对应关系，便于 AI 和维护者定位测试覆盖范围。测试数据和夹具优先放在测试资源目录，不要依赖个人机器上的文件或运行中的服务。

## 运行测试

推荐从仓库根目录运行完整聚合测试：

```bash
mvn test
```

只运行集中测试模块：

```bash
mvn -f nextdoc4j-tests/pom.xml test
```

发布前的完整验证还包括前端和打包预览：

```bash
pnpm --dir nextdoc4j-ui run check
pnpm --dir release run test-preview
```

## 新增测试

新增测试时请：

1. 把测试放入与被测功能对应的包；
2. 使用确定性的输入和断言，避免依赖网络、时间和本机端口；
3. 为边界条件、兼容性分支和异常路径补充测试；
4. 在 Pull Request 中说明新增覆盖的行为；
5. 不把测试模块的空 Jar 当作可发布制品。
