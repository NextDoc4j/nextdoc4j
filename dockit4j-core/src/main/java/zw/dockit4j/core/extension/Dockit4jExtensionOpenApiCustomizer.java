package zw.dockit4j.core.extension;

import io.swagger.v3.oas.models.OpenAPI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springdoc.core.customizers.GlobalOpenApiCustomizer;
import zw.dockit4j.core.configuration.Dockit4jExtension;
import zw.dockit4j.core.configuration.Dockit4jProperties;
import zw.dockit4j.core.constant.Dockit4jBaseConstant;

import java.util.Map;

/**
 * openapi 扩展处理
 *
 * @author echo
 * @since 1.0.0
 **/
public class Dockit4jExtensionOpenApiCustomizer implements GlobalOpenApiCustomizer {

    private static final Logger log = LoggerFactory.getLogger(Dockit4jExtensionOpenApiCustomizer.class);


    /**
     * springdoc 扩展属性 key 值
     */
    public static final String X_EXPAND = "x-dockit4j";

    private final Dockit4jProperties properties;
    private final Dockit4jExtensionResolver resolver;

    public Dockit4jExtensionOpenApiCustomizer(Dockit4jProperties properties, Dockit4jExtensionResolver resolver) {
        this.properties = properties;
        this.resolver = resolver;
    }

    @Override
    public void customise(OpenAPI openApi) {
        try {
            Dockit4jExtension extension = properties.getExtension();
            // 直接构建扩展数据
            Map<String, Object> extensionData = resolver.buildExtensionData(extension);
            if (!extensionData.isEmpty()) {
                // 添加到 OpenAPI 的扩展属性中
                openApi.addExtension(X_EXPAND, extensionData);
            }
        } catch (Exception e) {
            log.error("Failed to customize OpenAPI with dockit4j extensions", e);
        }
    }
}
