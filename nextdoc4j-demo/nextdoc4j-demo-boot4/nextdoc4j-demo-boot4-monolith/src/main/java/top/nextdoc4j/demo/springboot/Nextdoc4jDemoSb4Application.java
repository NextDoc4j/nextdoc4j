package top.nextdoc4j.demo.springboot;

import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import top.nextdoc4j.demo.core.model.base.R;
import top.nextdoc4j.demo.springboot.configuration.properties.ProjectProperties;

@RequiredArgsConstructor
@OpenAPIDefinition
@SpringBootApplication(scanBasePackages = "top.nextdoc4j.demo")
@RestController
public class Nextdoc4jDemoSb4Application {

    private final ProjectProperties projectProperties;

    public static void main(String[] args) {
        SpringApplication.run(Nextdoc4jDemoSb4Application.class, args);
    }

    @Hidden
    @GetMapping("/")
    public R index() {
        return R.ok(projectProperties);
    }

}
