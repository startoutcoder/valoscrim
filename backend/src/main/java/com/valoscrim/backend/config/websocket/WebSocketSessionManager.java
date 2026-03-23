package com.valoscrim.backend.config.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Service
@Slf4j
@RequiredArgsConstructor
public class WebSocketSessionManager {

    private final TaskScheduler taskScheduler;
    private final Map<String, ScheduledFuture<?>> expirationTasks = new ConcurrentHashMap<>();
    private final Set<String> expiredSessions = ConcurrentHashMap.newKeySet();

    public void scheduleSessionTermination(String sessionId, Date expirationDate) {
        ScheduledFuture<?> existing = expirationTasks.remove(sessionId);
        if (existing != null) existing.cancel(false);

        ScheduledFuture<?> task = taskScheduler.schedule(() -> {
            terminateSession(sessionId);
        }, expirationDate.toInstant());

        expirationTasks.put(sessionId, task);
        log.info("Scheduled JWT expiration disconnect for session [{}] at {}", sessionId, expirationDate);
    }

    private void terminateSession(String sessionId) {
        expirationTasks.remove(sessionId);
        expiredSessions.add(sessionId);
        log.warn("JWT Expired. Session [{}] flagged as expired. Next messages will be blocked.", sessionId);
    }

    public boolean isExpired(String sessionId) {
        return expiredSessions.contains(sessionId);
    }

    public void removeSession(String sessionId) {
        ScheduledFuture<?> task = expirationTasks.remove(sessionId);
        if (task != null) task.cancel(false);
        expiredSessions.remove(sessionId);
    }
}