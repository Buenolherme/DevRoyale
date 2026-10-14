# Regressão A1: transferência de host

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
é revertida. Depois aplica a nova migration e executa os cenários de regressão:

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

As chamadas às RPCs usam o papel `authenticated`; as fixtures usam o proprietário
do banco descartável. `auth.uid()` usa identidades sintéticas. O transporte
Realtime é um stub, portanto os testes não validam entrega de eventos ou JWTs
reais. As migrations, índices, constraints, RLS e triggers do produto são
carregados integralmente. As fixtures de cada cenário são revertidas.

Limitação encontrada no PostgreSQL 17: a RPC existente `set_room_ready` falha com
SQLSTATE `42804`, porque seu `CASE` retorna `text` para a coluna `room_status`.
A suíte reporta esse erro separadamente como `KNOWN ISSUE`. Os estados ready são
preparados diretamente nas fixtures para testar saída, reset, countdown e kick.
Isso não equivale a validar o fluxo ready ponta a ponta. A correção dessa outra
RPC não faz parte da migration A1.

Ainda é necessária validação de concorrência para host saindo simultaneamente a
ready, kick ou aceitação de convite, além do fluxo em dois navegadores com
Realtime. A cobertura de concorrência de saída dupla não comprova ausência de
deadlocks nessas outras combinações.
