package dw.nextdoc4j.core.extension;

import io.swagger.v3.oas.models.OpenAPI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springdoc.core.customizers.GlobalOpenApiCustomizer;
import dw.nextdoc4j.core.configuration.NextDoc4jExtension;
import dw.nextdoc4j.core.configuration.NextDoc4jProperties;

import java.util.Map;

/**
 * openapi 扩展处理
 *
 * @author echo
 * @since 1.0.0
 **/
public class NextDoc4jExtensionOpenApiCustomizer implements GlobalOpenApiCustomizer {

    private static final Logger log = LoggerFactory.getLogger(NextDoc4jExtensionOpenApiCustomizer.class);

    /**
     * springdoc 扩展属性 key 值
     */
    public static final String X_EXPAND = "x-nextdoc4j";

    private final NextDoc4jProperties properties;
    private final NextDoc4jExtensionResolver resolver;

    public NextDoc4jExtensionOpenApiCustomizer(NextDoc4jProperties properties, NextDoc4jExtensionResolver resolver) {
        this.properties = properties;
        this.resolver = resolver;
    }

    @Override
    public void customise(OpenAPI openApi) {
        try {
            NextDoc4jExtension extension = properties.getExtension();
            // 直接构建扩展数据
            Map<String, Object> extensionData = resolver.buildExtensionData(extension);
            if (!extensionData.isEmpty()) {
                // 添加到 OpenAPI 的扩展属性中
                openApi.addExtension(X_EXPAND, extensionData);
            }
        } catch (Exception e) {
            log.error("Failed to customize OpenAPI with NextDoc4j extensions", e);
        }
    }
}
