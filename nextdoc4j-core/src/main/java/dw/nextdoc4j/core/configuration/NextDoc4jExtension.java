package dw.nextdoc4j.core.configuration;

import org.springframework.boot.context.properties.NestedConfigurationProperty;
import dw.nextdoc4j.core.configuration.extension.NextDoc4jBrand;
import dw.nextdoc4j.core.configuration.extension.NextDoc4jMarkdown;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

/**
 * 扩展属性
 *
 * @author echo
 * @since 1.0.0
 **/
public class NextDoc4jExtension implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 是否启用 默认为 false
     */
    private boolean enabled = false;

    /**
     * markdown 文档信息
     */
    private List<NextDoc4jMarkdown> markdown;

    /**
     * 品牌信息 - 定制 logo 和页脚信息
     */
    @NestedConfigurationProperty
    private NextDoc4jBrand brand;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public List<NextDoc4jMarkdown> getMarkdown() {
        return markdown;
    }

    public void setMarkdown(List<NextDoc4jMarkdown> markdown) {
        this.markdown = markdown;
    }

    public NextDoc4jBrand getBrand() {
        return brand;
    }

    public void setBrand(NextDoc4jBrand brand) {
        this.brand = brand;
    }
}
