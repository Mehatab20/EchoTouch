package com.echotouch.auth.service;

import com.echotouch.auth.dto.JwtResponse;
import com.echotouch.auth.dto.LoginRequest;
import com.echotouch.auth.dto.RegisterRequest;
import com.echotouch.auth.dto.TokenRefreshRequest;
import com.echotouch.auth.dto.TokenRefreshResponse;
import com.echotouch.auth.entity.RefreshToken;
import com.echotouch.security.jwt.JwtUtils;
import com.echotouch.security.services.UserDetailsImpl;
import com.echotouch.user.entity.User;
import com.echotouch.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final RefreshTokenService refreshTokenService;

    public JwtResponse login(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(userDetails.getId());

        return JwtResponse.builder()
                .token(jwt)
                .refreshToken(refreshToken.getToken())
                .id(userDetails.getId())
                .email(userDetails.getEmail())
                .build();
    }

    public void register(RegisterRequest registerRequest) {
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new RuntimeException("Error: Email is already in use!");
        }

        User user = User.builder()
                .email(registerRequest.getEmail())
                .password(passwordEncoder.encode(registerRequest.getPassword()))
                .firstName(registerRequest.getFirstName())
                .lastName(registerRequest.getLastName())
                .phoneNumber(registerRequest.getPhoneNumber())
                .build();

        userRepository.save(user);
    }

    public TokenRefreshResponse refreshToken(TokenRefreshRequest request) {
        String requestRefreshToken = request.getRefreshToken();

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    String token = jwtUtils.generateJwtToken(
                        new UsernamePasswordAuthenticationToken(UserDetailsImpl.build(user), null, UserDetailsImpl.build(user).getAuthorities())
                    );
                    return TokenRefreshResponse.builder()
                            .accessToken(token)
                            .refreshToken(requestRefreshToken)
                            .build();
                })
                .orElseThrow(() -> new RuntimeException(
                        "Refresh token is not in database!"));
    }
}
