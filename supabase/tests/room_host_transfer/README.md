# Regressões PostgreSQL: transferência de host e Pronto

Execute `npm run test:rooms:postgres` na raiz do projeto. É necessário Docker
local em execução e a imagem `postgres:17` já disponível. O script falha
explicitamente se esses requisitos não estiverem disponíveis; não faz download.

O runner cria um contêiner descartável com armazenamento temporário em memória,
sem rede, portas publicadas ou volumes do projeto. Não aceita URL de banco,
não lê `.env`, não usa o contexto Docker ativo e não acessa o Supabase.
Remove apenas o contêiner que ele próprio criou ao terminar.

Aplica as migrations anteriores ao A1 e reproduz a saída deixando a sala sem host:
`current_role` resolve para o papel SQL da sessão, impedindo a promoção. Em seguida,
renomeia somente essa variável em uma transação de teste, reproduz a violação
`room_members_one_host_per_room_idx` e verifica o rollback. Essa alteração de teste
é revertida. Aplica a migration A1, reproduz o erro `42804` de Pronto, aplica a
migration de tipagem e executa as regressões dos dois fluxos:

- Saída do host em waiting, ready e starting, mantendo exatamente o sucessor.
- Expiração de convites pendentes e preservação dos convites aceitos.
- Permissões do novo host e rejeição das ações do antigo host.
- Novo convite, aceitação, reset de ready, countdown e kick após a transferência.
- Saída do último integrante e saída de um player comum.
- Falha injetada na promoção, verificando rollback da exclusão do host.
- Autenticação, membership, grants e bloqueio de saída durante partida.
- Preservação do cancelamento de quick match e dos tickets da fila.
- Saídas simultâneas de host/player em duas sessões reais via `dblink` local:
  verifica espera pelo lock, visibilidade transacional e cancelamento final.
- Pronto/desmarcar/repetir para host e player, em ambas as ordens e modalidades.
- Sala personalizada: dois prontos deixam a sala ready; somente o host inicia
  countdown. Desmarcar antes do countdown retorna a waiting.
- Partida rápida: dois prontos iniciam countdown automaticamente; chamada de
  início manual continua proibida. Um participante sozinho nunca inicia.
- Restrições em starting, in_match, finished e cancelled; usuário ausente,
  sala inexistente, não membro, grants e preservação dos dados em chamadas negadas.
- Retorno da RPC correspondente à sala persistida no banco.

As chamadas às RPCs usam o papel `authenticated`; as fixtures usam o proprietário
do banco descartável. `auth.uid()` usa identidades sintéticas. O transporte
Realtime é um stub, portanto os testes não validam entrega de eventos ou JWTs
reais. As migrations, índices, constraints, RLS e triggers do produto são
carregados integralmente. As fixtures de cada cenário são revertidas.

## Investigação e correção de `42804`

No commit base `568a071`, existem duas definições de `set_room_ready`:

| Migration | Definição |
| --- | --- |
| `20260814000000_multiplayer_rooms.sql`, linha 442 | Original, sem distinção de modalidade. |
| `20260814010000_quick_matchmaking.sql`, linha 614 | Vigente no commit base: acrescenta countdown automático para quick_match. |
| `20261013010000_fix_set_room_ready_status_type.sql` | Nova substituição incremental, preservando a lógica da definição vigente. |

As migrations de batalhas, lease de workers e A1 não redefinem essa RPC. Nenhuma
migration anterior foi editada.

O PostgreSQL resolve `CASE ... THEN 'ready' ELSE 'waiting' END` como `text`, pois
ambos os literais começam sem tipo definido. Atribuir essa expressão à coluna
enum `public.room_status` causa `42804`: não há conversão automática adequada
nessa atribuição. A atribuição direta de `'starting'` no ramo quick_match recebe
o tipo da coluna e não sofre desse problema.

A nova migration tipa os dois resultados do CASE como `public.room_status`.
Não altera contagem de integrantes, regras de modalidade, locks, assinatura,
retorno, permissões ou tratamento de erros.

`ready.sql` comprova os tipos com `pg_typeof`, reproduz `42804` antes da correção
e verifica rollback ao marcar e desmarcar nas duas modalidades. Depois da nova
migration, executa as transições pelas RPCs reais, como `authenticated`.
Os testes A1 também passaram a preparar ready pela RPC; não há fallback para
mascarar `42804`. Fixtures diretas permanecem apenas para modalidade, quantidade
de integrantes e estados bloqueados que não pertencem ao fluxo de Pronto.

Ainda é necessária validação de concorrência para host saindo simultaneamente a
ready, kick ou aceitação de convite, além do fluxo em dois navegadores com
Realtime. A cobertura de concorrência de saída dupla não comprova ausência de
deadlocks nessas outras combinações.
