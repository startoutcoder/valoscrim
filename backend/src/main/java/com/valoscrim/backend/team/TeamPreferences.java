package com.valoscrim.backend.team;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamPreferences {

    private boolean requireMic;

    private int minimumAge;

    private int competitiveness;
}