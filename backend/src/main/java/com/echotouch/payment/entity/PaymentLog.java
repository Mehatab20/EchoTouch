package com.echotouch.payment.entity;

import com.echotouch.common.entity.BaseEntity;
import com.echotouch.transaction.entity.Transaction;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "payment_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentLog extends BaseEntity {

    @OneToOne
    @JoinColumn(name = "transaction_id", referencedColumnName = "id", nullable = false, unique = true)
    private Transaction transaction;

    @Column(nullable = false)
    @Builder.Default
    private String gateway = "MOCK";

    @Column(name = "gateway_order_id")
    private String gatewayOrderId;

    @Column(name = "gateway_payment_id")
    private String gatewayPaymentId;

    @Column(name = "gateway_signature")
    private String gatewaySignature;

    @Column(name = "raw_response", columnDefinition = "TEXT")
    private String rawResponse;
}
