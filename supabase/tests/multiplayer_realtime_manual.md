# V2.0C — Realtime e reconexão

Use Chrome normal para A e uma janela anônima/outro navegador para B.

1. A cria a sala e B entra. Os dois devem assinar `room:<roomId>` com `private: true`.
2. Confirme, sem F5, entrada, saída, ready, settings, countdown, transferência de host e kick.
3. Em cada evento `room_changed`, confirme que a UI refaz a leitura no Postgres; o payload não é tratado como estado oficial.
4. Tente assinar o mesmo tópico como C, não membro. A autorização deve falhar.
5. Derrube a conexão WebSocket de B por menos de cinco segundos. A UI pode mostrar “Reconectando”, mas `room_members` não deve mudar.
6. Reative a rede. B deve reaparecer conectado sem novo membership.
7. Pressione F5 no lobby de A e B. A rota `/batalha/sala/:code` deve carregar a membership persistente via `get_current_room`/leitura segura.
8. Feche e reabra o navegador mantendo a sessão. A página Multiplayer deve detectar a sala atual e restaurar o lobby.
9. Abra duas abas da mesma conta. Presence pode ter duas metasockets, mas a UI deduplica por `userId` e o banco mantém um único `room_member`.
10. Envie um convite para B. O Header de B deve atualizar pelo tópico privado `user:<userId>:room-invites`; C não pode ouvir esse tópico.

