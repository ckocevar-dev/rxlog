package com.rxlog.register.web;

import java.util.Map;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class BarcodeClient {

  private final RestTemplate restTemplate;

  public BarcodeClient(RestTemplateBuilder builder) {
    // Inside docker, "barcodes-go" is the hostname of the Go service
    this.restTemplate = builder.rootUri("http://barcodes-go:8082").build();
  }

  public void release(String code) {
    if (code == null || code.isBlank()) return;
    try {
      System.out.println("Releasing barcode via Go service: " + code);
      restTemplate.postForEntity("/api/barcodes/release", Map.of("code", code.trim()), Void.class);
    } catch (Exception ex) {
      ex.printStackTrace(); // we WANT to see errors for now
    }
  }
}
