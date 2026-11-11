package com.echotouch.transaction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MoneyTransferredEvent {
    private UUID transactionId;
    private UUID senderId;
    private UUID recipientId;
    private BigDecimal amount;
    private String status;
}
