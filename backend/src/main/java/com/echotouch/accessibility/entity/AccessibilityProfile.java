package com.echotouch.accessibility.entity;

import com.echotouch.common.entity.BaseEntity;
import com.echotouch.user.entity.User;
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
@Table(name = "accessibility_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccessibilityProfile extends BaseEntity {

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false, unique = true)
    private User user;

    @Column(name = "profile_type", nullable = false)
    @Builder.Default
    private String profileType = "SIGHTED"; // SIGHTED, BLIND, DEAF_BLIND
}
