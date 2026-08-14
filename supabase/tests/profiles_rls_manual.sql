-- Teste manual e reversível das policies de public.profiles.
-- Substitua os UUIDs abaixo por dois usuários de teste existentes e execute o
-- bloco inteiro. O rollback final impede a persistência das alterações.
--
-- Resultado esperado:
--   update do profile B -> UPDATE 0
--   update do próprio profile A -> UPDATE 1

begin;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-00000000000a', -- UUID do usuário A
  true
);
set local role authenticated;

update public.profiles
set bio = bio
where id = '00000000-0000-0000-0000-00000000000b'; -- UUID do usuário B

update public.profiles
set bio = bio
where id = '00000000-0000-0000-0000-00000000000a'; -- UUID do usuário A

rollback;
