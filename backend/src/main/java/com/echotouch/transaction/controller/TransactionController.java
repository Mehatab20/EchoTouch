package com.echotouch.transaction.controller;

import com.echotouch.security.services.UserDetailsImpl;
import com.echotouch.transaction.dto.TransactionDTO;
import com.echotouch.transaction.entity.Transaction;
import com.echotouch.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionRepository transactionRepository;

    @GetMapping
    public ResponseEntity<List<TransactionDTO>> getUserTransactions(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        List<Transaction> transactions = transactionRepository
                .findByUserIdOrderByCreatedAtDesc(userDetails.getId());

        List<TransactionDTO> dtos = transactions.stream()
                .map(tx -> TransactionDTO.builder()
                        .id(tx.getId())
                        .amount(tx.getAmount())
                        .transactionType(tx.getTransactionType())
                        .status(tx.getStatus())
                        .description(tx.getDescription())
                        .reference(tx.getReference())
                        .createdAt(tx.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }
}
