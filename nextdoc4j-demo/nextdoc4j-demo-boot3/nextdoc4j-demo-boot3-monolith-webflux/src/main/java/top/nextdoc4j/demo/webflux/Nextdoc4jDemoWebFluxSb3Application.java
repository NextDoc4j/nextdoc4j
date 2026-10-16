package top.nextdoc4j.demo.webflux;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;

@SpringBootApplication
@RestController
@RequestMapping("/webflux")
@Tag(name = "WebFlux 演示")
public class Nextdoc4jDemoWebFluxSb3Application {

    public static void main(String[] args) {
        SpringApplication.run(Nextdoc4jDemoWebFluxSb3Application.class, args);
    }

    @GetMapping("/hello")
    @Operation(summary = "返回单个响应式结果")
    public Mono<Map<String, String>> hello() {
        return Mono.just(Map.of("message", "NextDoc4j Spring Boot 3 WebFlux"));
    }

    @GetMapping(value = "/stream", produces = "text/event-stream")
    @Operation(summary = "返回流式响应式结果")
    public Flux<ServerSentEvent<String>> stream() {
        return Flux.interval(Duration.ofSeconds(1))
                .map(index -> ServerSentEvent.<String>builder()
                        .id(String.valueOf(index))
                        .event("my-event")
                        .data("event-" + index)
                        .retry(Duration.ofSeconds(3))
                        .build())
                .take(10);
    }


    @GetMapping(value = "/stream2", produces = "text/event-stream")
    @Operation(summary = "返回响应式事件流")
    public Flux<String> stream2() {
        return Flux.interval(Duration.ofSeconds(1)).map(index -> "event-" + index).take(10);
    }
}
