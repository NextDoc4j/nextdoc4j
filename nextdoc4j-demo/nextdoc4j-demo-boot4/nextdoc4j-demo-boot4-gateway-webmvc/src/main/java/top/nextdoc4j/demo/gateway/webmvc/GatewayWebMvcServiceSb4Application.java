package top.nextdoc4j.demo.gateway.webmvc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@EnableDiscoveryClient
@SpringBootApplication
public class GatewayWebMvcServiceSb4Application {

    public static void main(String[] args) {
        SpringApplication.run(GatewayWebMvcServiceSb4Application.class, args);
    }

}
