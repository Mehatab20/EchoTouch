package com.echotouch.payment.repository;

import com.echotouch.payment.entity.PaymentLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentLogRepository extends JpaRepository<PaymentLog, UUID> {
    Optional<PaymentLog> findByTransactionId(UUID transactionId);
}
