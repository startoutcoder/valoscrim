package com.valoscrim.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.valoscrim.backend.config.JwtService;
import com.valoscrim.backend.user.User;
import com.valoscrim.backend.user.UserRepository;
import com.valoscrim.backend.user.dto.UserRegistrationRequest;
import com.valoscrim.backend.auth.dto.AuthenticationRequest;
import com.valoscrim.backend.auth.dto.AuthenticationResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

@Service
@RequiredArgsConstructor
public class AuthenticationService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthenticationResponse register(UserRegistrationRequest request) {

        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalStateException("Username is already taken.");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalStateException("Email is already taken.");
        }
        if (userRepository.existsByDisplayName(request.username())) {
            throw new IllegalStateException("This username is currently being used as someone's Display Name.");
        }

        var user = User.builder()
                .username(request.username())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .displayName(request.username())
                .build();

        var savedUser = userRepository.save(user);
        var jwtToken = jwtService.generateToken(savedUser);
        var refreshToken = jwtService.generateRefreshToken(savedUser);

        saveUserRefreshToken(savedUser, refreshToken);

        return new AuthenticationResponse(jwtToken, refreshToken);
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.username(),
                        request.password()
                )
        );

        var user = userRepository.findByUsernameOrEmail(request.username(), request.username())
                .orElseThrow();

        var jwtToken = jwtService.generateToken(user);
        var refreshToken = jwtService.generateRefreshToken(user);

        saveUserRefreshToken(user, refreshToken);

        return new AuthenticationResponse(jwtToken, refreshToken);
    }

    public AuthenticationResponse refreshToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token is missing");
        }

        String refreshToken = authHeader.substring(7);
        String username = jwtService.extractUsername(refreshToken);

        if (username == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }

        User user = userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        if (!jwtService.isTokenValid(refreshToken, user) || !refreshToken.equals(user.getRefreshToken())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }

        String accessToken = jwtService.generateToken(user);
        return new AuthenticationResponse(accessToken, refreshToken);
    }

    private void saveUserRefreshToken(User user, String refreshToken) {
        user.setRefreshToken(refreshToken);
        userRepository.save(user);
    }
}