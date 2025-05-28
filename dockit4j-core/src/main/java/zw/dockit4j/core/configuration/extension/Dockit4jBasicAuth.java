package zw.dockit4j.core.configuration.extension;

import java.io.Serial;
import java.io.Serializable;

/**
 * 基础认证
 *
 * @author echo
 * @since 1.0.0
 **/
public class Dockit4jBasicAuth implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 是否启用
     */
    private boolean enabled = false;

    /**
     * 用户名
     */
    private String username;

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

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
