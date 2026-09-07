begin;

create type public.multiplayer_match_status as enum (
  'preparing',
  'active',
  'between_rounds',
  'finished',
  'cancelled',
  'abandoned'
);
create type public.multiplayer_player_status as enum (
  'active',
  'disconnected',
  'finished',
  'surrendered'
);
create type public.multiplayer_round_status as enum (
  'waiting',
  'active',
  'finished',
  'cancelled'
);
create type public.multiplayer_submission_mode as enum ('run', 'submit');
create type public.multiplayer_submission_status as enum (
  'queued',
  'running',
  'accepted',
  'wrong_answer',
  'compile_error',
  'runtime_error',
  'time_limit',
  'validation_error',
  'internal_error'
);
create type public.multiplayer_validation_type as enum (
  'program_output',
  'function_tests',
  'sql_result',
  'html_css_structure'
);

create table public.multiplayer_challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  language public.room_language not null,
  difficulty public.room_difficulty not null,
  title text not null,
  statement text not null,
  instructions jsonb not null default '[]'::jsonb,
  starter_code text not null default '',
  public_examples jsonb not null default '[]'::jsonb,
  validation_type public.multiplayer_validation_type not null,
  judge_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint multiplayer_challenges_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint multiplayer_challenges_instructions_array check (
    jsonb_typeof(instructions) = 'array'
  ),
  constraint multiplayer_challenges_examples_array check (
    jsonb_typeof(public_examples) = 'array'
  ),
  constraint multiplayer_challenges_config_object check (
    jsonb_typeof(judge_config) = 'object'
  )
);

create table devroyale_private.multiplayer_challenge_tests (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.multiplayer_challenges (id) on delete cascade,
  is_public boolean not null default false,
  ordinal smallint not null check (ordinal > 0),
  input jsonb not null default '{}'::jsonb,
  expected jsonb,
  validator_config jsonb not null default '{}'::jsonb,
  weight smallint not null default 1 check (weight > 0),
  created_at timestamptz not null default now(),
  unique (challenge_id, is_public, ordinal),
  constraint multiplayer_challenge_tests_input_object check (
    jsonb_typeof(input) = 'object'
  ),
  constraint multiplayer_challenge_tests_validator_object check (
    jsonb_typeof(validator_config) = 'object'
  )
);

create table public.multiplayer_matches (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.rooms (id) on delete restrict,
  status public.multiplayer_match_status not null default 'preparing',
  language public.room_language not null,
  difficulty public.room_difficulty not null,
  match_format public.match_format not null,
  current_round smallint not null default 1 check (current_round > 0),
  winner_id uuid references public.profiles (id) on delete restrict,
  started_at timestamptz not null,
  finished_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint multiplayer_matches_terminal_consistency check (
    (
      status = 'finished'
      and winner_id is not null
      and finished_at is not null
      and cancelled_at is null
    )
    or (
      status in ('cancelled', 'abandoned')
      and winner_id is null
      and finished_at is null
      and cancelled_at is not null
    )
    or (
      status in ('preparing', 'active', 'between_rounds')
      and winner_id is null
      and finished_at is null
      and cancelled_at is null
    )
  )
);

create table public.multiplayer_match_players (
  match_id uuid not null references public.multiplayer_matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  rounds_won smallint not null default 0 check (rounds_won >= 0),
  status public.multiplayer_player_status not null default 'active',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create table public.multiplayer_rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.multiplayer_matches (id) on delete cascade,
  round_number smallint not null check (round_number > 0),
  challenge_id uuid not null references public.multiplayer_challenges (id) on delete restrict,
  status public.multiplayer_round_status not null default 'waiting',
  winner_id uuid references public.profiles (id) on delete restrict,
  started_at timestamptz not null,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (match_id, round_number),
  constraint multiplayer_rounds_finish_consistency check (
    (
      status = 'finished'
      and winner_id is not null
      and finished_at is not null
    )
    or (
      status <> 'finished'
      and winner_id is null
      and finished_at is null
    )
  )
);

create table public.multiplayer_submissions (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null,
  match_id uuid not null references public.multiplayer_matches (id) on delete cascade,
  round_id uuid not null references public.multiplayer_rounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  mode public.multiplayer_submission_mode not null,
  status public.multiplayer_submission_status not null default 'queued',
  source_code text not null,
  created_at timestamptz not null default now(),
  judging_started_at timestamptz,
  judged_at timestamptz,
  execution_time numeric(10, 4),
  memory_used integer,
  public_message text,
  stdout text,
  unique (match_id, user_id, client_request_id),
  constraint multiplayer_submissions_source_size check (
    octet_length(source_code) between 1 and 20480
  ),
  constraint multiplayer_submissions_judged_consistency check (
    (
      status in ('queued', 'running')
      and judged_at is null
    )
    or (
      status not in ('queued', 'running')
      and judged_at is not null
    )
  )
);

