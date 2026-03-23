# Valoscrim (발로란트 실시간 스크림 매칭 플랫폼)

> 발로란트 유저들을 위한 실시간 팀 구성 및 스크림(연습 경기) 매칭 플랫폼입니다. 
> 단순한 기능 구현을 넘어, **고동시성 환경의 트래픽 처리와 안정적인 비동기 아키텍처 설계**에 집중하여 개발했습니다.

프로젝트 링크: https://valoscrim.vercel.app/dashboard

## 프로젝트 개요
- **기간:** 2026.02 ~ 2026.03 (약 2개월)
- **인원:** 1인 개인 프로젝트 (풀스택 개발)
- **주요 목적:** 대규모 트래픽과 실시간 양방향 통신 환경에서 발생할 수 있는 데이터 정합성, 동시성 제어, 스레드 병목 현상 극복

## Tech Stack
- **Backend:** Java 17, Spring Boot 3.x, Spring WebFlux, Spring Security, Spring WebSocket, Spring Data JPA
- **Message Broker:** RabbitMQ (AMQP, STOMP)
- **Database:** PostgreSQL, Flyway
- **Frontend:** React, TypeScript, Zustand, Tailwind CSS
- **Infrastructure:** AWS EC2, Docker, Docker-Compose

---

## Architecture & ERD

**Architecture Diagram**
<img width="1294" height="583" alt="architecture diagram" src="https://github.com/user-attachments/assets/1c91c766-e821-4b09-8074-af4dc0b27507" />

**ERD**


<img width="1132" height="878" alt="ERD" src="https://github.com/user-attachments/assets/6c89c94f-ce4e-4656-bed9-6870ff17a689" />

---

## 트러블슈팅 및 핵심 아키텍처 설계

### 1. [성능 최적화] 실측 기반의 의사결정: 비정규화(Denormalization) 철회와 데이터 무결성 확보
* 잦은 매칭 검색 시 RDBMS의 JOIN과 AVG() 연산이 병목을 일으킬 것이라 판단했습니다. 이를 방지하고자 Match와 Team 엔티티에 average_mmr 필드를 비정규화하여 저장하고, 팀원 변동 시마다 백그라운드 서비스가 락(Lock)을 걸어 재계산하도록 설계했습니다.
* 비정규화로 인한 Write 복잡도와 정합성 리스크가 Read 성능 이점보다 큰지 검증하기 위해, 더미 데이터(유저 2.5만, 매치 5천 건) 적재 후 Spring StopWatch로 성능을 실측했습니다.

<img width="1007" height="168" alt="test1" src="https://github.com/user-attachments/assets/f42a6925-2ad2-46cb-aade-e426b1df0d62" />
<img width="1120" height="173" alt="test2" src="https://github.com/user-attachments/assets/921a0e7d-5170-4489-9f4d-b9c6a4ef684b" />

* 결과: 인덱스(status, match_id) 스캔 최적화를 통해 비정규화가 가져오는 성능 이득이 미미함을 데이터로 증명.
* 결론: 오버엔지니어링이었던 비정규화 로직과 동기화 트랜잭션을 전면 제거하여 데이터 무결성을 100% 확보하고 시스템 복잡도를 낮춤. 검색은 DB 인덱스에 위임하고, 단일 결과 연산은 WAS 메모리에서 처리하도록 역할을 분리해 리소스 효율 극대화.
* 향후 데이터 증가 시 `status` 컬럼 특유의 낮은 카디널리티(OPEN, COMPLETED 등)로 인해 발생할 수 있는 Full Table Scan을 선제적으로 방어하고자, Flyway를 통해 부분 인덱스(`CREATE INDEX ... WHERE status = 'OPEN'`)를 적용하여 인덱스 트리 크기를 최소화하고 메모리 히트율을 극대화했습니다.

