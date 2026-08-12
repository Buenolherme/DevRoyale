import type { BattleHints } from '@/types'

export const battleHintsByChallengeId: Record<string, BattleHints> = {
  'python-never-hello': [
    'O terminal só precisa receber uma única mensagem de texto.',
    'Em Python, a função print exibe valores no terminal.',
    'Chame print passando a mensagem exatamente como foi solicitada, incluindo pontuação.',
  ],
  'python-beginner-reverse': [
    'Pense em percorrer os caracteres começando pelo final da palavra.',
    'Você pode usar fatiamento, reversed ou construir o resultado com um loop.',
    'Retorne uma nova string formada pelos caracteres de texto na ordem inversa.',
  ],
  'python-beginner-sum': [
    'Os dois valores necessários já chegam pelos parâmetros da função.',
    'Use uma operação de adição entre numero_a e numero_b.',
    'Calcule a soma dentro da função e devolva esse resultado com return.',
  ],
  'python-basic-vowels': [
    'Analise cada caractere depois de neutralizar maiúsculas e minúsculas.',
    'Uma coleção com a, e, i, o e u ajuda a testar cada letra.',
    'Percorra o texto em minúsculas, conte letras presentes nas vogais e retorne o total.',
  ],
  'python-intermediate-frequency': [
    'Cada palavra pode funcionar como uma chave de contagem.',
    'Separe a frase, normalize as palavras e acumule ocorrências em um dicionário.',
    'Para cada palavra em frase.lower().split(), incremente sua chave e retorne o dicionário.',
  ],
  'javascript-never-hello': [
    'O console precisa receber apenas a mensagem pedida.',
    'Em JavaScript, console.log exibe valores no console.',
    'Chame console.log com o texto exato, preservando vírgula e exclamação.',
  ],
  'javascript-beginner-double': [
    'Dobrar significa obter duas vezes o valor recebido.',
    'Multiplicação por 2 ou soma do número com ele mesmo resolvem o cálculo.',
    'Dentro de dobrar, calcule o dobro de numero e devolva o resultado.',
  ],
  'javascript-beginner-greeting': [
    'A saudação precisa combinar uma parte fixa com o nome recebido.',
    'Template strings ou concatenação permitem inserir nome no texto.',
    'Monte “Olá, ”, o valor de nome e “!”, e retorne a string completa.',
  ],
  'javascript-basic-unique': [
    'Você precisa manter somente a primeira representação de cada valor.',
    'Set elimina repetições; filter com controle auxiliar também funciona.',
    'Crie uma nova coleção única a partir de valores e converta-a novamente para array.',
  ],
  'javascript-intermediate-cart': [
    'O subtotal de cada item depende de duas propriedades.',
    'Multiplique preco por quantidade e acumule os subtotais.',
    'Percorra todos os itens, some cada preco vezes quantidade e retorne o total final.',
  ],
  'sql-never-hello': [
    'Uma consulta pode retornar um valor literal sem acessar tabela alguma.',
    'SELECT também aceita uma string diretamente na lista de retorno.',
    'Selecione apenas o texto solicitado, mantendo exatamente sua pontuação.',
  ],
  'sql-beginner-active-users': [
    'Primeiro identifique as colunas de saída e depois aplique o filtro.',
    'A condição pertence à cláusula WHERE da tabela usuarios.',
    'Selecione nome e email de usuarios e mantenha somente linhas com ativo igual a 1.',
  ],
  'sql-beginner-products': [
    'A ordenação acontece depois da escolha da tabela.',
    'ORDER BY organiza a coluna nome; ASC representa ordem crescente.',
    'Selecione nome em produtos e ordene essa mesma coluna do menor para o maior.',
  ],
  'sql-basic-category-count': [
    'A contagem precisa ser calculada separadamente para cada categoria.',
    'Combine COUNT com GROUP BY sobre categoria.',
    'Retorne categoria, conte suas linhas com o alias quantidade e agrupe pela categoria.',
  ],
  'sql-intermediate-orders': [
    'O cliente de cada pedido é identificado por uma chave relacionada.',
    'Um JOIN conecta pedidos.cliente_id a clientes.id.',
    'Relacione pedidos e clientes pelas chaves, então retorne id, nome do cliente e total.',
  ],
  'html-css-never-hello': [
    'O conteúdo pedido é o título mais importante da página.',
    'O título principal de HTML usa o elemento h1.',
    'Crie um h1 e coloque dentro dele somente o texto exato do desafio.',
  ],
  'html-css-beginner-button': [
    'A classe do botão conecta o elemento às regras de estilo.',
    'No seletor battle-button, defina fundo, cor do texto e padding.',
    'Mantenha o texto no button e aplique à classe um fundo vermelho, texto branco e espaçamento interno.',
  ],
  'html-css-beginner-card': [
    'Separe o nome e o nível em elementos com hierarquia própria.',
    'Use h2 e p dentro de profile-card e estilize o contorno do card.',
    'Inclua os dois textos na div e defina border, border-radius e padding para o card.',
  ],
  'html-css-basic-grid': [
    'A quantidade de colunas deve reagir ao espaço disponível.',
    'CSS Grid com repeat, auto-fit e minmax cria colunas automáticas.',
    'Transforme challenge-grid em grid, use colunas responsivas com mínimo de 180px e gap de 16px.',
  ],
  'html-css-intermediate-form': [
    'A identificação de cada campo depende da ligação entre dois atributos.',
    'O for de cada label deve coincidir com o id do input correspondente.',
    'Crie os pares label/input de nome e email, adicione o botão e organize contact-form em coluna com gap.',
  ],
  'battle-v1-python-never-1': [
    'A mensagem final combina um nome armazenado com um texto fixo.',
    'Guarde Luna em nome e use interpolação para montar a saudação.',
    'Crie nome, forme “Olá, Luna!” com seu valor e envie o resultado para print.',
  ],
  'battle-v1-python-never-2': [
    'O dobro de 7 corresponde a duas vezes esse valor.',
    'Use uma variável para o número e outra para o cálculo por 2.',
    'Armazene 7, calcule seu dobro e mostre o valor numérico 14.',
  ],
  'battle-v1-python-basic-1': [
    'Nem todo número recebido deve participar da soma.',
    'Filtre valores maiores que zero antes de acumular.',
    'Percorra numeros, considere apenas numero > 0, some esses valores e retorne o total.',
  ],
  'battle-v1-python-basic-2': [
    'O comprimento de cada nome decide se ele permanece na resposta.',
    'len permite comparar a quantidade de caracteres com o limite mínimo.',
    'Crie uma nova lista contendo, na mesma ordem, apenas nomes cujo len seja pelo menos 3.',
  ],
  'battle-v1-python-intermediate-1': [
    'Cada palavra deve apontar para o número de vezes em que apareceu.',
    'Um dicionário pode iniciar chaves ausentes em zero e incrementá-las.',
    'Percorra palavras, atualize a contagem de cada chave em resultado e retorne o dicionário.',
  ],
  'battle-v1-python-intermediate-2': [
    'A lista vazia precisa ser tratada antes da divisão.',
    'A média é a soma dividida pela quantidade, mas zero elementos exigem retorno antecipado.',
    'Retorne 0 quando valores estiver vazio; caso contrário, divida a soma por len(valores).',
  ],
  'battle-v1-python-advanced-1': [
    'Visite o nó atual antes de avançar para seus descendentes.',
    'A mesma função pode processar recursivamente cada item de children.',
    'Comece com o name atual, percorra children e estenda a lista com o resultado recursivo de cada filho.',
  ],
  'battle-v1-python-advanced-2': [
    'As coroutines devem avançar juntas, não uma depois da outra.',
    'asyncio.gather reúne tarefas concorrentes e preserva a ordem dos resultados.',
    'Dentro da função assíncrona, aguarde gather recebendo todas as coroutines desempacotadas.',
  ],
  'battle-v1-python-advanced-3': [
    'Fibonacci repete muitos cálculos para os mesmos argumentos.',
    'Use recursão com casos-base 0 e 1 e um cache limitado.',
    'Aplique cache com limite 128 à função; para n menor que 2 retorne n, senão combine os dois termos anteriores.',
  ],
  'battle-v1-javascript-never-1': [
    'A saída combina uma constante de nome com uma saudação.',
    'Template strings inserem o valor de nome entre partes fixas.',
    'Declare nome como Luna, monte “Olá, Luna!” e envie a string ao console.',
  ],
  'battle-v1-javascript-never-2': [
    'O triplo é obtido usando três vezes o valor original.',
    'Multiplique a constante numero por 3 e armazene o resultado.',
    'Declare numero como 6, calcule triplo e mostre o valor 18 com console.log.',
  ],
  'battle-v1-javascript-basic-1': [
    'A propriedade que distingue pares é o resto da divisão.',
    'filter pode manter somente valores cujo módulo por 2 seja zero.',
    'Aplique filter em numeros, teste numero % 2 contra zero e retorne o novo array.',
  ],
  'battle-v1-javascript-basic-2': [
    'Cada item contribui com sua propriedade preco para o total.',
    'reduce pode acumular os preços começando em zero.',
    'Percorra itens com reduce, adicione item.preco ao acumulador e retorne o total.',
  ],
  'battle-v1-javascript-intermediate-1': [
    'Cada categoria deve se tornar uma chave contendo seus produtos.',
    'Em reduce, crie o array da categoria somente quando ele ainda não existir.',
    'Acumule um objeto, inicialize grupos[categoria], adicione o produto e devolva o acumulador.',
  ],
  'battle-v1-javascript-intermediate-2': [
    'A resposta HTTP precisa ser verificada antes da leitura do conteúdo.',
    'Use await na requisição e consulte resposta.ok para decidir o fallback.',
    'Aguarde fetch; retorne array vazio quando a resposta falhar e o JSON quando estiver válida.',
  ],
  'battle-v1-javascript-advanced-1': [
    'Divida as tarefas em grupos que respeitem o limite de concorrência.',
    'Promise.all pode executar cada lote de até duas tarefas em paralelo.',
    'Avance pelo array de duas em duas, aguarde cada lote e acumule os resultados na ordem.',
  ],
  'battle-v1-javascript-advanced-2': [
    'O cache precisa existir entre chamadas do wrapper.',
    'Use um Map no closure e transforme os argumentos em uma chave estável.',
    'Ao chamar o wrapper, calcule apenas chaves ausentes; armazene e retorne o valor correspondente.',
  ],
  'battle-v1-javascript-advanced-3': [
    'A requisição precisa receber um sinal que possa ser cancelado.',
    'AbortController fornece o signal e setTimeout pode acionar abort.',
    'Crie controller e timer, passe o signal ao fetch e sempre limpe o timer ao finalizar.',
  ],
  'battle-v1-html-css-never-1': [
    'Agrupe o título e a descrição em um elemento com significado de seção.',
    'Use section contendo um h1 e um p, cada um com seu texto.',
    'Crie a seção, coloque “Arena” no título principal e “Treine seu código” no parágrafo.',
  ],
  'battle-v1-html-css-never-2': [
    'Links combinam um destino com o texto visível.',
    'O atributo href define para onde a tag a navega.',
    'Crie um elemento a com texto “Estudar” e href apontando exatamente para /estudos.',
  ],
  'battle-v1-html-css-basic-1': [
    'Os três artigos já podem compartilhar o mesmo container.',
    'display flex organiza os filhos em linha e gap cria o espaço.',
    'Aplique display flex e gap de 16px à classe cards, preservando os três article.',
  ],
  'battle-v1-html-css-basic-2': [
    'Tecnologias assistivas precisam relacionar o nome do campo ao input.',
    'Use o mesmo identificador em for da label e id do input.',
    'Dentro do form, associe a label ao input email e defina type e name como email.',
  ],
  'battle-v1-html-css-intermediate-1': [
    'As colunas precisam se repetir conforme a largura disponível.',
    'auto-fit e minmax permitem um mínimo de 220px com expansão flexível.',
    'Use grid, repita colunas responsivas com mínimo 220px e mantenha gap de 16px.',
  ],
  'battle-v1-html-css-intermediate-2': [
    'O título do modal deve ser identificável pelo próprio dialog.',
    'aria-labelledby aponta para o id do elemento que nomeia o dialog.',
    'Crie dialog aberto, ligue-o ao h2 modal-title e inclua o texto de conclusão.',
  ],
  'battle-v1-html-css-advanced-1': [
    'A ordem das camadas deve ser declarada antes das regras nelas contidas.',
    'Separe o reset do estilo do componente usando dois blocos @layer.',
    'Declare reset antes de components, normalize o button no reset e estilize .button em components.',
  ],
  'battle-v1-html-css-advanced-2': [
    'A consulta observa a largura do container, não da janela.',
    'O pai precisa de container-type antes do bloco @container.',
    'Defina wrapper como container inline e, a partir de 500px, transforme card em grid de duas colunas.',
  ],
  'battle-v1-html-css-advanced-3': [
    'A animação deve ter uma alternativa sem movimento.',
    'Crie keyframes e sobrescreva animation dentro de prefers-reduced-motion.',
    'Aplique a animação em pulse e, na media query reduce, defina animation como none.',
  ],
  'battle-v1-sql-never-1': [
    'A saída deve conter somente duas colunas da tabela indicada.',
    'Liste name e level depois de SELECT e players depois de FROM.',
    'Selecione exatamente name e level da tabela players.',
  ],
  'battle-v1-sql-never-2': [
    'A condição precisa manter somente registros ativos.',
    'Use WHERE para comparar active com o valor booleano verdadeiro.',
    'Selecione as colunas de players e filtre active igual a TRUE.',
  ],
  'battle-v1-sql-basic-1': [
    'Conte linhas dentro de cada grupo de categoria.',
    'GROUP BY separa categorias e ORDER BY pode usar o alias da contagem.',
    'Retorne category e COUNT como total, agrupe por category e ordene total de forma decrescente.',
  ],
  'battle-v1-sql-basic-2': [
    'As duas tabelas compartilham a identificação do cliente.',
    'Conecte customers.id com orders.customer_id em um JOIN.',
    'Relacione orders a customers e retorne apenas o id do pedido e o name do cliente.',
  ],
  'battle-v1-sql-intermediate-1': [
    'O ranking reinicia quando a equipe muda.',
    'PARTITION BY separa equipes dentro da janela de RANK.',
    'Aplique RANK sobre cada team_id, ordene score em ordem decrescente e nomeie a posição.',
  ],
  'battle-v1-sql-intermediate-2': [
    'Calcule os totais primeiro e filtre o resultado em uma segunda etapa.',
    'Uma CTE pode agrupar order_items por order_id antes do SELECT externo.',
    'Na CTE, some price vezes quantity por pedido; depois mantenha somente totais acima de 100.',
  ],
  'battle-v1-sql-advanced-1': [
    'A consulta precisa de um caso inicial e outro que avance pelos filhos.',
    'WITH RECURSIVE permite unir a categoria 1 aos nós cujo parent_id já foi encontrado.',
    'Inicie com id 1, una descendentes por parent_id e selecione a árvore produzida pela CTE.',
  ],
  'battle-v1-sql-advanced-2': [
    'A mediana representa o percentil localizado no meio da distribuição.',
    'PERCENTILE_CONT usa 0.5 e ordena os valores dentro do próprio cálculo.',
    'Calcule o percentil contínuo 0.5 de score, dê o alias median e use a tabela matches.',
  ],
  'battle-v1-sql-advanced-3': [
    'A mesma chave pode exigir inserção ou atualização.',
    'ON CONFLICT identifica player_id e EXCLUDED oferece o valor proposto.',
    'Insira o tema dark para o jogador 1 e, no conflito de player_id, atualize theme com EXCLUDED.theme.',
  ],
}

export function getBattleHints(challengeId: string): BattleHints | undefined {
  return battleHintsByChallengeId[challengeId]
}
