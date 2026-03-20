package com.valoscrim.backend.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String RANK_SYNC_QUEUE = "rank-sync-queue";
    public static final String EXCHANGE = "valoscrim-exchange";
    public static final String ROUTING_KEY = "rank.sync.request";

    @Bean
    public Queue rankSyncQueue() {
        return new Queue(RANK_SYNC_QUEUE, true); // true = durable (survives restarts)
    }

    @Bean
    public DirectExchange exchange() {
        return new DirectExchange(EXCHANGE);
    }

    @Bean
    public Binding binding(Queue rankSyncQueue, DirectExchange exchange) {
        return BindingBuilder.bind(rankSyncQueue).to(exchange).with(ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}