### 2. [동시성 제어] 고빈도 충돌 환경의 비관적 락(Fail-Fast)과 사용자 경험(UX) 방어
* 최대 10명의 유저가 대기실에 입장해 거의 동시에 상태를 변경하는 고빈도 경합 환경에서, 낙관적 락의 재시도 오버헤드를 방지하고자 DB 레벨에서 요청을 직렬화하는 비관적 락(PESSIMISTIC_WRITE)을 채택했습니다. 
* 커넥션 풀 고갈을 원천 차단하기 위해 JPA QueryHint 타임아웃을 0(NOWAIT)으로 설정해 **진정한 Fail-Fast 메커니즘**을 구현했습니다. 나아가 락 획득 실패 시 발생하는 `CannotAcquireLockException`을 글로벌 예외 핸들러에서 캐치하여, 서버를 보호함과 동시에 유저에게 "다른 사용자가 상태를 변경 중입니다."라는 메시지를 반환해 UX 저하까지 방어했습니다.

### 3. [알고리즘 최적화] 고스트 세션 클린업 로직의 탐색 병목 제거 및 OOM 차단
* 유저의 웹소켓 비정상 종료 시 로비에서 퇴장시키는 로직 구현 중, 기존에는 'OPEN 상태인 모든 로비를 WAS 메모리로 가져와 순회(O(N))하며 찾는' 심각한 성능 병목 우려를 발견했습니다.
* 이를 해결하기 위해 DB 레벨에서 `JOIN`을 활용하여 '해당 유저가 속해 있는 OPEN 로비'만 단일 쿼리로 핀포인트 조회하도록 리팩토링했습니다. 결과적으로 전체 로비 개수에 비례해 증가하던 WAS 메모리 적재량과 탐색 시간을 **O(1) 수준의 쿼리 조회로 최적화**하여 고트래픽 상황에서의 서버 OOM(Out of Memory) 위험을 원천 차단했습니다.

### 4. [비동기 아키텍처] WebClient와 Manual-Ack를 통한 데이터 무손실 논블로킹 워커 구축
* 메인 WAS 스레드 보호를 위해 외부 메시지 브로커(RabbitMQ)를 도입했으나, 워커 스레드 내부에서 동기식 `RestTemplate` 사용 시 외부 Riot API 응답 대기 시간 동안 리스너 스레드 풀마저 블로킹되는 2차 병목을 발견했습니다.
* 이를 해결하고자 Spring WebFlux의 **`WebClient`를 도입해 HTTP I/O 요청을 Netty 이벤트 루프에 위임하고 스레드를 즉시 해방**하도록 구조를 개편했습니다.
* 특히, 비동기 호출로 인한 **파이어 앤 포겟(Fire-and-Forget) 메시지 유실(Data Loss)** 현상을 방지하기 위해 RabbitMQ의 기본 Auto-Ack를 비활성화하고, 비동기 체인이 끝나는 시점에 **수동 승인(Manual-Ack) 및 Nack(Requeue)** 처리를 구현하여 완벽하고 안전한 논블로킹 파이프라인을 완성했습니다.

### 5. [보안 최적화] O(1) 인메모리 JWT 블랙리스트와 분산 환경(Scale-out) 확장성 설계
* 초당 수많은 프레임이 오가는 STOMP 환경에서 인터셉터가 매번 JWT 서명을 검증하는 극심한 CPU 오버헤드를 줄이고자, WebSocket 핸드쉐이크 시점에만 만료 시간을 파싱해 `TaskScheduler`로 세션 종료를 예약하는 논블로킹 블랙리스트를 구현했습니다. 
* 단일 WAS 환경의 성능을 극대화하기 위해 `ConcurrentHashMap`을 활용해 인가(Authorization) 과정을 O(1) 탐색으로 최적화했으며, 향후 서버 Scale-out 시 Redis를 활용한 글로벌 캐시로 즉각 전환할 수 있도록 구조적 인터페이스 확장을 고려해 설계했습니다.
