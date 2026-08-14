-- DevRoyale V2.0C — matriz manual de convites.
-- Execute em ambiente local/de teste com contas reais A/B/C e rollback quando aplicável.

-- Pré-condições:
-- A e B possuem friendship accepted; C não é amigo de A.
-- A é host da sala e B ainda não é membro.

-- Como A:
-- select public.send_room_invite('<room_id>', '<user_b>');
-- Esperado: pending, expires_at aproximadamente 10 minutos após created_at.

-- Repetir como A antes de expirar:
-- select public.send_room_invite('<room_id>', '<user_b>');
-- Esperado: erro duplicate_room_invite.

-- Self invite:
-- select public.send_room_invite('<room_id>', '<user_a>');
-- Esperado: erro invite_unavailable.

-- Usuário não amigo:
-- select public.send_room_invite('<room_id>', '<user_c>');
-- Esperado: erro invite_friends_only.

-- Criar friend_blocks A -> B ou B -> A e repetir:
-- Esperado: erro social_pair_blocked.

-- Forçar expires_at no passado como postgres local e aceitar como B:
-- update public.room_invites set expires_at = now() - interval '1 second' where id = '<invite_id>';
-- select public.accept_room_invite('<invite_id>');
-- Esperado: erro invite_expired e nenhum room_member novo.

-- Sala cheia antes de B aceitar:
-- select public.accept_room_invite('<invite_id>');
-- Esperado: erro room_full e convite continua sem criar membership.

-- Fluxo feliz como B:
-- select public.accept_room_invite('<invite_id>');
-- Esperado: B entra uma única vez e convite muda para accepted na mesma transação.

