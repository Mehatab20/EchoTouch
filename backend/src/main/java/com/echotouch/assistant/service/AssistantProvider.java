package com.echotouch.assistant.service;

import java.util.Map;

public interface AssistantProvider {
    Map<String, String> processIntent(String prompt);
    String getProviderName();
}
