package com.echotouch.assistant.service;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class MockAssistantProvider implements AssistantProvider {
    @Override
    public Map<String, String> processIntent(String prompt) {
        Map<String, String> response = new HashMap<>();
        response.put("action", "UNKNOWN");
        response.put("confidence", "0.95");
        
        if (prompt.toLowerCase().contains("send")) {
            response.put("action", "SEND_MONEY");
        } else if (prompt.toLowerCase().contains("balance")) {
            response.put("action", "CHECK_BALANCE");
        }
        
        return response;
    }

    @Override
    public String getProviderName() {
        return "MOCK_LLM";
    }
}
