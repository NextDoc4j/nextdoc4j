package dw.nextdoc4j.core.configuration.extension;

import java.io.Serial;
import java.io.Serializable;

/**
 * 品牌化参数
 *
 * @author echo
 * @since 1.0.0
 */
public class NextDoc4jBrand implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * logo 信息 格式 classpath:logo/xxx.svg 转 base64
     */
    private String logo;

    /**
     * 标题
     * <p>为空则默认使用 springdoc -openapi 的标题信息</p>
     */
    private String title;

    /**
     * 页脚文本 - 支持 markdown 格式
     */
    private String footerText;

    public String getLogo() {
        return logo;
    }

    public void setLogo(String logo) {
        this.logo = logo;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getFooterText() {
        return footerText;
    }

    public void setFooterText(String footerText) {
        this.footerText = footerText;
    }
}
