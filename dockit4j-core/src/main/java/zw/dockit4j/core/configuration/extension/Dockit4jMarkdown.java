package zw.dockit4j.core.configuration.extension;

import java.io.Serial;
import java.io.Serializable;

/**
 * markdown 属性
 *
 * @author echo
 * @since 1.0.0
 */
public class Dockit4jMarkdown implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 分组名称
     */
    private String group;

    /**
     * markdown 文件的路径或者位置
     * 支持：
     * - 单个文件：classpath:markdown/api.md
     * - 通配符：classpath:markdown/api/**
     */
    private String location;

    public String getGroup() {
        return group;
    }

    public void setGroup(String group) {
        this.group = group;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }
}
