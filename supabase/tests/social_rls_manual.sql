-- Teste transacional A/B/C para friendships e friend_blocks.
--
-- Antes de executar, substitua v_a, v_b e v_c por três UUIDs de usuários de
-- teste existentes. A e B precisam começar sem relação ou bloqueio entre si.
-- Execute o arquivo inteiro como uma role capaz de SET ROLE authenticated.
-- O rollback final garante que nenhuma alteração seja persistida.

begin;
set local role authenticated;

do $$
declare
  v_a constant uuid := '00000000-0000-0000-0000-00000000000a';
  v_b constant uuid := '00000000-0000-0000-0000-00000000000b';
  v_c constant uuid := '00000000-0000-0000-0000-00000000000c';
  v_friendship_id uuid;
  v_row_count integer;
  v_action_failed boolean;
begin
  -- A envia para B.
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select (public.send_friend_request(v_b)).id into v_friendship_id;

  -- A não envia pedido duplicado.
  v_action_failed := false;
  begin
    perform public.send_friend_request(v_b);
  exception when others then
    v_action_failed := true;
  end;
  if not v_action_failed then
    raise exception 'Falha: pedido duplicado A -> B foi aceito';
  end if;

  -- Self request falha.
  v_action_failed := false;
  begin
    perform public.send_friend_request(v_a);
  exception when others then
    v_action_failed := true;
  end;
  if not v_action_failed then
    raise exception 'Falha: self request A -> A foi aceito';
  end if;

  -- B não cria relação invertida enquanto A -> B está pendente.
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  v_action_failed := false;
  begin
    perform public.send_friend_request(v_a);
  exception when others then
    v_action_failed := true;
  end;
  if not v_action_failed then
    raise exception 'Falha: relação invertida B -> A foi aceita';
  end if;

  -- C não aceita nem remove a relação A/B.
  perform set_config('request.jwt.claim.sub', v_c::text, true);
  update public.friendships set status = 'accepted' where id = v_friendship_id;
  get diagnostics v_row_count = row_count;
  if v_row_count <> 0 then
    raise exception 'Falha RLS: C aceitou solicitação de A para B';
  end if;

  delete from public.friendships where id = v_friendship_id;
  get diagnostics v_row_count = row_count;
  if v_row_count <> 0 then
    raise exception 'Falha RLS: C removeu relação de A/B';
  end if;

  -- C não cria pedido nem bloqueio em nome de A.
  v_action_failed := false;
  begin
    insert into public.friendships (requester_id, addressee_id)
    values (v_a, v_c);
  exception when insufficient_privilege then
    v_action_failed := true;
  end;
  if not v_action_failed then
    raise exception 'Falha RLS: C criou pedido usando requester_id de A';
  end if;

  v_action_failed := false;
  begin
    insert into public.friend_blocks (blocker_id, blocked_id)
    values (v_a, v_b);
  exception when insufficient_privilege then
    v_action_failed := true;
  end;
  if not v_action_failed then
    raise exception 'Falha RLS: C bloqueou em nome de A';
  end if;

  -- B aceita; a amizade fica visível para os envolvidos.
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  update public.friendships set status = 'accepted' where id = v_friendship_id;
  get diagnostics v_row_count = row_count;
  if v_row_count <> 1 then
    raise exception 'Falha: B não aceitou a solicitação';
  end if;

  -- A remove B e envia novamente; B recusa.
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  delete from public.friendships where id = v_friendship_id;
  get diagnostics v_row_count = row_count;
  if v_row_count <> 1 then
    raise exception 'Falha: A não removeu a amizade';
  end if;

  select (public.send_friend_request(v_b)).id into v_friendship_id;
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  update public.friendships set status = 'rejected' where id = v_friendship_id;
  get diagnostics v_row_count = row_count;
  if v_row_count <> 1 then
    raise exception 'Falha: B não recusou a solicitação';
  end if;

  -- Recria uma amizade para confirmar que bloquear a invalida.
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  select (public.send_friend_request(v_b)).id into v_friendship_id;
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  update public.friendships set status = 'accepted' where id = v_friendship_id;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  insert into public.friend_blocks (blocker_id, blocked_id) values (v_a, v_b);

  select count(*) into v_row_count
  from public.friendships
  where id = v_friendship_id and status = 'rejected';
  if v_row_count <> 1 then
    raise exception 'Falha: bloqueio não invalidou a amizade';
  end if;

  -- B recebe apenas erro genérico ao tentar interagir com A bloqueador.
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  v_action_failed := false;
  begin
    perform public.send_friend_request(v_a);
  exception when others then
    v_action_failed := true;
  end;
  if not v_action_failed then
    raise exception 'Falha: B enviou pedido para quem o bloqueou';
  end if;

  -- A desbloqueia; B pode iniciar uma nova solicitação.
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  delete from public.friend_blocks where blocker_id = v_a and blocked_id = v_b;
  get diagnostics v_row_count = row_count;
  if v_row_count <> 1 then
    raise exception 'Falha: A não desbloqueou B';
  end if;

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform public.send_friend_request(v_a);
end
$$;

rollback;
