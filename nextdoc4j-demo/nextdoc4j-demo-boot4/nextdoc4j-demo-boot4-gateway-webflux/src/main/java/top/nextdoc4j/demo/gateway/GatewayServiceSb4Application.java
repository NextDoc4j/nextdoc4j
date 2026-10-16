package top.nextdoc4j.demo.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@EnableDiscoveryClient
@SpringBootApplication
public class GatewayServiceSb4Application {

    public static void main(String[] args) {

        SpringApplication.run(GatewayServiceSb4Application.class, args);
    }

}
