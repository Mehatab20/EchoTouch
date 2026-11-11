package com.echotouch.payment.service;

import com.echotouch.transaction.entity.Transaction;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class MockGateway implements PaymentGateway {

    @Override
    public Map<String, String> processPayment(Transaction transaction) {
        Map<String, String> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("order_id", "MOCK_ORD_" + UUID.randomUUID().toString().substring(0, 8));
        response.put("payment_id", "MOCK_PAY_" + UUID.randomUUID().toString().substring(0, 8));
        return response;
    }

    @Override
    public String getProviderName() {
        return "MOCK";
    }
}
