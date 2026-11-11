package com.echotouch.transaction.entity;

import com.echotouch.common.entity.BaseEntity;
import com.echotouch.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "recipient_id", referencedColumnName = "id")
    private User recipient;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "transaction_type", nullable = false)
    private String transactionType; // CREDIT, DEBIT, TRANSFER

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, SUCCESS, FAILED

    private String reference;
    private String description;
}
