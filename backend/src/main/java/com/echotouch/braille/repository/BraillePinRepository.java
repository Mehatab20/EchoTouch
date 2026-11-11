package com.echotouch.braille.repository;

import com.echotouch.braille.entity.BraillePin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BraillePinRepository extends JpaRepository<BraillePin, UUID> {
    Optional<BraillePin> findByUserId(UUID userId);
}
