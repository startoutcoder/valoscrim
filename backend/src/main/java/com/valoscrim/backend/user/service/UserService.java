package com.valoscrim.backend.user.service;

import com.valoscrim.backend.config.RabbitMQConfig;
import com.valoscrim.backend.team.Team;
import com.valoscrim.backend.team.TeamMember;
import com.valoscrim.backend.team.repository.TeamRepository;
import com.valoscrim.backend.user.User;
import com.valoscrim.backend.user.UserRepository;
import com.valoscrim.backend.user.dto.RankSyncMessage;
import com.valoscrim.backend.user.dto.UserProfileResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TeamRepository teamRepository;
    private final RabbitTemplate rabbitTemplate;

    public UserProfileResponse getUserProfile(String identifier) {
        User user = userRepository.findProfileByIdentifier(identifier)
                .orElseThrow(() -> new RuntimeException("User not found: " + identifier));

        return mapToProfile(user);
    }

    @Transactional
    public void deleteUserAccount(String username) {
        User user = getByUsername(username);

        List<Team> ownedTeams = teamRepository.findByOwnerId(user.getId());

        for (Team team : ownedTeams) {
            Optional<TeamMember> newOwnerOpt = team.getMembers().stream()
                    .filter(m -> !m.getUser().getId().equals(user.getId()))
                    .findFirst();

            if (newOwnerOpt.isPresent()) {
                TeamMember newOwnerMember = newOwnerOpt.get();
                team.assignOwner(newOwnerMember);
                teamRepository.save(team);
            } else {
                teamRepository.delete(team);
            }
        }

        userRepository.delete(user);
    }

    public UserProfileResponse mapToProfile(User user) {
        List<UserProfileResponse.TeamSummary> teamSummaries = user.getMemberships().stream()
                .map(member -> new UserProfileResponse.TeamSummary(
                        member.getTeam().getId(),
                        member.getTeam().getName(),
                        member.getTeam().getTag()
                ))
                .collect(Collectors.toList());

        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getEmail(),
                user.getProfilePicture(),
                user.getRiotGameName(),
                user.getRiotTagLine(),
                teamSummaries
        );
    }

    @Transactional
    public void changePassword(String username, String oldPassword, String newPassword){
        User user = getByUsername(username);

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new IllegalStateException("Old password doesn't match");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
    }

    @Transactional
    public UserProfileResponse changeDisplayName(String username, String newDisplayName) {
        if (userRepository.existsByDisplayName(newDisplayName)) {
            throw new IllegalStateException("Display Name is already taken");
        }

        User user = getByUsername(username);

        user.setDisplayName(newDisplayName);
        User savedUser = userRepository.save(user);
        return mapToProfile(savedUser);
    }

    @Transactional
    public UserProfileResponse linkRiotAccount(String username, String riotId, String tagLine) {
        User user = getByUsername(username);

        user.setRiotGameName(riotId);
        user.setRiotTagLine(tagLine);
        user.setCurrentRank("Syncing...");

        User savedUser = userRepository.save(user);

        RankSyncMessage message = new RankSyncMessage(savedUser.getId(), riotId, tagLine);
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.ROUTING_KEY, message);

        return mapToProfile(savedUser);
    }

    @Transactional
    public void updateProfilePicture(String imageUrl, String username) {
        User user = getByUsername(username);
        user.setProfilePicture(imageUrl);
        userRepository.save(user);
    }

    public User getByUsername(String username) {
        return userRepository.findByUsernameOrEmail(username, username).orElseThrow(() -> new RuntimeException("User Not found by username: " + username));
    }

    public User getByUserId(long id) {
        return userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found by id: " + id));
    }
}