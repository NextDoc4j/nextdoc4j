package dw.nextdoc4j.core.configuration;

import org.springframework.boot.context.properties.NestedConfigurationProperty;
import dw.nextdoc4j.core.configuration.extension.NextDoc4jBasicAuth;

import java.io.Serial;
import java.io.Serializable;

/**
 * 配置属性
 *
 * @author echo
 * @since 1.0.0
 **/
public class NextDoc4jProperties implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 是否启用
     */
    private boolean enabled = false;

    /**
     * 是否开启跨域
     */
    private boolean cors = false;

    /**
     * 是否生产环境
     */
    private boolean production = false;

    /**
     * 认证
     */
    @NestedConfigurationProperty
    private NextDoc4jBasicAuth auth;

    /**
     * 扩展属性
     */
    @NestedConfigurationProperty
    private NextDoc4jExtension extension;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isCors() {
        return cors;
    }

    public void setCors(boolean cors) {
        this.cors = cors;
    }

    public boolean isProduction() {
        return production;
    }

    public void setProduction(boolean production) {
        this.production = production;
    }

    public NextDoc4jBasicAuth getAuth() {
        return auth;
    }

    public void setAuth(NextDoc4jBasicAuth auth) {
        this.auth = auth;
    }

    public NextDoc4jExtension getExtension() {
        return extension;
    }

    public void setExtension(NextDoc4jExtension extension) {
        this.extension = extension;
    }
}
