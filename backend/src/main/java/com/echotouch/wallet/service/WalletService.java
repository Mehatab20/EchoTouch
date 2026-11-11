package com.echotouch.wallet.service;

import com.echotouch.braille.entity.BraillePin;
import com.echotouch.braille.repository.BraillePinRepository;
import com.echotouch.payment.entity.AuditLog;
import com.echotouch.payment.entity.PaymentLog;
import com.echotouch.payment.repository.AuditLogRepository;
import com.echotouch.payment.repository.PaymentLogRepository;
import com.echotouch.payment.service.PaymentGateway;
import com.echotouch.transaction.dto.MoneyTransferredEvent;
import com.echotouch.transaction.entity.Transaction;
import com.echotouch.transaction.repository.TransactionRepository;
import com.echotouch.user.entity.User;
import com.echotouch.user.repository.UserRepository;
import com.echotouch.wallet.dto.TransferRequest;
import com.echotouch.wallet.entity.Wallet;
import com.echotouch.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletService {

    private final WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final PaymentLogRepository paymentLogRepository;
    private final PaymentGateway paymentGateway;
    private final ApplicationEventPublisher eventPublisher;
    private final BraillePinRepository braillePinRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Transaction transferMoney(UUID senderId, TransferRequest request) {
        log.info("Initiating transfer of {} from user {}", request.getAmount(), senderId);

        // 1. Lock Sender Wallet, auto-create if missing for prototype testing
        Wallet senderWallet = walletRepository.findByUserIdWithPessimisticLock(senderId)
                .orElseGet(() -> {
                    Wallet newWallet = Wallet.builder()
                            .user(userRepository.findById(senderId).orElseThrow())
                            .balance(new BigDecimal("1000.00")) // Prototype bonus!
                            .build();
                    return walletRepository.save(newWallet);
                });

        User sender = senderWallet.getUser();

        // 2. Validate PIN using BraillePin entity from database
        BraillePin braillePin = braillePinRepository.findByUserId(senderId)
                .orElseThrow(() -> {
                    String detailMsg = "PIN not set up for user " + senderId;
                    log.error(detailMsg);
                    AuditLog failedAudit = AuditLog.builder()
                            .user(sender)
                            .action("WALLET_TRANSFER_FAILED_PIN")
                            .details(detailMsg)
                            .ipAddress("127.0.0.1")
                            .build();
                    auditLogRepository.save(failedAudit);
                    return new RuntimeException("Secure Braille PIN verification failed.");
                });

        if (!passwordEncoder.matches(request.getPin(), braillePin.getPinHash())) {
            String detailMsg = "Incorrect PIN entered for user " + senderId;
            log.error(detailMsg);
            AuditLog failedAudit = AuditLog.builder()
                    .user(sender)
                    .action("WALLET_TRANSFER_FAILED_PIN")
                    .details(detailMsg)
                    .ipAddress("127.0.0.1")
                    .build();
                    
            auditLogRepository.save(failedAudit);
            throw new RuntimeException("Invalid PIN");
        }

        // 3. Validate Balance
        if (senderWallet.getBalance().compareTo(request.getAmount()) < 0) {
            String detailMsg = "Insufficient balance for user " + senderId;
            log.error(detailMsg);
            AuditLog failedAudit = AuditLog.builder()
                    .user(sender)
                    .action("WALLET_TRANSFER_FAILED_BALANCE")
                    .details(detailMsg)
                    .ipAddress("127.0.0.1")
                    .build();
            auditLogRepository.save(failedAudit);
            throw new RuntimeException("Insufficient balance");
        }

        // 4. Deduct Balance (Prototype: We don't credit a recipient to simplify testing)
        senderWallet.setBalance(senderWallet.getBalance().subtract(request.getAmount()));
        walletRepository.save(senderWallet);

        // 5. Create Transaction Record
        Transaction transaction = Transaction.builder()
                .user(sender)
                .amount(request.getAmount())
                .transactionType("TRANSFER")
                .status("PENDING")
                .description(request.getDescription() != null ? request.getDescription() : "Transfer")
                .build();
        transaction = transactionRepository.save(transaction);

        // 6. Process Payment Gateway (Razorpay)
        Map<String, String> gatewayResponse = paymentGateway.processPayment(transaction);
        boolean isSuccess = "SUCCESS".equals(gatewayResponse.get("status"));

        transaction.setStatus(isSuccess ? "SUCCESS" : "FAILED");
        transaction.setReference(gatewayResponse.get("order_id"));
        transactionRepository.save(transaction);

        // 7. Create Payment Log (with signature and raw response)
        PaymentLog paymentLog = PaymentLog.builder()
                .transaction(transaction)
                .gateway(paymentGateway.getProviderName())
                .gatewayOrderId(gatewayResponse.get("order_id"))
                .gatewayPaymentId(gatewayResponse.get("payment_id"))
                .gatewaySignature(gatewayResponse.get("signature"))
                .rawResponse(gatewayResponse.get("raw_response") != null ? gatewayResponse.get("raw_response") : gatewayResponse.toString())
                .build();
        paymentLogRepository.save(paymentLog);

        // 8. Record completed attempt in audit_logs
        AuditLog successAudit = AuditLog.builder()
                .user(sender)
                .action("WALLET_TRANSFER_COMPLETED")
                .details(String.format("Transfer of %s completed with status: %s. Order ID: %s, Payment ID: %s, Signature: %s",
                        request.getAmount(), transaction.getStatus(), 
                        gatewayResponse.get("order_id"), gatewayResponse.get("payment_id"), gatewayResponse.get("signature")))
                .ipAddress("127.0.0.1")
                .build();
        auditLogRepository.save(successAudit);

        // 9. Publish Domain Event
        eventPublisher.publishEvent(MoneyTransferredEvent.builder()
                .transactionId(transaction.getId())
                .senderId(senderId)
                .amount(request.getAmount())
                .status(transaction.getStatus())
                .build());

        log.info("Transfer completed successfully. Transaction ID: {}", transaction.getId());
        return transaction;
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Transaction topUpWallet(UUID userId, TransferRequest request) {
        log.info("Initiating top up of {} for user {}", request.getAmount(), userId);

        Wallet wallet = walletRepository.findByUserIdWithPessimisticLock(userId)
                .orElseGet(() -> {
                    Wallet newWallet = Wallet.builder()
                            .user(userRepository.findById(userId).orElseThrow())
                            .balance(BigDecimal.ZERO)
                            .build();
                    return walletRepository.save(newWallet);
                });

        // Add the funds
        wallet.setBalance(wallet.getBalance().add(request.getAmount()));
        walletRepository.save(wallet);

        // Create Transaction Record
        Transaction transaction = Transaction.builder()
                .user(wallet.getUser())
                .amount(request.getAmount())
                .transactionType("TOP_UP")
                .status("SUCCESS")
                .description("Top Up Wallet")
                .build();
        return transactionRepository.save(transaction);
    }

    @Transactional(readOnly = true)
    public BigDecimal getBalance(UUID userId) {
        return walletRepository.findByUserId(userId)
                .map(Wallet::getBalance)
                .orElseThrow(() -> new RuntimeException("Wallet not found"));
    }
}

