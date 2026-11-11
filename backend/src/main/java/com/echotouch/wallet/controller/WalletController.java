package com.echotouch.wallet.controller;

import com.echotouch.security.services.UserDetailsImpl;
import com.echotouch.transaction.entity.Transaction;
import com.echotouch.wallet.dto.TransferRequest;
import com.echotouch.wallet.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/balance")
    public ResponseEntity<Map<String, BigDecimal>> getBalance(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        BigDecimal balance = walletService.getBalance(userDetails.getId());
        Map<String, BigDecimal> response = new HashMap<>();
        response.put("balance", balance);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/transfer")
    public ResponseEntity<Transaction> transferMoney(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody TransferRequest request) {
        
        Transaction transaction = walletService.transferMoney(userDetails.getId(), request);
        return ResponseEntity.ok(transaction);
    }
    
    @PostMapping("/topup")
    public ResponseEntity<Transaction> topUpWallet(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody TransferRequest request) {
        
        Transaction transaction = walletService.topUpWallet(userDetails.getId(), request);
        return ResponseEntity.ok(transaction);
    }
}
