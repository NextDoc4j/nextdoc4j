package top.nextdoc4j.demo.springboot.configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import org.springdoc.core.customizers.GlobalOpenApiCustomizer;
import org.springdoc.core.customizers.GlobalOperationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.AnnotatedElementUtils;
import top.nextdoc4j.demo.core.annotation.ApiError;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Configuration(proxyBeanMethods = false)
public class GlobalOpenApiAutoConfiguration {


    public static final String API_ERROR_RESPONSE_NAME = "ApiErrorResponse";
    public static final Schema<?> API_ERROR_RESPONSE;

    static {


        Schema<Object> schema = new Schema<>();
        schema.setName(API_ERROR_RESPONSE_NAME);

        schema.setDescription("通用错误响应模型，用于 4xx 和 5xx 错误");
        schema.setType("object");

        schema.addProperty("code", new StringSchema()
                .title("业务错误码")
                .description("场景 code 码/业务 code 码，可以追溯具体原因")
        );

        schema.addProperty("msg", new StringSchema()
                .title("错误消息")
                .description("人类可读的错误描述"));

        API_ERROR_RESPONSE = schema;


    }

    public void initComponents(Components components) {
        components.addSchemas(API_ERROR_RESPONSE_NAME, API_ERROR_RESPONSE);
    }


    @Bean
    public GlobalOpenApiCustomizer demoGlobalOpenApiCustomizer() {

        return openApi -> {

            Components components = openApi.getComponents();

            if (components == null) {
                components = new Components();
                openApi.setComponents(components);
            }

            initComponents(components);
        };
    }


    public static ApiResponse createErrorResponseExample(ApiError apiError) {

        Map<String, Object> example = new HashMap<>();
        example.put("code", apiError.code());
        example.put("msg", apiError.reason());

        return new ApiResponse()
                .description(apiError.reason())
                .content(new Content()
                        .addMediaType("application/json",
                                new MediaType()
                                        .schema(new Schema<>().$ref(API_ERROR_RESPONSE_NAME))
                                        .example(example)
                        )
                );

    }

    @Bean
    public GlobalOperationCustomizer demoOperationCustomizer() {
        return (operation, handlerMethod) -> {

            Method method = handlerMethod.getMethod();
            Set<ApiError> apiErrors = AnnotatedElementUtils.getMergedRepeatableAnnotations(method, ApiError.class);


            ApiResponses responses = operation.getResponses();
            if (responses == null) {
                responses = new ApiResponses();
                operation.setResponses(responses);
            }

            for (ApiError apiError : apiErrors) {
                responses.addApiResponse(apiError.status() + " " + apiError.code(),
                        createErrorResponseExample(apiError));
            }

            return operation;

        };
    }


}
