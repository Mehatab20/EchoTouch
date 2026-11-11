package com.echotouch.auth.controller;

import com.echotouch.auth.dto.JwtResponse;
import com.echotouch.auth.dto.LoginRequest;
import com.echotouch.auth.dto.RegisterRequest;
import com.echotouch.auth.dto.TokenRefreshRequest;
import com.echotouch.auth.dto.TokenRefreshResponse;
import com.echotouch.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<JwtResponse> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        JwtResponse jwtResponse = authService.login(loginRequest);
        return ResponseEntity.ok(jwtResponse);
    }

    @PostMapping("/register")
    public ResponseEntity<JwtResponse> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        authService.register(registerRequest);
        JwtResponse jwtResponse = authService.login(
            new LoginRequest(registerRequest.getEmail(), registerRequest.getPassword())
        );
        return ResponseEntity.ok(jwtResponse);
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenRefreshResponse> refreshToken(@Valid @RequestBody TokenRefreshRequest request) {
        TokenRefreshResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/logout")
    public ResponseEntity<java.util.Map<String, String>> logoutUser() {
        // In a stateless JWT system, the frontend deletes the token. 
        // We just return a 200 OK so the frontend API doesn't crash.
        return ResponseEntity.ok(java.util.Map.of("message", "Logged out successfully"));
    }
}
