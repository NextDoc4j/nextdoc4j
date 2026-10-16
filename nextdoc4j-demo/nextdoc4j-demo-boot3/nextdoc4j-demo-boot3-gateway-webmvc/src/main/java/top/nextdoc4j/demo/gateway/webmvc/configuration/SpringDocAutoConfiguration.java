package top.nextdoc4j.demo.gateway.webmvc.configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import top.nextdoc4j.demo.gateway.webmvc.configuration.properties.ProjectProperties;

/**
 * API 文档自动配置
 *
 * @author Charles7c
 * @since 1.0.0
 */
@Component
@RequiredArgsConstructor
@EnableConfigurationProperties({ProjectProperties.class})
public class SpringDocAutoConfiguration implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/favicon.ico")
            .addResourceLocations("classpath:./", "classpath:/static/");
    }

    @Bean
    @ConditionalOnMissingBean(OpenAPI.class)
    public OpenAPI openApi(ProjectProperties projectProperties) {
        Info info = new Info()
            .title("%s %s".formatted(projectProperties.getName(), "API 文档"))
            .version(projectProperties.getVersion())
            .description(projectProperties.getDescription());

        ProjectProperties.Contact contact = projectProperties.getContact();
        if (contact != null) {
            info.contact(new Contact()
                .name(contact.getName())
                .email(contact.getEmail())
                .url(contact.getUrl()));
        }

        ProjectProperties.License license = projectProperties.getLicense();
        if (license != null) {
            info.license(new License()
                .name(license.getName())
                .url(license.getUrl()));
        }

        return new OpenAPI().info(info);
    }
}
