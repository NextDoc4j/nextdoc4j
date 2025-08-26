package dw.nextdoc4j.core.configuration.extension;

import java.io.Serial;
import java.io.Serializable;

/**
 * 基础认证
 *
 * @author echo
 * @since 1.0.0
 **/
public class NextDoc4jBasicAuth implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 是否启用
     */
    private boolean enabled = false;

    /**
     * 密码
     */
    private String password;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
