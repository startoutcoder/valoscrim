package com.valoscrim.backend.config.websocket;

import com.valoscrim.backend.match.service.MatchLobbyService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Component
@Slf4j
public class WebSocketEventListener {

    private final MatchLobbyService matchLobbyService;
    private final WebSocketSessionManager webSocketSessionManager;

    public WebSocketEventListener(MatchLobbyService matchLobbyService, @Lazy WebSocketSessionManager webSocketSessionManager) {
        this.matchLobbyService = matchLobbyService;
        this.webSocketSessionManager = webSocketSessionManager;
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        if (sessionId != null) {
            webSocketSessionManager.removeSession(sessionId);
        }

        Principal user = headerAccessor.getUser();
        if (user != null) {
            String username = user.getName();
            log.info("User Disconnected from WebSockets: {}. Cleaning up ghost sessions...", username);

            try {
                matchLobbyService.removeDisconnectedUserFromOpenLobbies(username);
            } catch (Exception e) {
                log.error("Failed to clean up lobby for disconnected user {}: {}", username, e.getMessage());
            }
        }
    }
}