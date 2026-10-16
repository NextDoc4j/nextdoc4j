package top.nextdoc4j.demo.springboot.configuration;

import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

/**
 * 分组api
 *
 * @author echo
 * @since 2025/11/11
 */
@Component
public class GroupedApi {


    @Bean
    public GroupedOpenApi userApi() {
        return GroupedOpenApi.builder()
                .group("account")
                .displayName("用户与角色管理 API")
                .packagesToScan(
                        "top.nextdoc4j.demo.controller.user.user",
                        "top.nextdoc4j.demo.controller.user.role"
                )
                .addOpenApiCustomizer(getCustomizer("用户与角色管理相关接口"))
                .build();
    }

    @Bean
    public GroupedOpenApi systemApi() {
        return GroupedOpenApi.builder()
                .group("system")
                .displayName("系统管理 API")
                .packagesToScan(
                        "top.nextdoc4j.demo.controller.system.system",
                        "top.nextdoc4j.demo.controller.system.notification"
                )
                .addOpenApiCustomizer(getCustomizer("系统管理相关接口"))
                .build();
    }

    @Bean
    public GroupedOpenApi fileApi() {
        return GroupedOpenApi.builder()
                .group("file")
                .displayName("文件管理 API")
                .packagesToScan("top.nextdoc4j.demo.controller.file")
                .addOpenApiCustomizer(getCustomizer("文件管理相关接口"))
                .build();
    }

    @Bean
    public GroupedOpenApi authApi() {
        return GroupedOpenApi.builder()
                .group("auth")
                .displayName(" 认证管理 API")
                .packagesToScan("top.nextdoc4j.demo.controller.user.auth")
                .addOpenApiCustomizer(getCustomizer("认证管理相关接口"))
                .build();
    }

    /**
     * 获取自定义配置器
     */
    private OpenApiCustomizer getCustomizer(String description) {
        return openApi -> {
            if (openApi.getInfo() != null) {
                openApi.getInfo().setDescription(description);
            }
        };
    }
}
