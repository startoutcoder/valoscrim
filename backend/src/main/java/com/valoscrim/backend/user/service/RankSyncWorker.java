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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class RankSyncWorker {

    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${henrik.api.key}")
    private String henrikApiKey;

    private final String henrikApiUrl = "https://api.henrikdev.xyz/valorant";

    @RabbitListener(queues = RabbitMQConfig.RANK_SYNC_QUEUE)
    @Transactional
    public void processRankSync(RankSyncMessage message) {
        User user = userRepository.findById(message.userId()).orElse(null);
        if (user == null) return;

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", henrikApiKey);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String accountUrl = henrikApiUrl + "/v1/account/" + message.riotId() + "/" + message.tagLine();
            ResponseEntity<String> accRes = restTemplate.exchange(accountUrl, HttpMethod.GET, entity, String.class);

            if (accRes.getStatusCode().is2xxSuccessful() && accRes.getBody() != null) {
                JsonNode dataNode = objectMapper.readTree(accRes.getBody()).get("data");
                user.setRiotPuuid(dataNode.get("puuid").asText());
                String region = dataNode.get("region").asText();

                String mmrUrl = henrikApiUrl + "/v1/mmr/" + region + "/" + message.riotId() + "/" + message.tagLine();
                try {
                    ResponseEntity<String> mmrRes = restTemplate.exchange(mmrUrl, HttpMethod.GET, entity, String.class);
                    JsonNode mmrData = objectMapper.readTree(mmrRes.getBody()).get("data");

                    user.setCurrentRank(mmrData.has("currenttierpatched") && !mmrData.get("currenttierpatched").isNull()
                            ? mmrData.get("currenttierpatched").asText() : "Unranked");
                    user.setMmrElo(mmrData.has("elo") && !mmrData.get("elo").isNull()
                            ? mmrData.get("elo").asInt() : 0);

                } catch (Exception e) {
                    user.setCurrentRank("Unranked");
                    user.setMmrElo(0);
                }
            }
        } catch (Exception e) {
            user.setCurrentRank("Unranked");
            user.setMmrElo(0);
        }

        userRepository.save(user);


        messagingTemplate.convertAndSend("/topic/user-" + user.getId() + "-profile", "SYNC_COMPLETE");
    }
}