create table devroyale_private.multiplayer_submission_jobs (
  submission_id uuid primary key references public.multiplayer_submissions (id) on delete cascade,
  provider text not null default 'pending',
  provider_token text,
  test_position smallint not null default 1 check (test_position > 0),
  attempts smallint not null default 0 check (attempts >= 0),
  locked_by uuid,
  locked_until timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

create index multiplayer_challenges_pool_idx
  on public.multiplayer_challenges (language, difficulty, is_active)
  where is_active;
create index multiplayer_matches_status_idx on public.multiplayer_matches (status);
create index multiplayer_matches_winner_idx
  on public.multiplayer_matches (winner_id) where winner_id is not null;
create index multiplayer_match_players_user_idx
  on public.multiplayer_match_players (user_id, match_id);
create index multiplayer_rounds_current_idx
  on public.multiplayer_rounds (match_id, status, round_number desc);
create index multiplayer_rounds_challenge_idx
  on public.multiplayer_rounds (challenge_id);
create index multiplayer_submissions_player_round_idx
  on public.multiplayer_submissions (round_id, user_id, created_at desc);
create index multiplayer_submissions_status_idx
  on public.multiplayer_submissions (status, created_at)
  where status in ('queued', 'running');
create index multiplayer_submission_jobs_lease_idx
  on devroyale_private.multiplayer_submission_jobs (locked_until, updated_at);

create trigger multiplayer_challenges_set_updated_at
  before update on public.multiplayer_challenges
  for each row execute procedure devroyale_private.set_room_updated_at();
create trigger multiplayer_matches_set_updated_at
  before update on public.multiplayer_matches
  for each row execute procedure devroyale_private.set_room_updated_at();
create trigger multiplayer_match_players_set_updated_at
  before update on public.multiplayer_match_players
  for each row execute procedure devroyale_private.set_room_updated_at();
create trigger multiplayer_submission_jobs_set_updated_at
  before update on devroyale_private.multiplayer_submission_jobs
  for each row execute procedure devroyale_private.set_room_updated_at();

alter table public.multiplayer_challenges enable row level security;
alter table public.multiplayer_matches enable row level security;
alter table public.multiplayer_match_players enable row level security;
alter table public.multiplayer_rounds enable row level security;
alter table public.multiplayer_submissions enable row level security;

revoke all on table public.multiplayer_challenges from anon, authenticated;
revoke all on table public.multiplayer_matches from anon, authenticated;
revoke all on table public.multiplayer_match_players from anon, authenticated;
revoke all on table public.multiplayer_rounds from anon, authenticated;
revoke all on table public.multiplayer_submissions from anon, authenticated;
revoke all on table devroyale_private.multiplayer_challenge_tests
  from public, anon, authenticated;
revoke all on table devroyale_private.multiplayer_submission_jobs
  from public, anon, authenticated;

grant select (
  id,
  slug,
  language,
  difficulty,
  title,
  statement,
  instructions,
  starter_code,
  public_examples,
  validation_type,
  is_active,
  created_at,
  updated_at
) on table public.multiplayer_challenges to authenticated;
grant select on table public.multiplayer_matches to authenticated;
grant select on table public.multiplayer_match_players to authenticated;
grant select on table public.multiplayer_rounds to authenticated;
grant select on table public.multiplayer_submissions to authenticated;

create or replace function devroyale_private.is_match_participant(
  p_match_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and exists (
    select 1
    from public.multiplayer_match_players
    where match_id = p_match_id and user_id = p_user_id
  );
$$;

create or replace function devroyale_private.can_access_match_topic(
  p_topic text,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parsed_match_id uuid;
begin
  if p_user_id is null
     or p_topic !~ '^match:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;

  parsed_match_id := substring(p_topic from 7)::uuid;
  return devroyale_private.is_match_participant(parsed_match_id, p_user_id);
end;
$$;

revoke all on function devroyale_private.is_match_participant(uuid, uuid)
  from public, anon;
revoke all on function devroyale_private.can_access_match_topic(text, uuid)
  from public, anon;
grant execute on function devroyale_private.is_match_participant(uuid, uuid)
  to authenticated;
grant execute on function devroyale_private.can_access_match_topic(text, uuid)
  to authenticated;

create policy multiplayer_challenges_read_active
  on public.multiplayer_challenges
  for select
  to authenticated
  using (is_active);

create policy multiplayer_matches_read_participant
  on public.multiplayer_matches
  for select
  to authenticated
  using (
    devroyale_private.is_match_participant(id, (select auth.uid()))
  );

create policy multiplayer_match_players_read_participant
  on public.multiplayer_match_players
  for select
  to authenticated
  using (
    devroyale_private.is_match_participant(match_id, (select auth.uid()))
  );

create policy multiplayer_rounds_read_participant
  on public.multiplayer_rounds
  for select
  to authenticated
  using (
    devroyale_private.is_match_participant(match_id, (select auth.uid()))
  );

create policy multiplayer_submissions_read_own
  on public.multiplayer_submissions
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and devroyale_private.is_match_participant(match_id, (select auth.uid()))
  );

-- CHALLENGE_SEED_GENERATED_START
insert into public.multiplayer_challenges (
  slug, language, difficulty, title, statement, instructions, starter_code,
  public_examples, validation_type, judge_config, is_active
)
select
  seed.slug,
  seed.language::public.room_language,
  seed.difficulty::public.room_difficulty,
  seed.title,
  seed.statement,
  seed.instructions,
  seed.starter_code,
  seed.public_examples,
  seed.validation_type::public.multiplayer_validation_type,
  seed.judge_config,
  seed.is_active
from jsonb_to_recordset($catalog$[{"slug":"python-never-hello","language":"python","difficulty":"never","title":"Primeira mensagem em Python","statement":"Mostre a mensagem \"Hello, World!\" no terminal.","instructions":["Use a função print.","Escreva a mensagem exatamente como aparece no desafio."],"starter_code":"# Mostre sua primeira mensagem em Python\n","public_examples":[{"input":{"stdin":""},"expected":"Hello, World!"}],"validation_type":"program_output","judge_config":{},"is_active":true},{"slug":"python-beginner-reverse","language":"python","difficulty":"never","title":"Inverter uma palavra","statement":"Crie uma função que receba uma palavra e retorne seus caracteres invertidos.","instructions":["Crie a função inverter_texto(texto).","Complete a função inverter_texto.","Retorne uma nova string com os caracteres na ordem inversa."],"starter_code":"def inverter_texto(texto):\n    # Escreva sua solução aqui\n    pass\n","public_examples":[{"input":{"args":["DevRoyale"]},"expected":"elayoRveD"}],"validation_type":"function_tests","judge_config":{"functionName":"inverter_texto"},"is_active":true},{"slug":"python-beginner-sum","language":"python","difficulty":"never","title":"Somar dois números","statement":"Complete a função para retornar a soma de dois números.","instructions":["Crie a função somar(numero_a, numero_b).","Use os parâmetros numero_a e numero_b.","Retorne o resultado da soma."],"starter_code":"def somar(numero_a, numero_b):\n    # Retorne a soma\n    pass\n","public_examples":[{"input":{"args":[2,3]},"expected":5}],"validation_type":"function_tests","judge_config":{"functionName":"somar"},"is_active":true},{"slug":"python-basic-vowels","language":"python","difficulty":"basic","title":"Contador de vogais","statement":"Conte quantas vogais existem em um texto.","instructions":["Crie a função contar_vogais(texto).","Considere as vogais a, e, i, o e u.","Ignore diferenças entre letras maiúsculas e minúsculas.","Retorne a quantidade encontrada."],"starter_code":"def contar_vogais(texto):\n    vogais = \"aeiou\"\n    # Continue aqui\n","public_examples":[{"input":{"args":["DevRoyale"]},"expected":4}],"validation_type":"function_tests","judge_config":{"functionName":"contar_vogais"},"is_active":true},{"slug":"python-intermediate-frequency","language":"python","difficulty":"intermediate","title":"Frequência de palavras","statement":"Crie um dicionário com a frequência de cada palavra de uma frase.","instructions":["Crie a função frequencia_palavras(frase).","Separe a frase em palavras.","Normalize todas para minúsculas.","Retorne um dicionário no formato palavra: quantidade."],"starter_code":"def frequencia_palavras(frase):\n    frequencias = {}\n    # Continue aqui\n    return frequencias\n","public_examples":[{"input":{"args":["Dev dev CODE"]},"expected":{"dev":2,"code":1}}],"validation_type":"function_tests","judge_config":{"functionName":"frequencia_palavras"},"is_active":true},{"slug":"javascript-never-hello","language":"javascript","difficulty":"never","title":"Primeira mensagem em JavaScript","statement":"Mostre a mensagem \"Hello, World!\" no console.","instructions":["Use console.log.","Escreva a mensagem exatamente como aparece no desafio."],"starter_code":"// Mostre sua primeira mensagem em JavaScript\n","public_examples":[{"input":{"stdin":""},"expected":"Hello, World!"}],"validation_type":"program_output","judge_config":{},"is_active":true},{"slug":"javascript-beginner-double","language":"javascript","difficulty":"never","title":"Dobrar um número","statement":"Complete a função para retornar o dobro de um número.","instructions":["Crie a função dobrar(numero).","Use o parâmetro numero.","Retorne o valor multiplicado por dois."],"starter_code":"function dobrar(numero) {\n  // Escreva sua solução aqui\n}\n","public_examples":[{"input":{"args":[4]},"expected":8}],"validation_type":"function_tests","judge_config":{"functionName":"dobrar"},"is_active":true},{"slug":"javascript-beginner-greeting","language":"javascript","difficulty":"never","title":"Saudação personalizada","statement":"Retorne uma saudação usando o nome recebido pela função.","instructions":["Crie a função saudar(nome).","Use o parâmetro nome.","Retorne o texto no formato \"Olá, nome!\"."],"starter_code":"function saudar(nome) {\n  // Retorne a saudação\n}\n","public_examples":[{"input":{"args":["Luna"]},"expected":"Olá, Luna!"}],"validation_type":"function_tests","judge_config":{"functionName":"saudar"},"is_active":true},{"slug":"javascript-basic-unique","language":"javascript","difficulty":"basic","title":"Remover valores duplicados","statement":"Crie uma função que retorne um array sem valores repetidos.","instructions":["Crie a função removerDuplicados(valores).","Receba o array pelo parâmetro valores.","Mantenha uma ocorrência de cada valor.","Retorne um novo array."],"starter_code":"function removerDuplicados(valores) {\n  // Continue aqui\n}\n","public_examples":[{"input":{"args":[[1,1,2,3,2]]},"expected":[1,2,3]}],"validation_type":"function_tests","judge_config":{"functionName":"removerDuplicados"},"is_active":true},{"slug":"javascript-intermediate-cart","language":"javascript","difficulty":"intermediate","title":"Total do carrinho","statement":"Calcule o total de um carrinho considerando preço e quantidade.","instructions":["Crie a função calcularTotal(itens).","Cada item possui as propriedades preco e quantidade.","Some preco multiplicado por quantidade para todos os itens.","Retorne o total calculado."],"starter_code":"function calcularTotal(itens) {\n  // Continue aqui\n}\n","public_examples":[{"input":{"args":[[{"preco":10,"quantidade":2},{"preco":5,"quantidade":3}]]},"expected":35}],"validation_type":"function_tests","judge_config":{"functionName":"calcularTotal"},"is_active":true},{"slug":"sql-never-hello","language":"sql","difficulty":"never","title":"Primeira consulta SQL","statement":"Retorne o texto \"Hello, World!\" usando uma consulta SQL.","instructions":["Use o comando SELECT.","Retorne somente o texto solicitado."],"starter_code":"-- Escreva sua primeira consulta SQL\n","public_examples":[{"input":{"setupSql":""},"expected":[["Hello, World!"]]}],"validation_type":"sql_result","judge_config":{},"is_active":true},{"slug":"sql-beginner-active-users","language":"sql","difficulty":"never","title":"Usuários ativos","statement":"Liste nome e email dos usuários que estão ativos.","instructions":["Consulte a tabela usuarios.","Selecione somente as colunas nome e email.","Filtre registros com ativo igual a 1."],"starter_code":"SELECT\n  -- escolha as colunas\nFROM usuarios\n-- adicione o filtro\n;\n","public_examples":[{"input":{"setupSql":"CREATE TABLE usuarios(nome TEXT, email TEXT, ativo INTEGER); INSERT INTO usuarios VALUES ('Ana','ana@dev.test',1),('Bruno','bruno@dev.test',0),('Caio','caio@dev.test',1);"},"expected":[["Ana","ana@dev.test"],["Caio","caio@dev.test"]]}],"validation_type":"sql_result","judge_config":{},"is_active":true},{"slug":"sql-beginner-products","language":"sql","difficulty":"never","title":"Produtos em ordem alfabética","statement":"Liste os nomes dos produtos em ordem alfabética.","instructions":["Consulte a tabela produtos.","Selecione a coluna nome.","Ordene o resultado de A a Z."],"starter_code":"SELECT nome\nFROM produtos\n-- ordene o resultado\n;\n","public_examples":[{"input":{"setupSql":"CREATE TABLE produtos(nome TEXT); INSERT INTO produtos VALUES ('Teclado'),('Arena'),('Mouse');"},"expected":[["Arena"],["Mouse"],["Teclado"]]}],"validation_type":"sql_result","judge_config":{},"is_active":true},{"slug":"sql-basic-category-count","language":"sql","difficulty":"basic","title":"Produtos por categoria","statement":"Conte quantos produtos existem em cada categoria.","instructions":["Consulte a tabela produtos.","Agrupe os registros pela coluna categoria.","Retorne categoria e a quantidade correspondente."],"starter_code":"SELECT\n  categoria,\n  -- conte os produtos\nFROM produtos\n-- agrupe aqui\n;\n","public_examples":[{"input":{"setupSql":"CREATE TABLE produtos(id INTEGER, categoria TEXT); INSERT INTO produtos VALUES (1,'livros'),(2,'jogos'),(3,'livros');"},"expected":[["jogos",1],["livros",2]]}],"validation_type":"sql_result","judge_config":{},"is_active":true},{"slug":"sql-intermediate-orders","language":"sql","difficulty":"intermediate","title":"Pedidos com clientes","statement":"Liste cada pedido junto ao nome do cliente responsável.","instructions":["Use as tabelas pedidos e clientes.","Relacione pedidos.cliente_id com clientes.id.","Retorne o id do pedido, o nome do cliente e o total."],"starter_code":"SELECT\n  p.id,\n  -- nome do cliente\n  p.total\nFROM pedidos AS p\n-- relacione clientes aqui\n;\n","public_examples":[{"input":{"setupSql":"CREATE TABLE clientes(id INTEGER, nome TEXT); CREATE TABLE pedidos(id INTEGER, cliente_id INTEGER, total REAL); INSERT INTO clientes VALUES (1,'Ana'),(2,'Beto'); INSERT INTO pedidos VALUES (10,1,50),(11,2,80);"},"expected":[[10,"Ana",50],[11,"Beto",80]]}],"validation_type":"sql_result","judge_config":{},"is_active":true},{"slug":"html-css-never-hello","language":"html-css","difficulty":"never","title":"Primeiro título HTML","statement":"Crie um título principal com o texto \"Hello, World!\".","instructions":["Use uma tag de título de nível 1.","Escreva o texto exatamente como solicitado."],"starter_code":"<!-- Crie seu primeiro título HTML -->\n","public_examples":[{"input":{},"expected":null}],"validation_type":"html_css_structure","judge_config":{},"is_active":true},{"slug":"html-css-beginner-button","language":"html-css","difficulty":"never","title":"Botão de batalha","statement":"Crie um botão vermelho com o texto \"Entrar na Batalha\".","instructions":["Crie um elemento button com a classe battle-button.","Adicione fundo vermelho, texto branco e espaçamento interno."],"starter_code":"<button class=\"battle-button\">Entrar na Batalha</button>\n\n<style>\n  .battle-button {\n    /* Estilize aqui */\n  }\n</style>\n","public_examples":[{"input":{},"expected":null}],"validation_type":"html_css_structure","judge_config":{},"is_active":true},{"slug":"html-css-beginner-card","language":"html-css","difficulty":"never","title":"Card de perfil","statement":"Monte um card simples com nome e nível do jogador.","instructions":["Use uma div com a classe profile-card.","Inclua um h2 com o nome e um parágrafo com o nível.","Adicione borda e cantos arredondados."],"starter_code":"<div class=\"profile-card\">\n  <!-- Conteúdo do perfil -->\n</div>\n\n<style>\n  .profile-card {\n    /* Estilize aqui */\n  }\n</style>\n","public_examples":[{"input":{},"expected":null}],"validation_type":"html_css_structure","judge_config":{},"is_active":true},{"slug":"html-css-basic-grid","language":"html-css","difficulty":"basic","title":"Grid de desafios","statement":"Organize três desafios em uma grade responsiva.","instructions":["Use display grid no container.","Crie colunas que se adaptem ao espaço disponível.","Mantenha um espaço de 16px entre os cards."],"starter_code":"<section class=\"challenge-grid\">\n  <article>Desafio 1</article>\n  <article>Desafio 2</article>\n  <article>Desafio 3</article>\n</section>\n\n<style>\n  .challenge-grid {\n    /* Crie a grade */\n  }\n</style>\n","public_examples":[{"input":{},"expected":null}],"validation_type":"html_css_structure","judge_config":{},"is_active":true},{"slug":"html-css-intermediate-form","language":"html-css","difficulty":"intermediate","title":"Formulário acessível","statement":"Crie um formulário de contato com campos corretamente identificados.","instructions":["Inclua campos para nome e email.","Associe cada label ao input correspondente.","Adicione um botão de envio.","Organize o formulário em uma coluna com espaçamento."],"starter_code":"<form class=\"contact-form\">\n  <!-- Campos do formulário -->\n</form>\n\n<style>\n  .contact-form {\n    /* Organize os campos */\n  }\n</style>\n","public_examples":[{"input":{},"expected":null}],"validation_type":"html_css_structure","judge_config":{},"is_active":true},{"slug":"battle-v1-python-never-1","language":"python","difficulty":"never","title":"Saudação personalizada","statement":"Crie uma variável com o nome Luna e mostre “Olá, Luna!”.","instructions":["Crie a variável nome.","Use print para exibir a mensagem exata."],"starter_code":"# Defina o nome e mostre a saudação\n","public_examples":[{"input":{"stdin":""},"expected":"Olá, Luna!"}],"validation_type":"program_output","judge_config":{},"is_active":true},{"slug":"battle-v1-python-never-2","language":"python","difficulty":"never","title":"Dobro de um número","statement":"Guarde o número 7 e mostre o dobro dele.","instructions":["Use uma variável numérica.","Mostre o resultado 14."],"starter_code":"# Calcule o dobro de 7\n","public_examples":[{"input":{"stdin":""},"expected":"14"}],"validation_type":"program_output","judge_config":{},"is_active":true},{"slug":"battle-v1-python-basic-1","language":"python","difficulty":"basic","title":"Somar números positivos","statement":"Crie uma função que some apenas os números positivos de uma lista.","instructions":["Crie a função somar_positivos(numeros).","Receba uma lista.","Ignore zero e números negativos.","Retorne a soma."],"starter_code":"def somar_positivos(numeros):\n    # Retorne a soma\n    pass\n","public_examples":[{"input":{"args":[[-2,0,3,5]]},"expected":8}],"validation_type":"function_tests","judge_config":{"functionName":"somar_positivos"},"is_active":true},{"slug":"battle-v1-python-basic-2","language":"python","difficulty":"basic","title":"Nomes com três letras","statement":"Retorne apenas nomes que tenham três ou mais caracteres.","instructions":["Crie a função nomes_validos(nomes).","Preserve a ordem.","Considere nomes com exatamente três letras.","Retorne uma nova lista."],"starter_code":"def nomes_validos(nomes):\n    # Filtre os nomes\n    pass\n","public_examples":[{"input":{"args":[["Al","Bia","Carlos"]]},"expected":["Bia","Carlos"]}],"validation_type":"function_tests","judge_config":{"functionName":"nomes_validos"},"is_active":true},{"slug":"battle-v1-python-intermediate-1","language":"python","difficulty":"intermediate","title":"Frequência de palavras","statement":"Conte quantas vezes cada palavra aparece em uma lista.","instructions":["Crie a função frequencias(palavras).","Use um dicionário.","Conte todas as ocorrências.","Retorne o resultado."],"starter_code":"def frequencias(palavras):\n    resultado = {}\n    # Complete o dicionário\n","public_examples":[{"input":{"args":[["a","b","a"]]},"expected":{"a":2,"b":1}}],"validation_type":"function_tests","judge_config":{"functionName":"frequencias"},"is_active":true},{"slug":"battle-v1-python-intermediate-2","language":"python","difficulty":"intermediate","title":"Média segura","statement":"Calcule a média; para uma lista vazia, retorne 0.","instructions":["Crie a função media_segura(valores).","Aceite números inteiros ou decimais.","Retorne 0 para lista vazia.","Não altere a lista."],"starter_code":"def media_segura(valores):\n    # Evite divisão por zero\n    pass\n","public_examples":[{"input":{"args":[[2,4,6]]},"expected":4}],"validation_type":"function_tests","judge_config":{"functionName":"media_segura"},"is_active":true},{"slug":"battle-v1-python-advanced-1","language":"python","difficulty":"advanced","title":"Percorrer árvore de categorias","statement":"Retorne todos os nomes de uma árvore aninhada em pré-ordem.","instructions":["Crie a função nomes_da_arvore(no).","Use recursão.","Aceite nós sem children.","Mantenha a ordem de visita."],"starter_code":"def nomes_da_arvore(no):\n    # no possui name e children\n    pass\n","public_examples":[{"input":{"args":[{"name":"A","children":[{"name":"B"},{"name":"C","children":[{"name":"D"}]}]}]},"expected":["A","B","C","D"]}],"validation_type":"function_tests","judge_config":{"functionName":"nomes_da_arvore"},"is_active":true},{"slug":"battle-v1-python-advanced-2","language":"python","difficulty":"advanced","title":"Coletar tarefas assíncronas","statement":"Execute várias coroutines em paralelo e preserve a ordem dos resultados.","instructions":["Crie a função coletar(coroutines).","Use await.","Execute as tarefas de forma concorrente.","Retorne os resultados na ordem de entrada."],"starter_code":"import asyncio\n\nasync def coletar(coroutines):\n    # Aguarde todas\n    pass\n","public_examples":[],"validation_type":"function_tests","judge_config":{"functionName":"coletar"},"is_active":false},{"slug":"battle-v1-python-advanced-3","language":"python","difficulty":"advanced","title":"Cache limitado","statement":"Crie uma função Fibonacci com cache de no máximo 128 resultados.","instructions":["Crie a função fibonacci(n).","Use recursão.","Defina os casos 0 e 1.","Limite o cache a 128."],"starter_code":"from functools import lru_cache\n\n# Implemente fibonacci\n","public_examples":[{"input":{"args":[0]},"expected":0}],"validation_type":"function_tests","judge_config":{"functionName":"fibonacci"},"is_active":true},{"slug":"battle-v1-javascript-never-1","language":"javascript","difficulty":"never","title":"Saudação no console","statement":"Crie uma constante com o nome Luna e mostre “Olá, Luna!”.","instructions":["Use const.","Mostre a mensagem exata no console."],"starter_code":"// Defina o nome e mostre a saudação\n","public_examples":[{"input":{"stdin":""},"expected":"Olá, Luna!"}],"validation_type":"program_output","judge_config":{},"is_active":true},{"slug":"battle-v1-javascript-never-2","language":"javascript","difficulty":"never","title":"Triplo do valor","statement":"Guarde o número 6 e mostre o triplo dele.","instructions":["Crie duas constantes.","Mostre o resultado 18."],"starter_code":"// Calcule o triplo de 6\n","public_examples":[{"input":{"stdin":""},"expected":"18"}],"validation_type":"program_output","judge_config":{},"is_active":true},{"slug":"battle-v1-javascript-basic-1","language":"javascript","difficulty":"basic","title":"Filtrar pares","statement":"Crie uma função que retorne apenas os números pares.","instructions":["Crie a função filtrarPares(numeros).","Use filter.","Não altere o array original.","Retorne um novo array."],"starter_code":"function filtrarPares(numeros) {\n  // Retorne os pares\n}\n","public_examples":[{"input":{"args":[[1,2,3,4]]},"expected":[2,4]}],"validation_type":"function_tests","judge_config":{"functionName":"filtrarPares"},"is_active":true},{"slug":"battle-v1-javascript-basic-2","language":"javascript","difficulty":"basic","title":"Total do carrinho","statement":"Some os preços de todos os itens de um carrinho.","instructions":["Crie a função totalCarrinho(itens).","Receba objetos com preco.","Use um acumulador inicial.","Retorne o total."],"starter_code":"function totalCarrinho(itens) {\n  // Some os preços\n}\n","public_examples":[{"input":{"args":[[{"preco":4},{"preco":6}]]},"expected":10}],"validation_type":"function_tests","judge_config":{"functionName":"totalCarrinho"},"is_active":true},{"slug":"battle-v1-javascript-intermediate-1","language":"javascript","difficulty":"intermediate","title":"Agrupar por categoria","statement":"Agrupe produtos em um objeto usando a categoria como chave.","instructions":["Crie a função agrupar(produtos).","Use reduce.","Não perca produtos repetidos.","Retorne um objeto de arrays."],"starter_code":"function agrupar(produtos) {\n  // Monte os grupos\n}\n","public_examples":[{"input":{"args":[[{"categoria":"a","id":1},{"categoria":"b","id":2},{"categoria":"a","id":3}]]},"expected":{"a":[{"categoria":"a","id":1},{"categoria":"a","id":3}],"b":[{"categoria":"b","id":2}]}}],"validation_type":"function_tests","judge_config":{"functionName":"agrupar"},"is_active":true},{"slug":"battle-v1-javascript-intermediate-2","language":"javascript","difficulty":"intermediate","title":"Buscar dados com fallback","statement":"Retorne os dados da API; se a resposta falhar, retorne um array vazio.","instructions":["Crie a função carregar(url).","Use async/await.","Trate resposta não OK.","Retorne o JSON em caso de sucesso."],"starter_code":"async function carregar(url) {\n  // Faça a requisição\n}\n","public_examples":[],"validation_type":"function_tests","judge_config":{"functionName":"carregar"},"is_active":false},{"slug":"battle-v1-javascript-advanced-1","language":"javascript","difficulty":"advanced","title":"Fila com limite de concorrência","statement":"Execute tarefas assíncronas com no máximo duas em andamento.","instructions":["Crie a função executar(tarefas).","Limite cada lote a duas tarefas.","Preserve a ordem dos lotes.","Retorne todos os resultados."],"starter_code":"async function executar(tarefas) {\n  // Limite a concorrência\n}\n","public_examples":[{"input":{"tasks":[{"value":"A","delayMs":8},{"value":"B","delayMs":3},{"value":"C","delayMs":5},{"value":"D","delayMs":2},{"value":"E","delayMs":1}]},"expected":{"results":["A","B","C","D","E"],"withinLimit":true}}],"validation_type":"function_tests","judge_config":{"functionName":"executar","harness":"javascript_concurrency_queue"},"is_active":true},{"slug":"battle-v1-javascript-advanced-2","language":"javascript","difficulty":"advanced","title":"Memoização por argumentos","statement":"Crie um wrapper que memorize resultados usando os argumentos como chave.","instructions":["Crie a função memoizar(fn).","Mantenha o cache no closure.","Aceite vários argumentos.","Não recalcule chaves conhecidas."],"starter_code":"function memoizar(fn) {\n  // Implemente o cache\n}\n","public_examples":[{"input":{"invocations":[[2,3],[2,3],[5,0],[2,3]]},"expected":{"results":[5,5,5,5],"calls":2}}],"validation_type":"function_tests","judge_config":{"functionName":"memoizar","harness":"javascript_memoization"},"is_active":true},{"slug":"battle-v1-javascript-advanced-3","language":"javascript","difficulty":"advanced","title":"Cancelar requisição lenta","statement":"Implemente uma requisição que seja cancelada após um tempo limite.","instructions":["Crie a função buscarComTimeout(url, ms).","Crie o controller.","Cancele após ms.","Sempre limpe o timer."],"starter_code":"async function buscarComTimeout(url, ms) {\n  // Use AbortController\n}\n","public_examples":[],"validation_type":"function_tests","judge_config":{"functionName":"buscarComTimeout"},"is_active":false},{"slug":"battle-v1-html-css-never-1","language":"html-css","difficulty":"never","title":"Título e descrição","statement":"Crie uma seção com título “Arena” e parágrafo “Treine seu código”.","instructions":["Use HTML semântico.","Mantenha os textos exatos."],"starter_code":"<!-- Crie a seção -->\n","public_examples":[{"input":{},"expected":null}],"validation_type":"html_css_structure","judge_config":{},"is_active":true},{"slug":"battle-v1-html-css-never-2","language":"html-css","difficulty":"never","title":"Link para estudos","statement":"Crie um link “Estudar” apontando para /estudos.","instructions":["Use a tag a.","Defina o href.","Use o texto solicitado."],"starter_code":"<!-- Crie o link -->\n","public_examples":[{"input":{},"expected":null}],"validation_type":"html_css_structure","judge_config":{},"is_active":true},{"slug":"battle-v1-html-css-basic-1","language":"html-css","difficulty":"basic","title":"Cards em linha","statement":"Organize três cards em uma linha flexível com espaço de 16px.","instructions":["Use display flex.","Use gap de 16px.","Preserve os três cards."],"starter_code":"<section class=\"cards\">\n  <article>A</article>\n  <article>B</article>\n  <article>C</article>\n</section>\n\n<style>\n  .cards {\n    /* Organize os cards */\n  }\n</style>","public_examples":[{"input":{},"expected":null}],"validation_type":"html_css_structure","judge_config":{},"is_active":true},{"slug":"battle-v1-html-css-basic-2","language":"html-css","difficulty":"basic","title":"Campo de e-mail acessível","statement":"Crie label e input de e-mail corretamente associados.","instructions":["Use type email.","Associe label e input.","Defina name."],"starter_code":"<form>\n  <!-- Adicione o campo -->\n</form>","public_examples":[{"input":{},"expected":null}],"validation_type":"html_css_structure","judge_config":{},"is_active":true},{"slug":"battle-v1-html-css-intermediate-1","language":"html-css","difficulty":"intermediate","title":"Grade automática","statement":"Crie uma grade de cards com colunas mínimas de 220px e responsivas.","instructions":["Use CSS Grid.","Mínimo de 220px.","Use gap de 16px."],"starter_code":"<section class=\"grid\">\n  <article>A</article><article>B</article><article>C</article>\n</section>\n<style>\n.grid { /* Implemente */ }\n</style>","public_examples":[{"input":{},"expected":null}],"validation_type":"html_css_structure","judge_config":{},"is_active":true},{"slug":"battle-v1-html-css-intermediate-2","language":"html-css","difficulty":"intermediate","title":"Modal semântico","statement":"Crie um dialog aberto com título associado por aria-labelledby.","instructions":["Use dialog.","Associe o título.","Mantenha o texto."],"starter_code":"<!-- Crie o modal -->\n","public_examples":[{"input":{},"expected":null}],"validation_type":"html_css_structure","judge_config":{},"is_active":true},{"slug":"battle-v1-html-css-advanced-1","language":"html-css","difficulty":"advanced","title":"Camadas de estilo","statement":"Organize reset e componentes com @layer e estilize um botão.","instructions":["Declare a ordem das camadas.","Inclua reset e components.","Estilize o botão na camada correta."],"starter_code":"<button class=\"button\">Entrar</button>\n<style>\n  /* Organize as camadas */\n</style>","public_examples":[{"input":{},"expected":null}],"validation_type":"html_css_structure","judge_config":{},"is_active":true},{"slug":"battle-v1-html-css-advanced-2","language":"html-css","difficulty":"advanced","title":"Card com container query","statement":"Mude o card para duas colunas quando seu container alcançar 500px.","instructions":["Defina o container.","Use limite de 500px.","Crie duas colunas."],"starter_code":"<section class=\"wrapper\"><article class=\"card\">Conteúdo</article></section>\n<style>\n  /* Implemente a consulta */\n</style>","public_examples":[{"input":{},"expected":null}],"validation_type":"html_css_structure","judge_config":{},"is_active":true},{"slug":"battle-v1-html-css-advanced-3","language":"html-css","difficulty":"advanced","title":"Movimento respeitoso","statement":"Crie uma animação e desative-a para quem prefere movimento reduzido.","instructions":["Defina keyframes.","Aplique a animação.","Respeite movimento reduzido."],"starter_code":"<div class=\"pulse\">XP</div>\n<style>\n  /* Anime com segurança */\n</style>","public_examples":[{"input":{},"expected":null}],"validation_type":"html_css_structure","judge_config":{},"is_active":true},{"slug":"battle-v1-sql-never-1","language":"sql","difficulty":"never","title":"Listar jogadores","statement":"Selecione as colunas name e level da tabela players.","instructions":["Selecione somente name e level.","Use a tabela players."],"starter_code":"-- Escreva a consulta\n","public_examples":[{"input":{"setupSql":"CREATE TABLE players(name TEXT, level INTEGER); INSERT INTO players VALUES ('Luna',3),('Kai',7);"},"expected":[["Kai",7],["Luna",3]]}],"validation_type":"sql_result","judge_config":{},"is_active":true},{"slug":"battle-v1-sql-never-2","language":"sql","difficulty":"never","title":"Jogadores ativos","statement":"Selecione todos os jogadores cujo campo active seja verdadeiro.","instructions":["Selecione todas as colunas.","Filtre active igual a TRUE."],"starter_code":"-- Filtre jogadores ativos\n","public_examples":[{"input":{"setupSql":"CREATE TABLE players(id INTEGER, name TEXT, level INTEGER, active BOOLEAN); INSERT INTO players VALUES (1,'Luna',3,TRUE),(2,'Kai',7,FALSE);"},"expected":[[1,"Luna",3,1]]}],"validation_type":"sql_result","judge_config":{},"is_active":true},{"slug":"battle-v1-sql-basic-1","language":"sql","difficulty":"basic","title":"Total por categoria","statement":"Conte produtos por categoria e ordene da maior contagem para a menor.","instructions":["Use COUNT(*).","Agrupe por category.","Ordene pelo alias total."],"starter_code":"-- Agrupe os produtos\n","public_examples":[{"input":{"setupSql":"CREATE TABLE products(id INTEGER, category TEXT); INSERT INTO products VALUES (1,'games'),(2,'books'),(3,'games');"},"expected":[["games",2],["books",1]]}],"validation_type":"sql_result","judge_config":{},"is_active":true},{"slug":"battle-v1-sql-basic-2","language":"sql","difficulty":"basic","title":"Pedidos com clientes","statement":"Liste order id e customer name relacionando orders e customers.","instructions":["Use JOIN.","Relacione os IDs.","Selecione apenas as colunas pedidas."],"starter_code":"-- Relacione as tabelas\n","public_examples":[{"input":{"setupSql":"CREATE TABLE customers(id INTEGER, name TEXT); CREATE TABLE orders(id INTEGER, customer_id INTEGER); INSERT INTO customers VALUES (1,'Ana'),(2,'Beto'); INSERT INTO orders VALUES (8,2),(7,1);"},"expected":[[7,"Ana"],[8,"Beto"]]}],"validation_type":"sql_result","judge_config":{},"is_active":true},{"slug":"battle-v1-sql-intermediate-1","language":"sql","difficulty":"intermediate","title":"Ranking por equipe","statement":"Numere jogadores por score dentro de cada equipe.","instructions":["Use RANK.","Particione por team_id.","Ordene score de forma decrescente."],"starter_code":"-- Use uma função de janela\n","public_examples":[{"input":{"setupSql":"CREATE TABLE players(name TEXT, team_id INTEGER, score INTEGER); INSERT INTO players VALUES ('A',1,20),('B',1,10),('C',2,30),('D',2,30);"},"expected":[["A",1,1],["B",1,2],["C",2,1],["D",2,1]]}],"validation_type":"sql_result","judge_config":{},"is_active":true},{"slug":"battle-v1-sql-intermediate-2","language":"sql","difficulty":"intermediate","title":"Totais com CTE","statement":"Crie uma CTE com o total de cada pedido e retorne apenas totais acima de 100.","instructions":["Use WITH.","Agrupe por order_id.","Filtre total acima de 100."],"starter_code":"-- Estruture a consulta em etapas\n","public_examples":[{"input":{"setupSql":"CREATE TABLE order_items(order_id INTEGER, price REAL, quantity INTEGER); INSERT INTO order_items VALUES (1,50,3),(2,20,2),(3,60,2);"},"expected":[[1,150],[3,120]]}],"validation_type":"sql_result","judge_config":{},"is_active":true},{"slug":"battle-v1-sql-advanced-1","language":"sql","difficulty":"advanced","title":"Hierarquia recursiva","statement":"Liste uma categoria e todas as suas descendentes a partir do id 1.","instructions":["Use WITH RECURSIVE.","Defina caso inicial e recursivo.","Retorne a árvore."],"starter_code":"-- Use uma CTE recursiva\n","public_examples":[{"input":{"setupSql":"CREATE TABLE categories(id INTEGER, parent_id INTEGER, name TEXT); INSERT INTO categories VALUES (1,NULL,'root'),(2,1,'front'),(3,1,'back'),(4,2,'css'),(9,NULL,'outside');"},"expected":[[1,null,"root"],[2,1,"front"],[3,1,"back"],[4,2,"css"]]}],"validation_type":"sql_result","judge_config":{},"is_active":true},{"slug":"battle-v1-sql-advanced-2","language":"sql","difficulty":"advanced","title":"Mediana de pontuações","statement":"Calcule a mediana dos scores usando PostgreSQL.","instructions":["Use PERCENTILE_CONT.","Ordene por score.","Defina o alias median."],"starter_code":"-- Calcule o percentil contínuo\n","public_examples":[],"validation_type":"sql_result","judge_config":{},"is_active":false},{"slug":"battle-v1-sql-advanced-3","language":"sql","difficulty":"advanced","title":"Upsert de preferências","statement":"Insira o tema dark para o jogador 1 ou atualize o registro existente.","instructions":["Insira player_id e theme.","Use player_id como conflito.","Atualize pelo valor EXCLUDED."],"starter_code":"-- Faça um upsert\n","public_examples":[{"input":{"setupSql":"CREATE TABLE preferences(player_id INTEGER PRIMARY KEY, theme TEXT); INSERT INTO preferences VALUES (1,'light');","verificationSql":"SELECT player_id, theme FROM preferences WHERE player_id = 1;"},"expected":[[1,"dark"]]}],"validation_type":"sql_result","judge_config":{},"is_active":true}]$catalog$::jsonb) as seed(
  slug text,
  language text,
  difficulty text,
  title text,
  statement text,
  instructions jsonb,
  starter_code text,
  public_examples jsonb,
  validation_type text,
  judge_config jsonb,
  is_active boolean
);

insert into devroyale_private.multiplayer_challenge_tests (
  challenge_id, is_public, ordinal, input, expected, validator_config, weight
)
select
  challenges.id,
  seed.is_public,
  seed.ordinal,
  seed.input,
  seed.expected,
  seed.validator_config,
  seed.weight
from jsonb_to_recordset($tests$[{"slug":"python-never-hello","is_public":true,"ordinal":1,"input":{"stdin":""},"expected":"Hello, World!","validator_config":{},"weight":1},{"slug":"python-never-hello","is_public":false,"ordinal":1,"input":{"stdin":""},"expected":"Hello, World!","validator_config":{},"weight":1},{"slug":"python-beginner-reverse","is_public":true,"ordinal":1,"input":{"args":["DevRoyale"]},"expected":"elayoRveD","validator_config":{},"weight":1},{"slug":"python-beginner-reverse","is_public":false,"ordinal":1,"input":{"args":[""]},"expected":"","validator_config":{},"weight":1},{"slug":"python-beginner-reverse","is_public":false,"ordinal":2,"input":{"args":["ação"]},"expected":"oãça","validator_config":{},"weight":1},{"slug":"python-beginner-sum","is_public":true,"ordinal":1,"input":{"args":[2,3]},"expected":5,"validator_config":{},"weight":1},{"slug":"python-beginner-sum","is_public":false,"ordinal":1,"input":{"args":[-4,10]},"expected":6,"validator_config":{},"weight":1},{"slug":"python-beginner-sum","is_public":false,"ordinal":2,"input":{"args":[1.5,2.25]},"expected":3.75,"validator_config":{},"weight":1},{"slug":"python-basic-vowels","is_public":true,"ordinal":1,"input":{"args":["DevRoyale"]},"expected":4,"validator_config":{},"weight":1},{"slug":"python-basic-vowels","is_public":false,"ordinal":1,"input":{"args":["BCDF"]},"expected":0,"validator_config":{},"weight":1},{"slug":"python-basic-vowels","is_public":false,"ordinal":2,"input":{"args":["AEIOU"]},"expected":5,"validator_config":{},"weight":1},{"slug":"python-intermediate-frequency","is_public":true,"ordinal":1,"input":{"args":["Dev dev CODE"]},"expected":{"dev":2,"code":1},"validator_config":{},"weight":1},{"slug":"python-intermediate-frequency","is_public":false,"ordinal":1,"input":{"args":[""]},"expected":{},"validator_config":{},"weight":1},{"slug":"python-intermediate-frequency","is_public":false,"ordinal":2,"input":{"args":["um dois um"]},"expected":{"um":2,"dois":1},"validator_config":{},"weight":1},{"slug":"javascript-never-hello","is_public":true,"ordinal":1,"input":{"stdin":""},"expected":"Hello, World!","validator_config":{},"weight":1},{"slug":"javascript-never-hello","is_public":false,"ordinal":1,"input":{"stdin":""},"expected":"Hello, World!","validator_config":{},"weight":1},{"slug":"javascript-beginner-double","is_public":true,"ordinal":1,"input":{"args":[4]},"expected":8,"validator_config":{},"weight":1},{"slug":"javascript-beginner-double","is_public":false,"ordinal":1,"input":{"args":[-3]},"expected":-6,"validator_config":{},"weight":1},{"slug":"javascript-beginner-double","is_public":false,"ordinal":2,"input":{"args":[1.5]},"expected":3,"validator_config":{},"weight":1},{"slug":"javascript-beginner-greeting","is_public":true,"ordinal":1,"input":{"args":["Luna"]},"expected":"Olá, Luna!","validator_config":{},"weight":1},{"slug":"javascript-beginner-greeting","is_public":false,"ordinal":1,"input":{"args":["Dev"]},"expected":"Olá, Dev!","validator_config":{},"weight":1},{"slug":"javascript-basic-unique","is_public":true,"ordinal":1,"input":{"args":[[1,1,2,3,2]]},"expected":[1,2,3],"validator_config":{},"weight":1},{"slug":"javascript-basic-unique","is_public":false,"ordinal":1,"input":{"args":[["a","a","b"]]},"expected":["a","b"],"validator_config":{},"weight":1},{"slug":"javascript-basic-unique","is_public":false,"ordinal":2,"input":{"args":[[]]},"expected":[],"validator_config":{},"weight":1},{"slug":"javascript-intermediate-cart","is_public":true,"ordinal":1,"input":{"args":[[{"preco":10,"quantidade":2},{"preco":5,"quantidade":3}]]},"expected":35,"validator_config":{},"weight":1},{"slug":"javascript-intermediate-cart","is_public":false,"ordinal":1,"input":{"args":[[]]},"expected":0,"validator_config":{},"weight":1},{"slug":"javascript-intermediate-cart","is_public":false,"ordinal":2,"input":{"args":[[{"preco":2.5,"quantidade":4}]]},"expected":10,"validator_config":{},"weight":1},{"slug":"sql-never-hello","is_public":true,"ordinal":1,"input":{"setupSql":""},"expected":[["Hello, World!"]],"validator_config":{"sortRows":false},"weight":1},{"slug":"sql-never-hello","is_public":false,"ordinal":1,"input":{"setupSql":""},"expected":[["Hello, World!"]],"validator_config":{"sortRows":false},"weight":1},{"slug":"sql-beginner-active-users","is_public":true,"ordinal":1,"input":{"setupSql":"CREATE TABLE usuarios(nome TEXT, email TEXT, ativo INTEGER); INSERT INTO usuarios VALUES ('Ana','ana@dev.test',1),('Bruno','bruno@dev.test',0),('Caio','caio@dev.test',1);"},"expected":[["Ana","ana@dev.test"],["Caio","caio@dev.test"]],"validator_config":{"sortRows":true},"weight":1},{"slug":"sql-beginner-active-users","is_public":false,"ordinal":1,"input":{"setupSql":"CREATE TABLE usuarios(nome TEXT, email TEXT, ativo INTEGER); INSERT INTO usuarios VALUES ('Duda','duda@dev.test',0),('Eva','eva@dev.test',1),('Fábio','fabio@dev.test',1);"},"expected":[["Eva","eva@dev.test"],["Fábio","fabio@dev.test"]],"validator_config":{"sortRows":true},"weight":1},{"slug":"sql-beginner-products","is_public":true,"ordinal":1,"input":{"setupSql":"CREATE TABLE produtos(nome TEXT); INSERT INTO produtos VALUES ('Teclado'),('Arena'),('Mouse');"},"expected":[["Arena"],["Mouse"],["Teclado"]],"validator_config":{"sortRows":false},"weight":1},{"slug":"sql-beginner-products","is_public":false,"ordinal":1,"input":{"setupSql":"CREATE TABLE produtos(nome TEXT); INSERT INTO produtos VALUES ('Zíper'),('Cabo'),('Adaptador');"},"expected":[["Adaptador"],["Cabo"],["Zíper"]],"validator_config":{"sortRows":false},"weight":1},{"slug":"sql-basic-category-count","is_public":true,"ordinal":1,"input":{"setupSql":"CREATE TABLE produtos(id INTEGER, categoria TEXT); INSERT INTO produtos VALUES (1,'livros'),(2,'jogos'),(3,'livros');"},"expected":[["jogos",1],["livros",2]],"validator_config":{"sortRows":true},"weight":1},{"slug":"sql-basic-category-count","is_public":false,"ordinal":1,"input":{"setupSql":"CREATE TABLE produtos(id INTEGER, categoria TEXT); INSERT INTO produtos VALUES (1,'hardware'),(2,'software'),(3,'hardware'),(4,'hardware'),(5,'livros');"},"expected":[["hardware",3],["livros",1],["software",1]],"validator_config":{"sortRows":true},"weight":1},{"slug":"sql-intermediate-orders","is_public":true,"ordinal":1,"input":{"setupSql":"CREATE TABLE clientes(id INTEGER, nome TEXT); CREATE TABLE pedidos(id INTEGER, cliente_id INTEGER, total REAL); INSERT INTO clientes VALUES (1,'Ana'),(2,'Beto'); INSERT INTO pedidos VALUES (10,1,50),(11,2,80);"},"expected":[[10,"Ana",50],[11,"Beto",80]],"validator_config":{"sortRows":true},"weight":1},{"slug":"sql-intermediate-orders","is_public":false,"ordinal":1,"input":{"setupSql":"CREATE TABLE clientes(id INTEGER, nome TEXT); CREATE TABLE pedidos(id INTEGER, cliente_id INTEGER, total REAL); INSERT INTO clientes VALUES (3,'Clara'),(4,'Diego'); INSERT INTO pedidos VALUES (21,4,125.5),(20,3,30);"},"expected":[[20,"Clara",30],[21,"Diego",125.5]],"validator_config":{"sortRows":true},"weight":1},{"slug":"html-css-never-hello","is_public":true,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<h1[^>]*>\\s*hello,\\s*world!\\s*</h1>"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"html-css-never-hello","is_public":false,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<h1[^>]*>\\s*hello,\\s*world!\\s*</h1>"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"html-css-beginner-button","is_public":true,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<button[^>]*class=[\"\\x27][^\"\\x27]*battle-button"]},{"description":"estrutura obrigatória","anyOf":["entrar na batalha"]},{"description":"estrutura obrigatória","anyOf":["\\.battle-button\\s*\\{[^}]*background(?:-color)?\\s*:"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"html-css-beginner-button","is_public":false,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<button[^>]*class=[\"\\x27][^\"\\x27]*battle-button"]},{"description":"estrutura obrigatória","anyOf":["entrar na batalha"]},{"description":"estrutura obrigatória","anyOf":["\\.battle-button\\s*\\{[^}]*background(?:-color)?\\s*:"]},{"description":"estrutura obrigatória","anyOf":["\\.battle-button\\s*\\{[^}]*color\\s*:\\s*(?:white|#fff(?:fff)?)"]},{"description":"estrutura obrigatória","anyOf":["\\.battle-button\\s*\\{[^}]*padding\\s*:"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"html-css-beginner-card","is_public":true,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<div[^>]*class=[\"\\x27][^\"\\x27]*profile-card"]},{"description":"estrutura obrigatória","anyOf":["<h2[^>]*>\\s*dev guerreiro"]},{"description":"estrutura obrigatória","anyOf":["<p[^>]*>\\s*nível 1"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"html-css-beginner-card","is_public":false,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<div[^>]*class=[\"\\x27][^\"\\x27]*profile-card"]},{"description":"estrutura obrigatória","anyOf":["<h2[^>]*>\\s*dev guerreiro"]},{"description":"estrutura obrigatória","anyOf":["<p[^>]*>\\s*nível 1"]},{"description":"estrutura obrigatória","anyOf":["\\.profile-card\\s*\\{[^}]*border\\s*:"]},{"description":"estrutura obrigatória","anyOf":["\\.profile-card\\s*\\{[^}]*border-radius\\s*:"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"html-css-basic-grid","is_public":true,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<section[^>]*class=[\"\\x27][^\"\\x27]*challenge-grid"]},{"description":"estrutura obrigatória","anyOf":["(?:<article[^>]*>[^<]*</article>.*){3}"]},{"description":"estrutura obrigatória","anyOf":["\\.challenge-grid\\s*\\{[^}]*display\\s*:\\s*grid"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"html-css-basic-grid","is_public":false,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<section[^>]*class=[\"\\x27][^\"\\x27]*challenge-grid"]},{"description":"estrutura obrigatória","anyOf":["(?:<article[^>]*>[^<]*</article>.*){3}"]},{"description":"estrutura obrigatória","anyOf":["\\.challenge-grid\\s*\\{[^}]*display\\s*:\\s*grid"]},{"description":"estrutura obrigatória","anyOf":["grid-template-columns\\s*:\\s*repeat\\(auto-fit,\\s*minmax\\(180px,\\s*1fr\\)\\)"]},{"description":"estrutura obrigatória","anyOf":["gap\\s*:\\s*16px"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"html-css-intermediate-form","is_public":true,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<form[^>]*class=[\"\\x27][^\"\\x27]*contact-form"]},{"description":"estrutura obrigatória","anyOf":["<label[^>]*for=[\"\\x27]name[\"\\x27]"]},{"description":"estrutura obrigatória","anyOf":["<input[^>]*id=[\"\\x27]name[\"\\x27][^>]*type=[\"\\x27]text[\"\\x27]"]},{"description":"estrutura obrigatória","anyOf":["<label[^>]*for=[\"\\x27]email[\"\\x27]"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"html-css-intermediate-form","is_public":false,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<form[^>]*class=[\"\\x27][^\"\\x27]*contact-form"]},{"description":"estrutura obrigatória","anyOf":["<label[^>]*for=[\"\\x27]name[\"\\x27]"]},{"description":"estrutura obrigatória","anyOf":["<input[^>]*id=[\"\\x27]name[\"\\x27][^>]*type=[\"\\x27]text[\"\\x27]"]},{"description":"estrutura obrigatória","anyOf":["<label[^>]*for=[\"\\x27]email[\"\\x27]"]},{"description":"estrutura obrigatória","anyOf":["<input[^>]*id=[\"\\x27]email[\"\\x27][^>]*type=[\"\\x27]email[\"\\x27]"]},{"description":"estrutura obrigatória","anyOf":["<button[^>]*type=[\"\\x27]submit[\"\\x27]"]},{"description":"estrutura obrigatória","anyOf":["\\.contact-form\\s*\\{[^}]*display\\s*:\\s*flex"]},{"description":"estrutura obrigatória","anyOf":["flex-direction\\s*:\\s*column"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-python-never-1","is_public":true,"ordinal":1,"input":{"stdin":""},"expected":"Olá, Luna!","validator_config":{},"weight":1},{"slug":"battle-v1-python-never-1","is_public":false,"ordinal":1,"input":{"stdin":""},"expected":"Olá, Luna!","validator_config":{},"weight":1},{"slug":"battle-v1-python-never-2","is_public":true,"ordinal":1,"input":{"stdin":""},"expected":"14","validator_config":{},"weight":1},{"slug":"battle-v1-python-never-2","is_public":false,"ordinal":1,"input":{"stdin":""},"expected":"14","validator_config":{},"weight":1},{"slug":"battle-v1-python-basic-1","is_public":true,"ordinal":1,"input":{"args":[[-2,0,3,5]]},"expected":8,"validator_config":{},"weight":1},{"slug":"battle-v1-python-basic-1","is_public":false,"ordinal":1,"input":{"args":[[]]},"expected":0,"validator_config":{},"weight":1},{"slug":"battle-v1-python-basic-1","is_public":false,"ordinal":2,"input":{"args":[[-9,-1]]},"expected":0,"validator_config":{},"weight":1},{"slug":"battle-v1-python-basic-2","is_public":true,"ordinal":1,"input":{"args":[["Al","Bia","Carlos"]]},"expected":["Bia","Carlos"],"validator_config":{},"weight":1},{"slug":"battle-v1-python-basic-2","is_public":false,"ordinal":1,"input":{"args":[["Ana","Lu","Ivo"]]},"expected":["Ana","Ivo"],"validator_config":{},"weight":1},{"slug":"battle-v1-python-basic-2","is_public":false,"ordinal":2,"input":{"args":[[]]},"expected":[],"validator_config":{},"weight":1},{"slug":"battle-v1-python-intermediate-1","is_public":true,"ordinal":1,"input":{"args":[["a","b","a"]]},"expected":{"a":2,"b":1},"validator_config":{},"weight":1},{"slug":"battle-v1-python-intermediate-1","is_public":false,"ordinal":1,"input":{"args":[[]]},"expected":{},"validator_config":{},"weight":1},{"slug":"battle-v1-python-intermediate-1","is_public":false,"ordinal":2,"input":{"args":[["x","x","x"]]},"expected":{"x":3},"validator_config":{},"weight":1},{"slug":"battle-v1-python-intermediate-2","is_public":true,"ordinal":1,"input":{"args":[[2,4,6]]},"expected":4,"validator_config":{},"weight":1},{"slug":"battle-v1-python-intermediate-2","is_public":false,"ordinal":1,"input":{"args":[[]]},"expected":0,"validator_config":{},"weight":1},{"slug":"battle-v1-python-intermediate-2","is_public":false,"ordinal":2,"input":{"args":[[1.5,2.5]]},"expected":2,"validator_config":{},"weight":1},{"slug":"battle-v1-python-advanced-1","is_public":true,"ordinal":1,"input":{"args":[{"name":"A","children":[{"name":"B"},{"name":"C","children":[{"name":"D"}]}]}]},"expected":["A","B","C","D"],"validator_config":{},"weight":1},{"slug":"battle-v1-python-advanced-1","is_public":false,"ordinal":1,"input":{"args":[{"name":"Raiz"}]},"expected":["Raiz"],"validator_config":{},"weight":1},{"slug":"battle-v1-python-advanced-3","is_public":true,"ordinal":1,"input":{"args":[0]},"expected":0,"validator_config":{},"weight":1},{"slug":"battle-v1-python-advanced-3","is_public":false,"ordinal":1,"input":{"args":[1]},"expected":1,"validator_config":{},"weight":1},{"slug":"battle-v1-python-advanced-3","is_public":false,"ordinal":2,"input":{"args":[10]},"expected":55,"validator_config":{},"weight":1},{"slug":"battle-v1-javascript-never-1","is_public":true,"ordinal":1,"input":{"stdin":""},"expected":"Olá, Luna!","validator_config":{},"weight":1},{"slug":"battle-v1-javascript-never-1","is_public":false,"ordinal":1,"input":{"stdin":""},"expected":"Olá, Luna!","validator_config":{},"weight":1},{"slug":"battle-v1-javascript-never-2","is_public":true,"ordinal":1,"input":{"stdin":""},"expected":"18","validator_config":{},"weight":1},{"slug":"battle-v1-javascript-never-2","is_public":false,"ordinal":1,"input":{"stdin":""},"expected":"18","validator_config":{},"weight":1},{"slug":"battle-v1-javascript-basic-1","is_public":true,"ordinal":1,"input":{"args":[[1,2,3,4]]},"expected":[2,4],"validator_config":{},"weight":1},{"slug":"battle-v1-javascript-basic-1","is_public":false,"ordinal":1,"input":{"args":[[-2,-1,0]]},"expected":[-2,0],"validator_config":{},"weight":1},{"slug":"battle-v1-javascript-basic-1","is_public":false,"ordinal":2,"input":{"args":[[]]},"expected":[],"validator_config":{},"weight":1},{"slug":"battle-v1-javascript-basic-2","is_public":true,"ordinal":1,"input":{"args":[[{"preco":4},{"preco":6}]]},"expected":10,"validator_config":{},"weight":1},{"slug":"battle-v1-javascript-basic-2","is_public":false,"ordinal":1,"input":{"args":[[]]},"expected":0,"validator_config":{},"weight":1},{"slug":"battle-v1-javascript-basic-2","is_public":false,"ordinal":2,"input":{"args":[[{"preco":1.5},{"preco":2.5}]]},"expected":4,"validator_config":{},"weight":1},{"slug":"battle-v1-javascript-intermediate-1","is_public":true,"ordinal":1,"input":{"args":[[{"categoria":"a","id":1},{"categoria":"b","id":2},{"categoria":"a","id":3}]]},"expected":{"a":[{"categoria":"a","id":1},{"categoria":"a","id":3}],"b":[{"categoria":"b","id":2}]},"validator_config":{},"weight":1},{"slug":"battle-v1-javascript-intermediate-1","is_public":false,"ordinal":1,"input":{"args":[[]]},"expected":{},"validator_config":{},"weight":1},{"slug":"battle-v1-javascript-advanced-1","is_public":true,"ordinal":1,"input":{"tasks":[{"value":"A","delayMs":8},{"value":"B","delayMs":3},{"value":"C","delayMs":5},{"value":"D","delayMs":2},{"value":"E","delayMs":1}]},"expected":{"results":["A","B","C","D","E"],"withinLimit":true},"validator_config":{},"weight":1},{"slug":"battle-v1-javascript-advanced-1","is_public":false,"ordinal":1,"input":{"tasks":[{"value":1,"delayMs":2},{"value":2,"delayMs":7},{"value":3,"delayMs":1}]},"expected":{"results":[1,2,3],"withinLimit":true},"validator_config":{},"weight":1},{"slug":"battle-v1-javascript-advanced-2","is_public":true,"ordinal":1,"input":{"invocations":[[2,3],[2,3],[5,0],[2,3]]},"expected":{"results":[5,5,5,5],"calls":2},"validator_config":{},"weight":1},{"slug":"battle-v1-javascript-advanced-2","is_public":false,"ordinal":1,"input":{"invocations":[[0],[0],[1],[1]]},"expected":{"results":[0,0,1,1],"calls":2},"validator_config":{},"weight":1},{"slug":"battle-v1-html-css-never-1","is_public":true,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<section[^>]*>"]},{"description":"estrutura obrigatória","anyOf":["<h1[^>]*>\\s*arena\\s*</h1>"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-never-1","is_public":false,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<section[^>]*>"]},{"description":"estrutura obrigatória","anyOf":["<h1[^>]*>\\s*arena\\s*</h1>"]},{"description":"estrutura obrigatória","anyOf":["<p[^>]*>\\s*treine seu código\\s*</p>"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-never-2","is_public":true,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<a[^>]*href=[\"\\x27]/estudos[\"\\x27][^>]*>\\s*estudar\\s*</a>"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-never-2","is_public":false,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<a[^>]*href=[\"\\x27]/estudos[\"\\x27][^>]*>\\s*estudar\\s*</a>"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-basic-1","is_public":true,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<section[^>]*class=[\"\\x27][^\"\\x27]*cards"]},{"description":"estrutura obrigatória","anyOf":["(?:<article[^>]*>[^<]*</article>.*){3}"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-basic-1","is_public":false,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<section[^>]*class=[\"\\x27][^\"\\x27]*cards"]},{"description":"estrutura obrigatória","anyOf":["(?:<article[^>]*>[^<]*</article>.*){3}"]},{"description":"estrutura obrigatória","anyOf":["\\.cards\\s*\\{[^}]*display\\s*:\\s*flex"]},{"description":"estrutura obrigatória","anyOf":["gap\\s*:\\s*16px"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-basic-2","is_public":true,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<label[^>]*for=[\"\\x27]email[\"\\x27]"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-basic-2","is_public":false,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<label[^>]*for=[\"\\x27]email[\"\\x27]"]},{"description":"estrutura obrigatória","anyOf":["<input[^>]*id=[\"\\x27]email[\"\\x27][^>]*name=[\"\\x27]email[\"\\x27][^>]*type=[\"\\x27]email[\"\\x27]"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-intermediate-1","is_public":true,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["\\.grid\\s*\\{[^}]*display\\s*:\\s*grid"]},{"description":"estrutura obrigatória","anyOf":["grid-template-columns\\s*:\\s*repeat\\(auto-fit,\\s*minmax\\(220px,\\s*1fr\\)\\)"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-intermediate-1","is_public":false,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["\\.grid\\s*\\{[^}]*display\\s*:\\s*grid"]},{"description":"estrutura obrigatória","anyOf":["grid-template-columns\\s*:\\s*repeat\\(auto-fit,\\s*minmax\\(220px,\\s*1fr\\)\\)"]},{"description":"estrutura obrigatória","anyOf":["gap\\s*:\\s*16px"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-intermediate-2","is_public":true,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<dialog[^>]*open[^>]*aria-labelledby=[\"\\x27]modal-title[\"\\x27]"]},{"description":"estrutura obrigatória","anyOf":["<h2[^>]*id=[\"\\x27]modal-title[\"\\x27][^>]*>\\s*resultado"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-intermediate-2","is_public":false,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["<dialog[^>]*open[^>]*aria-labelledby=[\"\\x27]modal-title[\"\\x27]"]},{"description":"estrutura obrigatória","anyOf":["<h2[^>]*id=[\"\\x27]modal-title[\"\\x27][^>]*>\\s*resultado"]},{"description":"estrutura obrigatória","anyOf":["<p[^>]*>\\s*desafio concluído"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-advanced-1","is_public":true,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["@layer\\s+reset\\s*,\\s*components"]},{"description":"estrutura obrigatória","anyOf":["@layer\\s+reset\\s*\\{"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-advanced-1","is_public":false,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["@layer\\s+reset\\s*,\\s*components"]},{"description":"estrutura obrigatória","anyOf":["@layer\\s+reset\\s*\\{"]},{"description":"estrutura obrigatória","anyOf":["@layer\\s+components\\s*\\{"]},{"description":"estrutura obrigatória","anyOf":["\\.button\\s*\\{[^}]*color\\s*:\\s*gold"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-advanced-2","is_public":true,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["\\.wrapper\\s*\\{[^}]*container-type\\s*:\\s*inline-size"]},{"description":"estrutura obrigatória","anyOf":["@container\\s*\\(min-width\\s*:\\s*500px\\)"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-advanced-2","is_public":false,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["\\.wrapper\\s*\\{[^}]*container-type\\s*:\\s*inline-size"]},{"description":"estrutura obrigatória","anyOf":["@container\\s*\\(min-width\\s*:\\s*500px\\)"]},{"description":"estrutura obrigatória","anyOf":["\\.card\\s*\\{[^}]*display\\s*:\\s*grid"]},{"description":"estrutura obrigatória","anyOf":["grid-template-columns\\s*:\\s*1fr\\s+1fr"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-advanced-3","is_public":true,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["@keyframes\\s+pulse"]},{"description":"estrutura obrigatória","anyOf":["\\.pulse\\s*\\{[^}]*animation\\s*:"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-html-css-advanced-3","is_public":false,"ordinal":1,"input":{},"expected":null,"validator_config":{"required":[{"description":"estrutura obrigatória","anyOf":["@keyframes\\s+pulse"]},{"description":"estrutura obrigatória","anyOf":["\\.pulse\\s*\\{[^}]*animation\\s*:"]},{"description":"estrutura obrigatória","anyOf":["@media\\s*\\(prefers-reduced-motion\\s*:\\s*reduce\\)"]},{"description":"estrutura obrigatória","anyOf":["\\.pulse\\s*\\{[^}]*animation\\s*:\\s*none"]}],"forbidden":[{"description":"scripts não são permitidos","anyOf":["<script\\b","on[a-z]+\\s*=","javascript\\s*:"]}]},"weight":1},{"slug":"battle-v1-sql-never-1","is_public":true,"ordinal":1,"input":{"setupSql":"CREATE TABLE players(name TEXT, level INTEGER); INSERT INTO players VALUES ('Luna',3),('Kai',7);"},"expected":[["Kai",7],["Luna",3]],"validator_config":{"sortRows":true},"weight":1},{"slug":"battle-v1-sql-never-1","is_public":false,"ordinal":1,"input":{"setupSql":"CREATE TABLE players(name TEXT, level INTEGER); INSERT INTO players VALUES ('Mia',2),('Noah',9),('Otto',5);"},"expected":[["Mia",2],["Noah",9],["Otto",5]],"validator_config":{"sortRows":true},"weight":1},{"slug":"battle-v1-sql-never-2","is_public":true,"ordinal":1,"input":{"setupSql":"CREATE TABLE players(id INTEGER, name TEXT, level INTEGER, active BOOLEAN); INSERT INTO players VALUES (1,'Luna',3,TRUE),(2,'Kai',7,FALSE);"},"expected":[[1,"Luna",3,1]],"validator_config":{"sortRows":false},"weight":1},{"slug":"battle-v1-sql-never-2","is_public":false,"ordinal":1,"input":{"setupSql":"CREATE TABLE players(id INTEGER, name TEXT, level INTEGER, active BOOLEAN); INSERT INTO players VALUES (3,'Mia',2,FALSE),(4,'Noah',9,TRUE),(5,'Otto',5,TRUE);"},"expected":[[4,"Noah",9,1],[5,"Otto",5,1]],"validator_config":{"sortRows":true},"weight":1},{"slug":"battle-v1-sql-basic-1","is_public":true,"ordinal":1,"input":{"setupSql":"CREATE TABLE products(id INTEGER, category TEXT); INSERT INTO products VALUES (1,'games'),(2,'books'),(3,'games');"},"expected":[["games",2],["books",1]],"validator_config":{"sortRows":false},"weight":1},{"slug":"battle-v1-sql-basic-1","is_public":false,"ordinal":1,"input":{"setupSql":"CREATE TABLE products(id INTEGER, category TEXT); INSERT INTO products VALUES (1,'games'),(2,'books'),(3,'games'),(4,'games'),(5,'music'),(6,'music');"},"expected":[["games",3],["music",2],["books",1]],"validator_config":{"sortRows":false},"weight":1},{"slug":"battle-v1-sql-basic-2","is_public":true,"ordinal":1,"input":{"setupSql":"CREATE TABLE customers(id INTEGER, name TEXT); CREATE TABLE orders(id INTEGER, customer_id INTEGER); INSERT INTO customers VALUES (1,'Ana'),(2,'Beto'); INSERT INTO orders VALUES (8,2),(7,1);"},"expected":[[7,"Ana"],[8,"Beto"]],"validator_config":{"sortRows":true},"weight":1},{"slug":"battle-v1-sql-basic-2","is_public":false,"ordinal":1,"input":{"setupSql":"CREATE TABLE customers(id INTEGER, name TEXT); CREATE TABLE orders(id INTEGER, customer_id INTEGER); INSERT INTO customers VALUES (7,'Cora'),(8,'Davi'); INSERT INTO orders VALUES (32,8),(31,7),(33,7);"},"expected":[[31,"Cora"],[32,"Davi"],[33,"Cora"]],"validator_config":{"sortRows":true},"weight":1},{"slug":"battle-v1-sql-intermediate-1","is_public":true,"ordinal":1,"input":{"setupSql":"CREATE TABLE players(name TEXT, team_id INTEGER, score INTEGER); INSERT INTO players VALUES ('A',1,20),('B',1,10),('C',2,30),('D',2,30);"},"expected":[["A",1,1],["B",1,2],["C",2,1],["D",2,1]],"validator_config":{"sortRows":true},"weight":1},{"slug":"battle-v1-sql-intermediate-1","is_public":false,"ordinal":1,"input":{"setupSql":"CREATE TABLE players(name TEXT, team_id INTEGER, score INTEGER); INSERT INTO players VALUES ('E',3,40),('F',3,20),('G',3,20),('H',4,5);"},"expected":[["E",3,1],["F",3,2],["G",3,2],["H",4,1]],"validator_config":{"sortRows":true},"weight":1},{"slug":"battle-v1-sql-intermediate-2","is_public":true,"ordinal":1,"input":{"setupSql":"CREATE TABLE order_items(order_id INTEGER, price REAL, quantity INTEGER); INSERT INTO order_items VALUES (1,50,3),(2,20,2),(3,60,2);"},"expected":[[1,150],[3,120]],"validator_config":{"sortRows":true},"weight":1},{"slug":"battle-v1-sql-intermediate-2","is_public":false,"ordinal":1,"input":{"setupSql":"CREATE TABLE order_items(order_id INTEGER, price REAL, quantity INTEGER); INSERT INTO order_items VALUES (4,25,5),(5,99,1),(6,40,3),(7,10,11);"},"expected":[[4,125],[6,120],[7,110]],"validator_config":{"sortRows":true},"weight":1},{"slug":"battle-v1-sql-advanced-1","is_public":true,"ordinal":1,"input":{"setupSql":"CREATE TABLE categories(id INTEGER, parent_id INTEGER, name TEXT); INSERT INTO categories VALUES (1,NULL,'root'),(2,1,'front'),(3,1,'back'),(4,2,'css'),(9,NULL,'outside');"},"expected":[[1,null,"root"],[2,1,"front"],[3,1,"back"],[4,2,"css"]],"validator_config":{"sortRows":true},"weight":1},{"slug":"battle-v1-sql-advanced-1","is_public":false,"ordinal":1,"input":{"setupSql":"CREATE TABLE categories(id INTEGER, parent_id INTEGER, name TEXT); INSERT INTO categories VALUES (1,NULL,'root'),(2,1,'api'),(3,2,'rest'),(4,3,'auth'),(8,NULL,'outside');"},"expected":[[1,null,"root"],[2,1,"api"],[3,2,"rest"],[4,3,"auth"]],"validator_config":{"sortRows":true},"weight":1},{"slug":"battle-v1-sql-advanced-3","is_public":true,"ordinal":1,"input":{"setupSql":"CREATE TABLE preferences(player_id INTEGER PRIMARY KEY, theme TEXT); INSERT INTO preferences VALUES (1,'light');","verificationSql":"SELECT player_id, theme FROM preferences WHERE player_id = 1;"},"expected":[[1,"dark"]],"validator_config":{"sortRows":false},"weight":1},{"slug":"battle-v1-sql-advanced-3","is_public":false,"ordinal":1,"input":{"setupSql":"CREATE TABLE preferences(player_id INTEGER PRIMARY KEY, theme TEXT); INSERT INTO preferences VALUES (1,'solarized');","verificationSql":"SELECT player_id, theme FROM preferences WHERE player_id = 1;"},"expected":[[1,"dark"]],"validator_config":{"sortRows":false},"weight":1}]$tests$::jsonb) as seed(
  slug text,
  is_public boolean,
  ordinal smallint,
  input jsonb,
  expected jsonb,
  validator_config jsonb,
  weight smallint
)
join public.multiplayer_challenges as challenges on challenges.slug = seed.slug;
-- CHALLENGE_SEED_GENERATED_END

create or replace function devroyale_private.select_multiplayer_challenge(
  p_match_id uuid,
  p_language public.room_language,
  p_difficulty public.room_difficulty
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select challenge.id
  from public.multiplayer_challenges as challenge
  where challenge.language = p_language
    and challenge.difficulty = p_difficulty
    and challenge.is_active
  order by
    exists (
      select 1
      from public.multiplayer_rounds as played_rounds
      where played_rounds.match_id = p_match_id
        and played_rounds.challenge_id = challenge.id
    ),
    md5(
      p_match_id::text || ':' ||
      (
        select count(*)::text
        from public.multiplayer_rounds as existing_rounds
        where existing_rounds.match_id = p_match_id
      ) || ':' || challenge.id::text
    )
  limit 1;
$$;

revoke all on function devroyale_private.select_multiplayer_challenge(
  uuid,
  public.room_language,
  public.room_difficulty
) from public, anon, authenticated;

create or replace function public.activate_multiplayer_match(p_room_id uuid)
returns public.multiplayer_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_room public.rooms;
  existing_match public.multiplayer_matches;
  created_match public.multiplayer_matches;
  selected_challenge_id uuid;
  official_format public.match_format;
  member_count integer;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  select * into target_room
  from public.rooms
  where id = p_room_id
  for update;

  if not found or not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = current_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'match_not_found';
  end if;

  select * into existing_match
  from public.multiplayer_matches
  where room_id = p_room_id;

  if found then
    return existing_match;
  end if;

  if target_room.status <> 'starting'
     or target_room.countdown_started_at is null then
    raise exception using errcode = 'P0001', message = 'match_activation_unavailable';
  end if;

  if target_room.countdown_started_at > now() - interval '3 seconds' then
    raise exception using errcode = 'P0001', message = 'countdown_not_finished';
  end if;

  select count(*) into member_count
  from public.room_members
  where room_id = p_room_id;

  if member_count <> 2 then
    raise exception using errcode = 'P0001', message = 'match_requires_two_players';
  end if;

  official_format := case
    when target_room.room_kind = 'quick_match' then 'bo1'::public.match_format
    else target_room.match_format
  end;

  insert into public.multiplayer_matches (
    room_id,
    status,
    language,
    difficulty,
    match_format,
    current_round,
    started_at
  ) values (
    target_room.id,
    'active',
    target_room.language,
    target_room.difficulty,
    official_format,
    1,
    now()
  ) returning * into created_match;

  insert into public.multiplayer_match_players (match_id, user_id)
  select created_match.id, room_members.user_id
  from public.room_members
  where room_members.room_id = target_room.id;

  selected_challenge_id := devroyale_private.select_multiplayer_challenge(
    created_match.id,
    created_match.language,
    created_match.difficulty
  );

  if selected_challenge_id is null then
    raise exception using errcode = 'P0001', message = 'no_multiplayer_challenge';
  end if;

  insert into public.multiplayer_rounds (
    match_id,
    round_number,
    challenge_id,
    status,
    started_at
  ) values (
    created_match.id,
    1,
    selected_challenge_id,
    'active',
    created_match.started_at
  );

  update public.rooms
  set status = 'in_match', countdown_started_at = null
  where id = target_room.id;

  return created_match;
end;
$$;

create or replace function public.advance_multiplayer_round(p_match_id uuid)
returns public.multiplayer_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_match public.multiplayer_matches;
  target_round public.multiplayer_rounds;
begin
  select * into target_match
  from public.multiplayer_matches
  where id = p_match_id
  for update;

  if current_user_id is null
     or not found
     or not devroyale_private.is_match_participant(p_match_id, current_user_id) then
    raise exception using errcode = 'P0001', message = 'match_not_found';
  end if;

  if target_match.status = 'active' then
    return target_match;
  end if;
  if target_match.status <> 'between_rounds' then
    raise exception using errcode = 'P0001', message = 'round_activation_unavailable';
  end if;

  select * into target_round
  from public.multiplayer_rounds
  where match_id = p_match_id
    and round_number = target_match.current_round
  for update;

  if not found or target_round.status <> 'waiting' then
    raise exception using errcode = 'P0001', message = 'round_activation_unavailable';
  end if;
  if target_round.started_at > now() then
    raise exception using errcode = 'P0001', message = 'round_countdown_not_finished';
  end if;

  update public.multiplayer_rounds
  set status = 'active'
  where id = target_round.id;

  update public.multiplayer_matches
  set status = 'active'
  where id = p_match_id
  returning * into target_match;

  return target_match;
end;
$$;

create or replace function public.get_multiplayer_match_state(
  p_match_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_match public.multiplayer_matches;
  target_room public.rooms;
  target_round public.multiplayer_rounds;
  target_previous_round public.multiplayer_rounds;
  target_challenge public.multiplayer_challenges;
  players_json jsonb;
  own_submission_json jsonb;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  if p_match_id is null then
    select matches.* into target_match
    from public.multiplayer_matches as matches
    join public.multiplayer_match_players as players
      on players.match_id = matches.id
    where players.user_id = current_user_id
      and matches.status in ('preparing', 'active', 'between_rounds')
    order by matches.created_at desc
    limit 1;
  else
    select * into target_match
    from public.multiplayer_matches
    where id = p_match_id
      and devroyale_private.is_match_participant(id, current_user_id);
  end if;

  if not found then
    return null;
  end if;

  select * into target_room
  from public.rooms
  where id = target_match.room_id;

  select * into target_round
  from public.multiplayer_rounds
  where match_id = target_match.id
    and round_number = target_match.current_round;

  select * into target_previous_round
  from public.multiplayer_rounds
  where match_id = target_match.id
    and round_number = target_match.current_round - 1;

  select * into target_challenge
  from public.multiplayer_challenges
  where id = target_round.challenge_id and is_active;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'userId', players.user_id,
        'roundsWon', players.rounds_won,
        'status', players.status,
        'joinedAt', players.joined_at,
        'username', profiles.username,
        'displayName', profiles.display_name,
        'avatarUrl', profiles.avatar_url
      ) order by players.joined_at, players.user_id
    ),
    '[]'::jsonb
  ) into players_json
  from public.multiplayer_match_players as players
  join public.profiles on profiles.id = players.user_id
  where players.match_id = target_match.id;

  select jsonb_build_object(
    'id', submissions.id,
    'requestId', submissions.client_request_id,
    'mode', submissions.mode,
    'status', submissions.status,
    'createdAt', submissions.created_at,
    'judgingStartedAt', submissions.judging_started_at,
    'judgedAt', submissions.judged_at,
    'executionTime', submissions.execution_time,
    'memoryUsed', submissions.memory_used,
    'message', submissions.public_message,
    'stdout', submissions.stdout
  ) into own_submission_json
  from public.multiplayer_submissions as submissions
  where submissions.round_id = target_round.id
    and submissions.user_id = current_user_id
  order by submissions.created_at desc
  limit 1;

  return jsonb_build_object(
    'match', jsonb_build_object(
      'id', target_match.id,
      'roomId', target_match.room_id,
      'roomKind', target_room.room_kind,
      'status', target_match.status,
      'language', target_match.language,
      'difficulty', target_match.difficulty,
      'matchFormat', target_match.match_format,
      'currentRound', target_match.current_round,
      'winnerId', target_match.winner_id,
      'startedAt', target_match.started_at,
      'finishedAt', target_match.finished_at,
      'cancelledAt', target_match.cancelled_at
    ),
    'players', players_json,
    'round', jsonb_build_object(
      'id', target_round.id,
      'roundNumber', target_round.round_number,
      'status', target_round.status,
      'winnerId', target_round.winner_id,
      'startedAt', target_round.started_at,
      'finishedAt', target_round.finished_at
    ),
    'previousRound', case
      when target_previous_round.id is null then null
      else jsonb_build_object(
        'id', target_previous_round.id,
        'roundNumber', target_previous_round.round_number,
        'status', target_previous_round.status,
        'winnerId', target_previous_round.winner_id,
        'startedAt', target_previous_round.started_at,
        'finishedAt', target_previous_round.finished_at
      )
    end,
    'challenge', jsonb_build_object(
      'id', target_challenge.id,
      'slug', target_challenge.slug,
      'title', target_challenge.title,
      'statement', target_challenge.statement,
      'instructions', target_challenge.instructions,
      'starterCode', target_challenge.starter_code,
      'publicExamples', target_challenge.public_examples,
      'validationType', target_challenge.validation_type
    ),
    'ownLatestSubmission', own_submission_json
  );
end;
$$;

create or replace function public.create_multiplayer_submission_internal(
  p_user_id uuid,
  p_match_id uuid,
  p_round_id uuid,
  p_client_request_id uuid,
  p_mode public.multiplayer_submission_mode,
  p_source_code text
)
returns public.multiplayer_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := p_user_id;
  target_match public.multiplayer_matches;
  target_round public.multiplayer_rounds;
  existing_submission public.multiplayer_submissions;
  created_submission public.multiplayer_submissions;
  latest_created_at timestamptz;
  minimum_interval interval;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;
  if p_client_request_id is null then
    raise exception using errcode = 'P0001', message = 'invalid_submission_request';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'battle-submission:' || current_user_id::text || ':' || p_client_request_id::text,
      0
    )
  );

  select * into existing_submission
  from public.multiplayer_submissions
  where match_id = p_match_id
    and user_id = current_user_id
    and client_request_id = p_client_request_id;

  if found then
    return existing_submission;
  end if;

  select * into target_match
  from public.multiplayer_matches
  where id = p_match_id
  for update;

  if not found
     or not devroyale_private.is_match_participant(p_match_id, current_user_id) then
    raise exception using errcode = 'P0001', message = 'match_not_found';
  end if;
  if target_match.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'match_not_active';
  end if;

  select * into target_round
  from public.multiplayer_rounds
  where id = p_round_id and match_id = p_match_id
  for update;

  if not found
     or target_round.round_number <> target_match.current_round
     or target_round.status <> 'active'
     or target_round.started_at > now() then
    raise exception using errcode = 'P0001', message = 'round_not_active';
  end if;

  if p_source_code is null
     or octet_length(p_source_code) not between 1 and 20480 then
    raise exception using errcode = 'P0001', message = 'source_code_size_invalid';
  end if;

  minimum_interval := case
    when p_mode = 'run' then interval '1 second'
    else interval '2 seconds'
  end;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'battle-rate:' || current_user_id::text || ':' || p_match_id::text || ':' ||
      p_round_id::text || ':' || p_mode::text,
      0
    )
  );

  select max(created_at) into latest_created_at
  from public.multiplayer_submissions
  where match_id = p_match_id
    and user_id = current_user_id
    and mode = p_mode;

  if latest_created_at is not null
     and latest_created_at > now() - minimum_interval then
    raise exception using errcode = 'P0001', message = 'submission_rate_limited';
  end if;

  insert into public.multiplayer_submissions (
    client_request_id,
    match_id,
    round_id,
    user_id,
    mode,
    source_code
  ) values (
    p_client_request_id,
    p_match_id,
    p_round_id,
    current_user_id,
    p_mode,
    p_source_code
  ) returning * into created_submission;

  return created_submission;
end;
$$;

create or replace function public.acquire_multiplayer_submission_lease_internal(
  p_submission_id uuid,
  p_worker_id uuid,
  p_lease_seconds integer default 90
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_submission public.multiplayer_submissions;
  target_job devroyale_private.multiplayer_submission_jobs;
begin
  if p_worker_id is null or p_lease_seconds not between 30 and 300 then
    raise exception using errcode = 'P0001', message = 'invalid_submission_lease';
  end if;

  select * into target_submission
  from public.multiplayer_submissions
  where id = p_submission_id
  for update;

  if not found or target_submission.status not in ('queued', 'running') then
    return null;
  end if;

  select * into target_job
  from devroyale_private.multiplayer_submission_jobs
  where submission_id = p_submission_id
  for update;

  if found
     and target_job.locked_until > now()
     and target_job.locked_by is distinct from p_worker_id then
    return null;
  end if;

  insert into devroyale_private.multiplayer_submission_jobs (
    submission_id,
    provider,
    test_position,
    locked_by,
    locked_until
  ) values (
    p_submission_id,
    'pending',
    1,
    p_worker_id,
    now() + make_interval(secs => p_lease_seconds)
  )
  on conflict (submission_id) do update
  set locked_by = excluded.locked_by,
      locked_until = excluded.locked_until
  returning * into target_job;

  return jsonb_build_object(
    'submissionId', target_job.submission_id,
    'provider', target_job.provider,
    'providerToken', target_job.provider_token,
    'testPosition', target_job.test_position,
    'attempts', target_job.attempts,
    'exhausted', false
  );
end;
$$;

create or replace function public.claim_stale_multiplayer_submission_internal(
  p_worker_id uuid,
  p_stale_seconds integer default 30,
  p_lease_seconds integer default 90
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_id uuid;
  target_job devroyale_private.multiplayer_submission_jobs;
  recovery_exhausted boolean;
begin
  if p_worker_id is null
     or p_stale_seconds not between 10 and 3600
     or p_lease_seconds not between 30 and 300 then
    raise exception using errcode = 'P0001', message = 'invalid_reconciliation_request';
  end if;

  select submissions.id into candidate_id
  from public.multiplayer_submissions as submissions
  left join devroyale_private.multiplayer_submission_jobs as jobs
    on jobs.submission_id = submissions.id
  where submissions.status in ('queued', 'running')
    and (
      (
        submissions.status = 'queued'
        and submissions.created_at <= now() - make_interval(secs => p_stale_seconds)
      )
      or (
        submissions.status = 'running'
        and coalesce(jobs.updated_at, submissions.judging_started_at, submissions.created_at)
          <= now() - make_interval(secs => p_stale_seconds)
      )
    )
    and (jobs.locked_until is null or jobs.locked_until <= now())
  order by coalesce(jobs.updated_at, submissions.judging_started_at, submissions.created_at)
  for update of submissions skip locked
  limit 1;

  if candidate_id is null then
    return null;
  end if;

  select * into target_job
  from devroyale_private.multiplayer_submission_jobs
  where submission_id = candidate_id
  for update;

  recovery_exhausted := found and target_job.attempts >= 3;

  if found then
    update devroyale_private.multiplayer_submission_jobs
    set attempts = attempts + case when recovery_exhausted then 0 else 1 end,
        locked_by = p_worker_id,
        locked_until = now() + make_interval(secs => p_lease_seconds)
    where submission_id = candidate_id
    returning * into target_job;
  else
    insert into devroyale_private.multiplayer_submission_jobs (
      submission_id,
      provider,
      test_position,
      attempts,
      locked_by,
      locked_until
    ) values (
      candidate_id,
      'pending',
      1,
      1,
      p_worker_id,
      now() + make_interval(secs => p_lease_seconds)
    )
    returning * into target_job;
  end if;

  return jsonb_build_object(
    'submissionId', target_job.submission_id,
    'provider', target_job.provider,
    'providerToken', target_job.provider_token,
    'testPosition', target_job.test_position,
    'attempts', target_job.attempts,
    'exhausted', recovery_exhausted
  );
end;
$$;

create or replace function public.record_multiplayer_submission_job_error_internal(
  p_submission_id uuid,
  p_worker_id uuid,
  p_last_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update devroyale_private.multiplayer_submission_jobs
  set last_error = left(coalesce(p_last_error, 'unknown_worker_error'), 500),
      locked_by = null,
      locked_until = now() + interval '30 seconds'
  where submission_id = p_submission_id
    and locked_by = p_worker_id;
end;
$$;

create or replace function public.surrender_multiplayer_match(p_match_id uuid)
returns public.multiplayer_matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_match public.multiplayer_matches;
  opponent_id uuid;
begin
  select * into target_match
  from public.multiplayer_matches
  where id = p_match_id
  for update;

  if current_user_id is null
     or not found
     or not devroyale_private.is_match_participant(p_match_id, current_user_id) then
    raise exception using errcode = 'P0001', message = 'match_not_found';
  end if;

  if target_match.status not in ('preparing', 'active', 'between_rounds') then
    return target_match;
  end if;

  select user_id into opponent_id
  from public.multiplayer_match_players
  where match_id = p_match_id and user_id <> current_user_id
  order by joined_at
  limit 1;

  if opponent_id is null then
    raise exception using errcode = 'P0001', message = 'opponent_not_found';
  end if;

  update public.multiplayer_match_players
  set status = case
    when user_id = current_user_id then 'surrendered'::public.multiplayer_player_status
    else 'finished'::public.multiplayer_player_status
  end
  where match_id = p_match_id;

  update public.multiplayer_rounds
  set status = 'cancelled'
  where match_id = p_match_id and status in ('waiting', 'active');

  update public.multiplayer_matches
  set status = 'finished', winner_id = opponent_id, finished_at = now()
  where id = p_match_id
  returning * into target_match;

  update public.rooms
  set status = 'finished', closed_at = now()
  where id = target_match.room_id;
  update public.room_invites
  set status = 'expired'
  where room_id = target_match.room_id and status = 'pending';
  delete from public.room_members where room_id = target_match.room_id;

  return target_match;
end;
$$;

create or replace function public.get_multiplayer_judge_payload_internal(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_submission public.multiplayer_submissions;
  target_match public.multiplayer_matches;
  target_round public.multiplayer_rounds;
  target_challenge public.multiplayer_challenges;
  tests_json jsonb;
begin
  select * into target_submission
  from public.multiplayer_submissions
  where id = p_submission_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'submission_not_found';
  end if;

  select * into target_match from public.multiplayer_matches
  where id = target_submission.match_id;
  select * into target_round from public.multiplayer_rounds
  where id = target_submission.round_id;
  select * into target_challenge from public.multiplayer_challenges
  where id = target_round.challenge_id and is_active;

  if target_challenge.id is null then
    raise exception using errcode = 'P0001', message = 'challenge_not_found';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'input', tests.input,
        'expected', tests.expected,
        'validatorConfig', tests.validator_config,
        'weight', tests.weight
      ) order by tests.is_public desc, tests.ordinal
    ),
    '[]'::jsonb
  ) into tests_json
  from devroyale_private.multiplayer_challenge_tests as tests
  where tests.challenge_id = target_challenge.id
    and (
      (target_submission.mode = 'run' and tests.is_public)
      or target_submission.mode = 'submit'
    );

  return jsonb_build_object(
    'submissionId', target_submission.id,
    'matchId', target_submission.match_id,
    'roundId', target_submission.round_id,
    'userId', target_submission.user_id,
    'mode', target_submission.mode,
    'sourceCode', target_submission.source_code,
    'language', target_match.language,
    'difficulty', target_match.difficulty,
    'validationType', target_challenge.validation_type,
    'judgeConfig', target_challenge.judge_config,
    'tests', tests_json
  );
end;
$$;

create or replace function public.mark_multiplayer_submission_running_internal(
  p_submission_id uuid,
  p_provider text,
  p_provider_token text,
  p_test_position smallint,
  p_worker_id uuid,
  p_lease_seconds integer default 90
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_test_position <= 0
     or p_worker_id is null
     or p_lease_seconds not between 30 and 300 then
    raise exception using errcode = 'P0001', message = 'invalid_submission_worker_state';
  end if;

  update public.multiplayer_submissions
  set status = 'running',
      judging_started_at = coalesce(judging_started_at, now())
  where id = p_submission_id and status in ('queued', 'running');

  if not found then
    return;
  end if;

  insert into devroyale_private.multiplayer_submission_jobs (
    submission_id,
    provider,
    provider_token,
    test_position,
    locked_by,
    locked_until
  ) values (
    p_submission_id,
    p_provider,
    p_provider_token,
    p_test_position,
    p_worker_id,
    now() + make_interval(secs => p_lease_seconds)
  )
  on conflict (submission_id) do update
  set provider = excluded.provider,
      provider_token = excluded.provider_token,
      test_position = excluded.test_position,
      locked_by = excluded.locked_by,
      locked_until = excluded.locked_until,
      last_error = null;
end;
$$;

create or replace function public.finalize_multiplayer_submission_internal(
  p_submission_id uuid,
  p_status public.multiplayer_submission_status,
  p_public_message text,
  p_stdout text default null,
  p_execution_time numeric default null,
  p_memory_used integer default null
)
returns public.multiplayer_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_submission public.multiplayer_submissions;
  target_match public.multiplayer_matches;
  target_round public.multiplayer_rounds;
  player_score smallint;
  wins_required smallint;
  next_round_number smallint;
  next_challenge_id uuid;
begin
  if p_status in ('queued', 'running') then
    raise exception using errcode = 'P0001', message = 'invalid_final_submission_status';
  end if;

  select * into target_submission
  from public.multiplayer_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'submission_not_found';
  end if;
  if target_submission.status not in ('queued', 'running') then
    return target_submission;
  end if;

  update public.multiplayer_submissions
  set status = p_status,
      judged_at = now(),
      execution_time = p_execution_time,
      memory_used = p_memory_used,
      public_message = left(coalesce(p_public_message, ''), 500),
      stdout = left(coalesce(p_stdout, ''), 8192)
  where id = p_submission_id
  returning * into target_submission;

  delete from devroyale_private.multiplayer_submission_jobs
  where submission_id = p_submission_id;

  if p_status <> 'accepted' or target_submission.mode <> 'submit' then
    return target_submission;
  end if;

  select * into target_match
  from public.multiplayer_matches
  where id = target_submission.match_id
  for update;

  select * into target_round
  from public.multiplayer_rounds
  where id = target_submission.round_id
  for update;

  if target_match.status <> 'active'
     or target_round.status <> 'active'
     or target_round.round_number <> target_match.current_round then
    return target_submission;
  end if;

  update public.multiplayer_rounds
  set status = 'finished',
      winner_id = target_submission.user_id,
      finished_at = now()
  where id = target_round.id;

  update public.multiplayer_match_players
  set rounds_won = rounds_won + 1
  where match_id = target_match.id and user_id = target_submission.user_id
  returning rounds_won into player_score;

  wins_required := case target_match.match_format
    when 'bo1' then 1
    when 'bo3' then 2
    when 'bo5' then 3
  end;

  if player_score >= wins_required then
    update public.multiplayer_match_players
    set status = 'finished'
    where match_id = target_match.id and status <> 'surrendered';

    update public.multiplayer_matches
    set status = 'finished',
        winner_id = target_submission.user_id,
        finished_at = now()
    where id = target_match.id;

    update public.rooms
    set status = 'finished', closed_at = now()
    where id = target_match.room_id;
    update public.room_invites
    set status = 'expired'
    where room_id = target_match.room_id and status = 'pending';
    delete from public.room_members where room_id = target_match.room_id;

    return target_submission;
  end if;

  next_round_number := target_match.current_round + 1;
  next_challenge_id := devroyale_private.select_multiplayer_challenge(
    target_match.id,
    target_match.language,
    target_match.difficulty
  );

  if next_challenge_id is null then
    update public.multiplayer_matches
    set status = 'abandoned', cancelled_at = now()
    where id = target_match.id;
    update public.rooms
    set status = 'cancelled', closed_at = now()
    where id = target_match.room_id;
    delete from public.room_members where room_id = target_match.room_id;
    return target_submission;
  end if;

  insert into public.multiplayer_rounds (
    match_id,
    round_number,
    challenge_id,
    status,
    started_at
  ) values (
    target_match.id,
    next_round_number,
    next_challenge_id,
    'waiting',
    now() + interval '3 seconds'
  );

  update public.multiplayer_matches
  set status = 'between_rounds', current_round = next_round_number
  where id = target_match.id;

  return target_submission;
end;
$$;

-- Room exits and host powers cannot mutate a battle already owned by the match engine.
create or replace function public.leave_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_room public.rooms;
  current_role public.room_member_role;
  next_host_id uuid;
begin
  select * into target_room from public.rooms where id = p_room_id for update;

  if current_user_id is null or not found then
    raise exception using errcode = 'P0001', message = 'room_not_found';
  end if;

  select role into current_role
  from public.room_members
  where room_id = p_room_id and user_id = current_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'not_room_member';
  end if;

  if exists (
    select 1 from public.multiplayer_matches
    where room_id = p_room_id and status in ('preparing', 'active', 'between_rounds')
  ) then
    raise exception using errcode = 'P0001', message = 'match_in_progress_use_surrender';
  end if;

  if target_room.room_kind = 'quick_match' then
    update public.matchmaking_queue
    set status = 'cancelled', matched_room_id = null, matched_at = null
    where matched_room_id = p_room_id and status = 'matched';
    delete from public.room_members where room_id = p_room_id;
    update public.rooms
    set status = 'cancelled', countdown_started_at = null, closed_at = now()
    where id = p_room_id;
    return;
  end if;

  if current_role = 'host' then
    select user_id into next_host_id
    from public.room_members
    where room_id = p_room_id and user_id <> current_user_id
    order by joined_at
    limit 1
    for update;

    if next_host_id is not null then
      update public.room_members
      set role = 'host', ready = false
      where room_id = p_room_id and user_id = next_host_id;
      update public.rooms
      set host_id = next_host_id, status = 'waiting', countdown_started_at = null
      where id = p_room_id;
      update public.room_invites
      set status = 'expired'
      where room_id = p_room_id and status = 'pending';
    end if;
  end if;

  delete from public.room_members
  where room_id = p_room_id and user_id = current_user_id;

  if next_host_id is null and not exists (
    select 1 from public.room_members where room_id = p_room_id
  ) then
    update public.rooms
    set status = 'cancelled', countdown_started_at = null, closed_at = now()
    where id = p_room_id;
    update public.room_invites
    set status = 'expired'
    where room_id = p_room_id and status = 'pending';
  else
    update public.room_members set ready = false where room_id = p_room_id;
    update public.rooms
    set status = 'waiting', countdown_started_at = null
    where id = p_room_id;
  end if;
end;
$$;

create or replace function public.kick_room_member(p_room_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_room public.rooms;
begin
  select * into target_room from public.rooms where id = p_room_id for update;
  if current_user_id is null or not found then
    raise exception using errcode = 'P0001', message = 'room_not_found';
  end if;
  if target_room.room_kind <> 'custom' then
    raise exception using errcode = 'P0001', message = 'quick_match_restricted';
  end if;
  if target_room.host_id <> current_user_id then
    raise exception using errcode = 'P0001', message = 'host_only';
  end if;
  if exists (
    select 1 from public.multiplayer_matches
    where room_id = p_room_id and status in ('preparing', 'active', 'between_rounds')
  ) then
    raise exception using errcode = 'P0001', message = 'match_in_progress';
  end if;
  if p_user_id = current_user_id then
    raise exception using errcode = 'P0001', message = 'cannot_kick_host';
  end if;

  delete from public.room_members
  where room_id = p_room_id and user_id = p_user_id and role = 'player';
  if not found then
    raise exception using errcode = 'P0001', message = 'player_not_found';
  end if;
  update public.room_members set ready = false where room_id = p_room_id;
  update public.rooms
  set status = 'waiting', countdown_started_at = null
  where id = p_room_id;
end;
$$;

create or replace function public.cancel_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_room public.rooms;
begin
  select * into target_room from public.rooms where id = p_room_id for update;
  if current_user_id is null or not found then
    raise exception using errcode = 'P0001', message = 'room_not_found';
  end if;
  if target_room.room_kind <> 'custom' then
    raise exception using errcode = 'P0001', message = 'quick_match_restricted';
  end if;
  if target_room.host_id <> current_user_id then
    raise exception using errcode = 'P0001', message = 'host_only';
  end if;
  if exists (
    select 1 from public.multiplayer_matches
    where room_id = p_room_id and status in ('preparing', 'active', 'between_rounds')
  ) then
    raise exception using errcode = 'P0001', message = 'match_in_progress';
  end if;

  delete from public.room_members where room_id = p_room_id;
  update public.room_invites set status = 'expired'
  where room_id = p_room_id and status = 'pending';
  update public.rooms
  set status = 'cancelled', countdown_started_at = null, closed_at = now()
  where id = p_room_id;
end;
$$;

create or replace function devroyale_private.broadcast_multiplayer_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_name text;
  changed_match_id uuid;
  safe_payload jsonb;
begin
  if tg_table_name = 'multiplayer_matches' then
    changed_match_id := new.id;
    event_name := case
      when new.status = 'finished' and (tg_op = 'INSERT' or old.status <> 'finished')
        then 'match_finished'
      when new.status in ('cancelled', 'abandoned')
        and (tg_op = 'INSERT' or old.status <> new.status)
        then 'match_cancelled'
      else 'match_started'
    end;
    safe_payload := jsonb_build_object(
      'matchId', new.id,
      'status', new.status,
      'winnerId', new.winner_id,
      'currentRound', new.current_round
    );
  elsif tg_table_name = 'multiplayer_rounds' then
    changed_match_id := new.match_id;
    event_name := case
      when new.status = 'finished' then 'round_finished'
      else 'round_started'
    end;
    safe_payload := jsonb_build_object(
      'matchId', new.match_id,
      'roundId', new.id,
      'roundNumber', new.round_number,
      'status', new.status,
      'winnerId', new.winner_id,
      'startedAt', new.started_at
    );
  elsif tg_table_name = 'multiplayer_match_players' then
    changed_match_id := new.match_id;
    event_name := case
      when tg_op = 'UPDATE' and old.rounds_won <> new.rounds_won then 'score_changed'
      else 'player_connection'
    end;
    safe_payload := jsonb_build_object(
      'matchId', new.match_id,
      'userId', new.user_id,
      'roundsWon', new.rounds_won,
      'status', new.status
    );
  else
    changed_match_id := new.match_id;
    if tg_op = 'INSERT' and new.mode = 'run' then
      return null;
    end if;
    if tg_op = 'UPDATE' and new.status in ('queued', 'running') then
      return null;
    end if;
    event_name := case when tg_op = 'INSERT' then 'player_submitted' else 'submission_finished' end;
    safe_payload := jsonb_build_object(
      'matchId', new.match_id,
      'roundId', new.round_id,
      'submissionId', new.id,
      'userId', new.user_id,
      'mode', new.mode,
      'status', new.status
    );
  end if;

  perform realtime.send(
    jsonb_build_object('type', event_name) || safe_payload,
    event_name,
    'match:' || changed_match_id::text,
    true
  );

  return null;
end;
$$;

revoke all on function devroyale_private.broadcast_multiplayer_change()
  from public, anon, authenticated;

create trigger multiplayer_matches_broadcast_change
  after insert or update on public.multiplayer_matches
  for each row execute procedure devroyale_private.broadcast_multiplayer_change();
create trigger multiplayer_rounds_broadcast_change
  after insert or update on public.multiplayer_rounds
  for each row execute procedure devroyale_private.broadcast_multiplayer_change();
create trigger multiplayer_match_players_broadcast_change
  after insert or update on public.multiplayer_match_players
  for each row execute procedure devroyale_private.broadcast_multiplayer_change();
create trigger multiplayer_submissions_broadcast_change
  after insert or update on public.multiplayer_submissions
  for each row execute procedure devroyale_private.broadcast_multiplayer_change();

create policy devroyale_match_channel_read
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and devroyale_private.can_access_match_topic(
      (select realtime.topic()),
      (select auth.uid())
    )
  );

create policy devroyale_match_presence_write
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and devroyale_private.can_access_match_topic(
      (select realtime.topic()),
      (select auth.uid())
    )
  );

revoke all on function public.activate_multiplayer_match(uuid) from public, anon;
revoke all on function public.advance_multiplayer_round(uuid) from public, anon;
revoke all on function public.get_multiplayer_match_state(uuid) from public, anon;
revoke all on function public.create_multiplayer_submission_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  public.multiplayer_submission_mode,
  text
) from public, anon, authenticated;
revoke all on function public.surrender_multiplayer_match(uuid) from public, anon;

grant execute on function public.activate_multiplayer_match(uuid) to authenticated;
grant execute on function public.advance_multiplayer_round(uuid) to authenticated;
grant execute on function public.get_multiplayer_match_state(uuid) to authenticated;
grant execute on function public.create_multiplayer_submission_internal(
  uuid,
  uuid,
  uuid,
  uuid,
  public.multiplayer_submission_mode,
  text
) to service_role;
grant execute on function public.surrender_multiplayer_match(uuid) to authenticated;

revoke all on function public.get_multiplayer_judge_payload_internal(uuid)
  from public, anon, authenticated;
revoke all on function public.acquire_multiplayer_submission_lease_internal(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.claim_stale_multiplayer_submission_internal(uuid, integer, integer)
  from public, anon, authenticated;
revoke all on function public.record_multiplayer_submission_job_error_internal(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.mark_multiplayer_submission_running_internal(
  uuid,
  text,
  text,
  smallint,
  uuid,
  integer
)
  from public, anon, authenticated;
revoke all on function public.finalize_multiplayer_submission_internal(
  uuid,
  public.multiplayer_submission_status,
  text,
  text,
  numeric,
  integer
) from public, anon, authenticated;

grant execute on function public.get_multiplayer_judge_payload_internal(uuid)
  to service_role;
grant execute on function public.acquire_multiplayer_submission_lease_internal(uuid, uuid, integer)
  to service_role;
grant execute on function public.claim_stale_multiplayer_submission_internal(uuid, integer, integer)
  to service_role;
grant execute on function public.record_multiplayer_submission_job_error_internal(uuid, uuid, text)
  to service_role;
grant execute on function public.mark_multiplayer_submission_running_internal(
  uuid,
  text,
  text,
  smallint,
  uuid,
  integer
)
  to service_role;
grant execute on function public.finalize_multiplayer_submission_internal(
  uuid,
  public.multiplayer_submission_status,
  text,
  text,
  numeric,
  integer
) to service_role;

commit;
