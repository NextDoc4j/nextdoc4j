package zw.dockit4j.core.configuration;

/**
 * dockit4j 配置属性
 *
 * @author echo
 * @since 1.0.0
 **/
public class Dockit4jProperties {

    /**
     * 是否启用
     */
    private boolean enable = false;

    /**
     * 是否开启跨域
     */
    private boolean cors = false;

    /**
     * 是否生产环境
     */
    private boolean prod = false;

    public boolean isEnable() {
        return enable;
    }

    public void setEnable(boolean enable) {
        this.enable = enable;
    }

    public boolean isCors() {
        return cors;
    }

    public void setCors(boolean cors) {
        this.cors = cors;
    }

    public boolean isProd() {
        return prod;
    }

    public void setProd(boolean prod) {
        this.prod = prod;
    }
}
