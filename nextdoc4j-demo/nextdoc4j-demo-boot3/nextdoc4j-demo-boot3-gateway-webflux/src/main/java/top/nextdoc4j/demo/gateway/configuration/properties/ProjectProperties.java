package top.nextdoc4j.demo.gateway.configuration.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 项目属性
 *
 * @author echo
 * @date 2025/11/05
 */
@Data
@ConfigurationProperties("project")
public class ProjectProperties {

    /**
     * 名称
     */
    private String name;

    /**
     * 版本
     */
    private String version;

    /**
     * 描述
     */
    private String description;


    /**
     * 联系人
     */
    private Contact contact;

    /**
     * 许可协议
     */
    private License license;


    /**
     * 联系人配置属性
     */
    @Data
    public static class Contact {
        /**
         * 名称
         */
        private String name;

        /**
         * 邮箱
         */
        private String email;

        /**
         * URL
         */
        private String url;
    }

    /**
     * 许可协议配置属性
     */
    @Data
    public static class License {
        /**
         * 名称
         */
        private String name;

        /**
         * URL
         */
        private String url;
    }
}
