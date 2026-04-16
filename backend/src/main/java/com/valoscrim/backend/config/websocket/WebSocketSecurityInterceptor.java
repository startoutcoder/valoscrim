package com.valoscrim.backend.config.websocket;

import com.valoscrim.backend.config.JwtService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.util.Collections;

@Component
public class WebSocketSecurityInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final WebSocketSessionManager sessionManager;

    public WebSocketSecurityInterceptor(
            JwtService jwtService,
            @Lazy WebSocketSessionManager sessionManager) {
        this.jwtService = jwtService;
        this.sessionManager = sessionManager;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        String sessionId = accessor.getSessionId();

        if (sessionId != null && sessionManager.isExpired(sessionId)) {
            throw new AccessDeniedException("WebSocket Session Expired (JWT Timeout)");
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);

                if (jwtService.isTokenValid(token)) {
                    String username = jwtService.extractUsername(token);
                    String role = jwtService.extractClaim(token, claims -> claims.get("role", String.class));
                    if (role == null) role = "ROLE_USER";

                    if (username != null) {
                        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                                username, "", Collections.singletonList(new SimpleGrantedAuthority(role))
                        );

                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities()
                        );
                        accessor.setUser(authentication);

                        java.util.Date expiration = jwtService.extractExpiration(token);
                        sessionManager.scheduleSessionTermination(
                                sessionId,
                                expiration
                        );
                    }
                }
            }
        }
        return message;
    }
}