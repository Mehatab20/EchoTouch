package com.echotouch.payment.service;

import com.echotouch.transaction.entity.Transaction;
import java.util.Map;

public interface PaymentGateway {
    Map<String, String> processPayment(Transaction transaction);
    String getProviderName();
}
