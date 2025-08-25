package zw.dockit4j.core.configuration;

import org.springframework.boot.context.properties.NestedConfigurationProperty;
import zw.dockit4j.core.configuration.extension.Dockit4jBasicAuth;

import java.io.Serial;
import java.io.Serializable;

/**
 * 配置属性
 *
 * @author echo
 * @since 1.0.0
 **/
public class Dockit4jProperties implements Serializable {

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
    private Dockit4jBasicAuth auth;

    /**
     * 扩展属性
     */
    @NestedConfigurationProperty
    private Dockit4jExtension extension;

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

    public Dockit4jBasicAuth getAuth() {
        return auth;
    }

    public void setAuth(Dockit4jBasicAuth auth) {
        this.auth = auth;
    }

    public Dockit4jExtension getExtension() {
        return extension;
    }

    public void setExtension(Dockit4jExtension extension) {
        this.extension = extension;
    }
}
