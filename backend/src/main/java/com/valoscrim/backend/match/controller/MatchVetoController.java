package com.valoscrim.backend.match.controller;

import com.valoscrim.backend.match.dto.VetoRequest;
import com.valoscrim.backend.match.service.MatchVetoService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class MatchVetoController {

    private final MatchVetoService matchVetoService;

    @MessageMapping("/matches/{matchId}/veto")
    public void handleVeto(@DestinationVariable Long matchId, @Payload VetoRequest request, Principal user) {
        matchVetoService.handleVeto(matchId, request, user.getName());
    }
}