package top.nextdoc4j.demo.springboot.configuration;

import io.swagger.v3.core.converter.AnnotatedType;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.core.converter.ResolvedSchema;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.examples.Example;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import org.springdoc.core.customizers.GlobalOpenApiCustomizer;
import org.springdoc.core.customizers.GlobalOperationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.AnnotatedElementUtils;
import top.nextdoc4j.demo.core.annotation.ApiError;
import top.nextdoc4j.demo.core.model.base.R;

import java.lang.reflect.Method;
import java.util.*;
import java.util.stream.Collectors;

@Configuration(proxyBeanMethods = false)
public class GlobalOpenApiAutoConfiguration {

    public static final String API_ERROR_RESPONSE_NAME = "RVoid";

    private static final String X_PENDING_EXAMPLES = "x-pending-examples";

    public static final Schema<?> API_ERROR_RESPONSE;

    static {
        ResolvedSchema resolvedSchema = ModelConverters.getInstance()
                .resolveAsResolvedSchema(new AnnotatedType(R.class));
        API_ERROR_RESPONSE = resolvedSchema.schema;
        API_ERROR_RESPONSE.setName(API_ERROR_RESPONSE_NAME);
    }

    @Bean
    public GlobalOpenApiCustomizer globalOpenApiCustomizer() {
        return openApi -> {
            Components components = openApi.getComponents();
            if (components == null) {
                components = new Components();
                openApi.setComponents(components);
            }

            // 1. 注册通用错误 Schema
            components.addSchemas(API_ERROR_RESPONSE_NAME, API_ERROR_RESPONSE);

            // 2. 从所有 operation 的扩展属性中提取 pending examples
            Map<String, Example> examplesToRegister = new LinkedHashMap<>();

            if (openApi.getPaths() != null) {
                openApi.getPaths().forEach((path, pathItem) -> {
                    if (pathItem == null) return;

                    pathItem.readOperations().forEach(operation -> {
                        if (operation == null) return;

                        Map<String, Object> extensions = operation.getExtensions();
                        if (extensions != null && extensions.containsKey(X_PENDING_EXAMPLES)) {
                            @SuppressWarnings("unchecked")
                            Map<String, Example> pending = (Map<String, Example>) extensions.get(X_PENDING_EXAMPLES);
                            if (pending != null) {
                                examplesToRegister.putAll(pending);
                            }
                            extensions.remove(X_PENDING_EXAMPLES);
                        }
                    });
                });
            }

            // 3. 注册提取到的 examples 到 components/examples
            if (!examplesToRegister.isEmpty()) {
                if (components.getExamples() == null) {
                    components.setExamples(new LinkedHashMap<>());
                }
                components.getExamples().putAll(examplesToRegister);
            }
        };
    }

    @Bean
    public GlobalOperationCustomizer apiErrorOperationCustomizer() {
        return (operation, handlerMethod) -> {
            Method method = handlerMethod.getMethod();
            Set<ApiError> apiErrors = AnnotatedElementUtils
                    .getMergedRepeatableAnnotations(method, ApiError.class);

            if (apiErrors.isEmpty()) {
                return operation;
            }

            ApiResponses responses = operation.getResponses();
            if (responses == null) {
                responses = new ApiResponses();
                operation.setResponses(responses);
            }
            final ApiResponses finalResponses = responses;

            Map<String, Example> pendingExamples = new LinkedHashMap<>();

            Map<Integer, List<ApiError>> groups = apiErrors.stream()
                    .sorted(Comparator.comparingInt(ApiError::status)
                            .thenComparing(ApiError::code))
                    .collect(Collectors.groupingBy(
                            ApiError::status,
                            LinkedHashMap::new,
                            Collectors.toList()));

            groups.forEach((status, errors) -> {
                String statusKey = status == -1 ? "default" : String.valueOf(status);
                if (finalResponses.containsKey(statusKey)) {
                    return;
                }

                ApiResponse response = (errors.size() == 1)
                        ? buildSingleResponse(errors.get(0), pendingExamples)
                        : buildMultiResponse(errors, pendingExamples);

                finalResponses.addApiResponse(statusKey, response);
            });

            if (!pendingExamples.isEmpty()) {
                operation.addExtension(X_PENDING_EXAMPLES, pendingExamples);
            }

            return operation;
        };
    }

    private ApiResponse buildSingleResponse(ApiError err, Map<String, Example> pendingExamples) {
        ApiResponse response = new ApiResponse().description(resolveDescription(err));

        if (err.bareContent()) {
            return response;
        }

        MediaType mediaType = new MediaType().schema(new Schema<>().$ref(schemaRef()));
        String key = buildExampleKey(err);
        Example example = buildExample(err);

        if (err.refExample()) {
            pendingExamples.put(key, example);
            mediaType.addExamples(key, new Example().$ref(componentsExampleRef(key)));
        } else {
            mediaType.addExamples(key, example);
        }

        return response.content(new Content().addMediaType(err.mediaType(), mediaType));
    }

    private ApiResponse buildMultiResponse(List<ApiError> errors, Map<String, Example> pendingExamples) {
        String description = errors.stream()
                .map(this::resolveDescription)
                .collect(Collectors.joining(" / "));

        Map<String, Example> examplesMap = new LinkedHashMap<>();

        for (ApiError err : errors) {
            String key = buildExampleKey(err);
            Example example = buildExample(err);

            if (err.refExample()) {
                pendingExamples.put(key, example);
                examplesMap.put(key, new Example().$ref(componentsExampleRef(key)));
            } else {
                examplesMap.put(key, example);
            }
        }

        MediaType mediaType = new MediaType()
                .schema(new Schema<>().$ref(schemaRef()))
                .examples(examplesMap);

        return new ApiResponse()
                .description(description)
                .content(new Content().addMediaType(errors.get(0).mediaType(), mediaType));
    }

    private String resolveDescription(ApiError err) {
        return err.reason().isBlank()
                ? "HTTP " + (err.status() == -1 ? "default" : err.status()) + " 错误响应"
                : err.reason();
    }

    private Example buildExample(ApiError err) {
        String msg = err.message().isBlank() ? err.reason() : err.message();
        return new Example()
                .summary(err.reason().isBlank() ? err.code() : err.reason())
                .value(R.fail(err.code(), msg));
    }

    private String buildExampleKey(ApiError err) {
        String prefix = err.status() == -1 ? "default" : String.valueOf(err.status());
        return prefix + "_" + err.code();
    }

    private String schemaRef() {
        return "#/components/schemas/" + API_ERROR_RESPONSE_NAME;
    }

    private String componentsExampleRef(String key) {
        return "#/components/examples/" + key;
    }
}