package com.valoscrim.backend.user.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.valoscrim.backend.config.RabbitMQConfig;
import com.valoscrim.backend.user.User;
import com.valoscrim.backend.user.UserRepository;
import com.valoscrim.backend.user.dto.RankSyncMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Slf4j
@Service
@RequiredArgsConstructor
public class RankSyncWorker {

    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${henrik.api.key}")
    private String henrikApiKey;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://api.henrikdev.xyz/valorant")
            .build();

    @RabbitListener(queues = RabbitMQConfig.RANK_SYNC_QUEUE)
    public void processRankSync(RankSyncMessage message) {
        User user = userRepository.findById(message.userId()).orElse(null);
        if (user == null) return;

        webClient.get()
                .uri("/v1/account/{riotId}/{tagLine}", message.riotId(), message.tagLine())
                .header("Authorization", henrikApiKey)
                .retrieve()
                .bodyToMono(String.class)
                .flatMap(accountStr -> {
                    try {
                        JsonNode accountNode = objectMapper.readTree(accountStr);
                        JsonNode dataNode = accountNode.get("data");
                        String region = dataNode.get("region").asText();
                        user.setRiotPuuid(dataNode.get("puuid").asText());

                        return webClient.get()
                                .uri("/v1/mmr/{region}/{riotId}/{tagLine}", region, message.riotId(), message.tagLine())
                                .header("Authorization", henrikApiKey)
                                .retrieve()
                                .bodyToMono(String.class);
                    } catch (Exception e) {
                        return Mono.error(e);
                    }
                })
                .subscribe(
                        mmrStr -> {
                            try {
                                JsonNode mmrNode = objectMapper.readTree(mmrStr);
                                JsonNode mmrData = mmrNode.get("data");
                                user.setCurrentRank(mmrData.has("currenttierpatched") && !mmrData.get("currenttierpatched").isNull()
                                        ? mmrData.get("currenttierpatched").asText() : "Unranked");
                                user.setMmrElo(mmrData.has("elo") && !mmrData.get("elo").isNull()
                                        ? mmrData.get("elo").asInt() : 0);

                                saveUserAndNotify(user);
                            } catch (Exception e) {
                                log.error("MMR JSON 파싱 실패: {}", e.getMessage());
                                user.setCurrentRank("Unranked");
                                user.setMmrElo(0);
                                saveUserAndNotify(user);
                            }
                        },
                        error -> {
                            log.error("Riot API Sync Failed for user {}: {}", user.getId(), error.getMessage());
                            user.setCurrentRank("Unranked");
                            user.setMmrElo(0);
                            saveUserAndNotify(user);
                        }
                );
    }

    private void saveUserAndNotify(User user) {
        userRepository.save(user);
        messagingTemplate.convertAndSend("/topic/user-" + user.getId() + "-profile", "SYNC_COMPLETE");
    }
}