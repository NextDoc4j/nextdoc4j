package top.nextdoc4j.demo.springboot.configuration.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 项目属性
 */
@Data
@ConfigurationProperties("project")
public class ProjectProperties {

    private String name;

    private String version;

    private String description;

    private Contact contact;

    private License license;

    @Data
    public static class Contact {
        private String name;
        private String email;
        private String url;
    }

    @Data
    public static class License {
        private String name;
        private String url;
    }
}
