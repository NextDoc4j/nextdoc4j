package zw.dockit4j.core.configuration;

import org.springframework.boot.context.properties.NestedConfigurationProperty;
import zw.dockit4j.core.configuration.extension.Dockit4jBasicAuth;
import zw.dockit4j.core.configuration.extension.Dockit4jBrand;
import zw.dockit4j.core.configuration.extension.Dockit4jMarkdown;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

/**
 * 扩展属性
 *
 * @author echo
 * @since 1.0.0
 **/
public class Dockit4jExtension implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 是否启用 默认为 false
     */
    private boolean enabled = false;

    /**
     * markdown 文档信息
     */
    private List<Dockit4jMarkdown> markdown;

    /**
     * 认证
     */
    @NestedConfigurationProperty
    private Dockit4jBasicAuth auth;

    /**
     * 品牌信息 - 定制 logo 和页脚信息
     */
    @NestedConfigurationProperty
    private Dockit4jBrand brand;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public List<Dockit4jMarkdown> getMarkdown() {
        return markdown;
    }

    public void setMarkdown(List<Dockit4jMarkdown> markdown) {
        this.markdown = markdown;
    }

    public Dockit4jBasicAuth getAuth() {
        return auth;
    }

    public void setAuth(Dockit4jBasicAuth auth) {
        this.auth = auth;
    }

    public Dockit4jBrand getBrand() {
        return brand;
    }

    public void setBrand(Dockit4jBrand brand) {
        this.brand = brand;
    }
}
