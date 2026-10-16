package top.nextdoc4j.demo.file;

import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import top.nextdoc4j.demo.core.model.base.R;

@RequiredArgsConstructor
@SpringBootApplication(scanBasePackages = "top.nextdoc4j.demo")
@RestController
public class FileServiceSb4Application {

    public static void main(String[] args) {
        SpringApplication.run(FileServiceSb4Application.class, args);
    }

    @Hidden
    @GetMapping("/")
    public R index() {
        return R.ok(null);
    }

}
