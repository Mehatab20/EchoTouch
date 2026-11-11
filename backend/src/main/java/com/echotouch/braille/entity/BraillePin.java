package com.echotouch.braille.entity;

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
@Table(name = "braille_pins")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BraillePin extends BaseEntity {

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false, unique = true)
    private User user;

    @Column(name = "pin_hash", nullable = false)
    private String pinHash;
}
