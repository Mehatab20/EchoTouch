package com.echotouch.transaction.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionDTO {
    private UUID id;
    private BigDecimal amount;
    
    @JsonProperty("transaction_type")
    private String transactionType;
    
    private String status;
    private String description;
    private String reference;
    
    @JsonProperty("created_at")
    private LocalDateTime createdAt;
}
