import type {
  StudyLearningPath,
  StudyLesson,
  StudyLevelId,
  StudyResourceLink,
  StudyTopicId,
} from '@/types'

interface LessonSeed {
  slug: string
  title: string
  theme: string
  concept: string
  analogy: string
  language: string
  code: string
  activity: string
  pitfall: string
}

interface PathSeed {
  topicId: StudyTopicId
  levelId: StudyLevelId
  lessons: [LessonSeed, LessonSeed, LessonSeed]
}

const topicLabels: Record<StudyTopicId, string> = {
  logic: 'Lógica de Programação',
  python: 'Python',
  javascript: 'JavaScript',
  'html-css': 'HTML/CSS',
  sql: 'SQL',
  'git-github': 'Git/GitHub',
  frontend: 'Frontend',
  backend: 'Backend',
}

const levelLabels: Record<StudyLevelId, string> = {
  'never-coded': 'Nunca programei',
  basic: 'Básico',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
}

const levelGoals: Record<StudyLevelId, string> = {
  'never-coded': 'construir vocabulário e confiança a partir de exemplos pequenos',
  basic: 'praticar fundamentos até conseguir prever o resultado do código',
  intermediate: 'organizar soluções, comparar alternativas e lidar com falhas',
  advanced: 'avaliar arquitetura, manutenção, desempenho e decisões de longo prazo',
}

const officialResources: Record<StudyTopicId, StudyResourceLink> = {
  logic: {
    title: 'CS50x — Harvard',
    description: 'Fundamentos de pensamento computacional e resolução de problemas.',
    url: 'https://cs50.harvard.edu/x/',
  },
  python: {
    title: 'Tutorial oficial de Python',
    description: 'Referência mantida pelo projeto Python.',
    url: 'https://docs.python.org/pt-br/3/tutorial/',
  },
  javascript: {
    title: 'Guia JavaScript — MDN',
    description: 'Guia de linguagem mantido pela comunidade MDN.',
    url: 'https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Guide',
  },
  'html-css': {
    title: 'Aprenda desenvolvimento web — MDN',
    description: 'Material de HTML, CSS, acessibilidade e layout.',
    url: 'https://developer.mozilla.org/pt-BR/docs/Learn_web_development',
  },
  sql: {
    title: 'Tutorial PostgreSQL',
    description: 'Introdução oficial a consultas e bancos relacionais.',
    url: 'https://www.postgresql.org/docs/current/tutorial.html',
  },
  'git-github': {
    title: 'Pro Git',
    description: 'Livro oficial e gratuito sobre Git e colaboração.',
    url: 'https://git-scm.com/book/pt-br/v2',
  },
  frontend: {
    title: 'Learn web development — web.dev',
    description: 'Guias sobre interfaces, desempenho e acessibilidade.',
    url: 'https://web.dev/learn/',
  },
  backend: {
    title: 'HTTP — MDN',
    description: 'Referência para entender comunicação entre clientes e servidores.',
    url: 'https://developer.mozilla.org/pt-BR/docs/Web/HTTP',
  },
}

function l(
  slug: string,
  title: string,
  theme: string,
  concept: string,
  analogy: string,
  language: string,
  code: string,
  activity: string,
  pitfall: string,
): LessonSeed {
  return { slug, title, theme, concept, analogy, language, code, activity, pitfall }
}

const pathSeeds: PathSeed[] = [
  {
    topicId: 'logic', levelId: 'never-coded', lessons: [
      l('inputs-outputs', 'Entradas, passos e resultados', 'Entrada, processamento e saída', 'Todo algoritmo recebe informações, executa passos em uma ordem definida e produz um resultado observável. Separar essas três partes ajuda a explicar uma solução antes de escolher qualquer linguagem.', 'É como uma cozinha: ingredientes entram, a receita transforma e o prato pronto sai.', 'pseudocode', 'LER nome\nCRIAR saudacao com "Olá, " + nome\nMOSTRAR saudacao', 'Descreva em pseudocódigo como receber uma idade e informar o próximo aniversário.', 'Começar a escrever passos sem definir qual dado entra e qual resultado deve sair.'),
      l('simple-variables', 'Guardando informações durante o algoritmo', 'Variáveis e atualização de estado', 'Uma variável representa uma informação que pode ser consultada ou atualizada durante a execução. O nome deve revelar o significado do valor e cada atualização precisa ter um motivo claro.', 'Uma variável é um placar: o nome identifica o jogo e o número muda quando algo acontece.', 'pseudocode', 'DEFINIR pontos como 10\nSOMAR 5 a pontos\nMOSTRAR pontos', 'Monte um placar que começa em zero, recebe duas pontuações e mostra o total.', 'Tratar o nome da variável como se fosse o próprio valor armazenado.'),
      l('first-decisions', 'Decidindo entre dois caminhos', 'Condições verdadeiras e falsas', 'Condições permitem que o algoritmo escolha um caminho conforme uma pergunta objetiva. Uma boa condição pode ser respondida com verdadeiro ou falso e deixa explícito o que acontece em cada caso.', 'É como uma catraca que abre quando o ingresso é válido e orienta o visitante quando não é.', 'pseudocode', 'SE energia >= 50\n  MOSTRAR "Pronto"\nSENAO\n  MOSTRAR "Recarregue"', 'Crie uma decisão que aprove uma senha com pelo menos oito caracteres.', 'Escrever uma condição vaga que não pode ser verificada de forma objetiva.'),
    ],
  },
  {
    topicId: 'logic', levelId: 'basic', lessons: [
      l('controlled-loops', 'Repetições com começo e fim', 'Laços e condição de parada', 'Um laço repete um conjunto de passos enquanto uma condição permite. Para evitar repetição infinita, defina estado inicial, atualização e condição de parada antes de executar.', 'É um treino de voltas: você conta cada volta e encerra ao alcançar a meta.', 'pseudocode', 'DEFINIR volta como 1\nENQUANTO volta <= 3\n  MOSTRAR volta\n  SOMAR 1 a volta', 'Escreva uma contagem regressiva de cinco até um e mostre uma mensagem final.', 'Criar um laço sem atualizar a informação usada na condição de parada.'),
      l('truth-tables', 'Combinando regras sem adivinhar', 'Operadores E, OU e NÃO', 'Operadores lógicos combinam condições menores. E exige que todas sejam verdadeiras, OU aceita ao menos uma e NÃO inverte o resultado; tabelas simples evitam interpretações erradas.', 'Pense em chaves de uma porta: algumas precisam girar juntas, enquanto outras abrem caminhos alternativos.', 'pseudocode', 'SE tem_convite E idade >= 18\n  MOSTRAR "Entrada liberada"\nSENAO\n  MOSTRAR "Verifique os requisitos"', 'Crie uma regra que permita desconto para estudante ou pessoa com mais de 60 anos.', 'Misturar E e OU sem deixar clara a prioridade das comparações.'),
      l('reusable-steps', 'Dando nome a um conjunto de passos', 'Funções e parâmetros', 'Uma função agrupa uma tarefa com nome, entradas e resultado. Ela reduz repetição quando executa uma responsabilidade clara e pode ser testada com valores diferentes.', 'É uma ferramenta da oficina: recebe uma peça, executa uma operação conhecida e devolve o resultado.', 'pseudocode', 'FUNCAO dobro(numero)\n  RETORNAR numero * 2\nFIM\nMOSTRAR dobro(6)', 'Defina uma função que receba preço e desconto e devolva o valor final.', 'Criar uma função que altera muitas coisas e não deixa claro qual resultado entrega.'),
    ],
  },
  {
    topicId: 'logic', levelId: 'intermediate', lessons: [
      l('decomposition', 'Dividindo problemas maiores', 'Decomposição e responsabilidades', 'Problemas extensos ficam mais previsíveis quando são divididos em partes com entrada e saída próprias. A decomposição permite testar cada regra isoladamente e localizar falhas sem revisar o fluxo inteiro.', 'É como organizar uma equipe de arena: cada pessoa domina uma função e o resultado surge da coordenação.', 'pseudocode', 'dados = ler_cadastro()\nerros = validar(dados)\nSE erros vazio\n  salvar(dados)', 'Divida um fluxo de compra em pelo menos quatro funções com responsabilidades diferentes.', 'Separar o código por tamanho, mas manter responsabilidades misturadas entre as partes.'),
      l('defensive-validation', 'Validando antes de transformar', 'Pré-condições e casos inválidos', 'Uma solução robusta verifica se os dados atendem às condições necessárias antes de usá-los. Falhas esperadas devem gerar respostas claras, sem deixar o algoritmo em estado parcialmente atualizado.', 'É a inspeção de equipamento antes da batalha: problemas são encontrados antes de causar dano.', 'pseudocode', 'SE quantidade <= 0\n  RETORNAR "Quantidade inválida"\nSENAO\n  total = quantidade * preco', 'Liste entradas inválidas para uma divisão e escreva o fluxo que evita divisão por zero.', 'Validar somente o caso feliz e deixar valores vazios ou limites sem tratamento.'),
      l('complexity-intuition', 'Estimando o custo de uma solução', 'Crescimento e quantidade de operações', 'Dois algoritmos podem produzir o mesmo resultado e consumir esforços muito diferentes. Contar como o trabalho cresce com a entrada ajuda a reconhecer buscas repetidas e laços aninhados desnecessários.', 'Procurar um nome em uma lista é diferente de consultar um índice organizado como o de um livro.', 'pseudocode', 'PARA cada item em itens\n  SE item.id = procurado\n    RETORNAR item\nRETORNAR nulo', 'Compare uma busca sequencial com uma consulta por chave e descreva quando cada uma faz sentido.', 'Otimizar sem medir ou ignorar que laços aninhados multiplicam o trabalho.'),
    ],
  },
  {
    topicId: 'logic', levelId: 'advanced', lessons: [
      l('invariants', 'Protegendo regras que sempre devem valer', 'Invariantes e consistência', 'Uma invariante descreve uma verdade que precisa permanecer válida antes e depois de uma operação. Registrar essas regras orienta validações, testes e decisões quando vários estados podem mudar juntos.', 'É a regra da arena de que o placar nunca pode ficar negativo, independentemente da jogada.', 'pseudocode', 'FUNCAO gastar(saldo, valor)\n  EXIGIR valor > 0\n  EXIGIR saldo >= valor\n  RETORNAR saldo - valor', 'Defina três invariantes para um carrinho de compras e indique onde verificá-las.', 'Tratar uma regra essencial apenas como comentário sem validá-la nas operações.'),
      l('state-machines', 'Modelando mudanças de estado', 'Máquinas de estado e transições', 'Uma máquina de estados enumera situações válidas e quais transições podem ocorrer entre elas. Esse modelo evita combinações impossíveis e torna fluxos complexos mais fáceis de testar.', 'Um torneio passa por inscrição, disputa e encerramento; não pode voltar à inscrição depois de premiado.', 'pseudocode', 'SE estado = "rascunho" E evento = "publicar"\n  estado = "publicado"\nSENAO\n  REJEITAR transicao', 'Modele os estados e transições de um pedido desde criação até entrega ou cancelamento.', 'Permitir qualquer mudança de estado sem conferir a situação atual e o evento recebido.'),
      l('tradeoffs', 'Escolhendo estratégias com critérios', 'Trade-offs e tomada de decisão', 'Decisões técnicas equilibram simplicidade, tempo, memória, clareza e capacidade de mudança. Explicitar critérios evita escolher uma solução apenas por hábito ou por parecer sofisticada.', 'Escolher equipamento para uma missão depende do terreno; a arma mais pesada nem sempre é a melhor.', 'pseudocode', 'SE volume pequeno\n  usar busca simples\nSENAO SE muitas consultas\n  criar indice\nMEDIR resultado', 'Compare duas soluções para ordenar dados usando critérios de volume, clareza e frequência.', 'Declarar uma opção como melhor sem indicar cenário, restrições e evidências.'),
    ],
  },
  {
    topicId: 'python', levelId: 'never-coded', lessons: [
      l('execution-order', 'Como o Python executa comandos', 'Arquivo, interpretador e ordem', 'O interpretador lê o arquivo de cima para baixo e executa cada instrução válida. Entender essa ordem ajuda a prever resultados e perceber quando um nome é usado antes de ser criado.', 'É uma lista de missões: cada instrução é cumprida na ordem em que aparece.', 'python', 'mensagem = "Arena aberta"\nprint(mensagem)\nprint("Treino iniciado")', 'Troque a ordem das mensagens, execute novamente e explique a mudança na saída.', 'Usar uma variável em uma linha anterior àquela que cria o valor.'),
      l('print-values', 'Mostrando textos e números', 'print, strings e números', 'print envia valores para a saída e permite observar o comportamento do programa. Textos usam aspas; números podem participar de cálculos antes de serem exibidos.', 'É o painel da arena mostrando ao público o que acontece nos bastidores.', 'python', 'print("DevRoyale")\nprint(2 + 3)\nprint("XP:", 50)', 'Mostre seu nome, uma soma e uma frase acompanhada de um número.', 'Colocar uma conta entre aspas e esperar que o Python calcule o texto.'),
      l('named-values', 'Criando variáveis simples', 'Atribuição e nomes claros', 'A atribuição associa um nome a um valor para reutilização posterior. Nomes claros mostram a intenção e podem receber novos valores quando o estado do programa muda.', 'É etiquetar uma caixa para encontrar seu conteúdo sem precisar memorizar onde ele está.', 'python', 'dev = "Nina"\nxp = 20\nxp = xp + 10\nprint(dev, xp)', 'Crie variáveis para linguagem, nível e pontos; atualize os pontos e mostre tudo.', 'Confundir o sinal de atribuição com uma comparação de igualdade.'),
    ],
  },
  {
    topicId: 'python', levelId: 'basic', lessons: [
      l('conditionals', 'Condições que explicam a regra', 'if, elif e else', 'Condições escolhem blocos conforme comparações verdadeiras ou falsas. Organize primeiro o caso mais específico e mantenha a indentações consistente para revelar a estrutura.', 'É uma triagem que direciona cada participante para a fila adequada.', 'python', 'xp = 180\nif xp >= 200:\n    print("Ouro")\nelif xp >= 100:\n    print("Prata")\nelse:\n    print("Bronze")', 'Crie uma classificação de notas com três faixas e teste os valores de limite.', 'Ordenar as condições de forma que um caso amplo esconda um caso mais específico.'),
      l('loops', 'Percorrendo uma sequência', 'for, range e repetição', 'O laço for visita cada item de uma sequência sem controlar índices manualmente. range cria sequências numéricas úteis para repetições conhecidas e evita copiar instruções.', 'É um treinador chamando cada participante da fila uma vez.', 'python', 'for rodada in range(1, 4):\n    print(f"Rodada {rodada}")\nprint("Fim")', 'Percorra números de um a cinco e mostre apenas o dobro de cada um.', 'Esperar que o limite final de range seja incluído na sequência.'),
      l('lists', 'Organizando vários valores', 'Listas, índices e métodos', 'Listas guardam valores em ordem e podem crescer ou diminuir. Índices começam em zero; percorrer a lista costuma ser mais seguro do que acessar posições que talvez não existam.', 'É uma fila numerada em que a primeira posição recebe o número zero.', 'python', 'linguagens = ["Python", "SQL"]\nlinguagens.append("JavaScript")\nfor linguagem in linguagens:\n    print(linguagem)', 'Monte uma lista de três tarefas, adicione outra e mostre todas com um laço.', 'Acessar um índice maior ou igual ao tamanho da lista.'),
    ],
  },
  {
    topicId: 'python', levelId: 'intermediate', lessons: [
      l('functions', 'Funções pequenas e previsíveis', 'Parâmetros, retorno e responsabilidade', 'Funções encapsulam regras e devolvem resultados que podem ser combinados. Prefira entradas explícitas, retorno claro e evite depender de variáveis externas sem necessidade.', 'É uma máquina com entradas conhecidas e uma saída verificável.', 'python', 'def calcular_bonus(xp, taxa):\n    return xp * taxa\n\nbonus = calcular_bonus(200, 0.1)\nprint(bonus)', 'Crie uma função que receba preço e percentual de desconto e retorne o total.', 'Imprimir dentro da função quando o chamador precisa receber e reutilizar o resultado.'),
      l('dictionaries', 'Dados nomeados com dicionários', 'Chaves, valores e acesso seguro', 'Dicionários relacionam chaves únicas a valores e representam entidades com campos nomeados. get permite fornecer um padrão quando a chave pode não existir.', 'É uma ficha de personagem: cada campo tem um nome e um valor correspondente.', 'python', 'dev = {"nome": "Ivo", "xp": 90}\ndev["xp"] += 10\nlinguagem = dev.get("linguagem", "não definida")\nprint(dev["xp"], linguagem)', 'Crie um dicionário de projeto, atualize um campo e consulte outro com valor padrão.', 'Acessar diretamente uma chave opcional e provocar KeyError.'),
      l('exceptions', 'Tratando falhas esperadas', 'try, except e mensagens úteis', 'Exceções representam falhas durante a execução. Capture apenas erros que sabe tratar e devolva orientação útil, sem esconder problemas inesperados com um except amplo.', 'É uma rede de proteção específica para um salto conhecido, não um tapete cobrindo toda a arena.', 'python', 'entrada = "dez"\ntry:\n    quantidade = int(entrada)\nexcept ValueError:\n    print("Digite um número inteiro")', 'Converta uma entrada para número e trate texto inválido com uma mensagem clara.', 'Usar except sem indicar o tipo de erro e silenciar defeitos não previstos.'),
    ],
  },
  {
    topicId: 'python', levelId: 'advanced', lessons: [
      l('code-organization', 'Organizando domínio e infraestrutura', 'Camadas e dependências', 'Código sustentável separa regras do domínio de detalhes como arquivos, rede e banco. Dependências apontando para contratos simples facilitam testes e substituições.', 'As regras do torneio não devem depender do modelo do placar eletrônico usado naquele dia.', 'python', 'class Repositorio:\n    def salvar(self, item): ...\n\ndef registrar(item, repositorio):\n    validar(item)\n    repositorio.salvar(item)', 'Separe uma regra de cadastro da função que grava os dados em arquivo.', 'Misturar validação, persistência e apresentação dentro da mesma função.'),
      l('modules', 'Módulos com fronteiras claras', 'Imports e API pública', 'Módulos agrupam responsabilidades relacionadas e expõem apenas operações necessárias. Imports previsíveis evitam ciclos e deixam explícita a direção das dependências.', 'É uma guilda que oferece serviços conhecidos sem expor cada detalhe interno.', 'python', 'from dominio.pontuacao import calcular_nivel\n\ndef exibir_nivel(xp):\n    nivel = calcular_nivel(xp)\n    return f"Nível {nivel}"', 'Divida um pequeno programa em módulo de cálculo e módulo de apresentação.', 'Criar módulos por conveniência de tamanho sem definir uma responsabilidade coerente.'),
      l('quality-project', 'Fechando um pequeno projeto com qualidade', 'Testes, tipos e observabilidade', 'Um projeto confiável combina comportamento testável, tipos úteis, mensagens de erro e registros proporcionais ao risco. Qualidade é tornar mudanças seguras, não apenas aumentar a quantidade de ferramentas.', 'É revisar equipamento, mapa e comunicação antes de liberar a missão.', 'python', 'def normalizar_nome(nome: str) -> str:\n    valor = nome.strip()\n    if not valor:\n        raise ValueError("nome vazio")\n    return valor.title()', 'Implemente uma função validada, escreva três casos de teste e documente a decisão.', 'Adicionar ferramentas de qualidade sem definir quais riscos elas devem reduzir.'),
    ],
  },
  {
    topicId: 'javascript', levelId: 'never-coded', lessons: [
      l('console', 'Seu primeiro comando no JavaScript', 'Execução e console', 'O console permite executar instruções e observar valores imediatamente. Comandos são avaliados em ordem, e erros indicam a linha em que a execução perdeu o caminho.', 'É a cabine de testes onde cada comando produz uma resposta visível.', 'javascript', 'console.log("Arena aberta");\nconsole.log(4 + 6);', 'Mostre duas mensagens e o resultado de uma multiplicação no console.', 'Colocar a operação entre aspas e receber texto em vez de resultado numérico.'),
      l('values', 'Valores e variáveis com intenção', 'const, let e tipos primitivos', 'const cria um nome que não será reatribuído e let permite atualização consciente. Textos, números e booleanos têm comportamentos diferentes, por isso observe o tipo antes de combinar valores.', 'É escolher entre uma placa fixa e um placar que pode mudar durante a partida.', 'javascript', 'const nome = "Lia";\nlet xp = 10;\nxp += 5;\nconsole.log(nome, xp);', 'Crie const para nome e let para pontos; atualize os pontos duas vezes.', 'Usar let em todos os lugares e esconder quais valores deveriam permanecer estáveis.'),
      l('simple-choice', 'Respondendo a uma comparação', 'if, else e operadores', 'Uma comparação produz true ou false e controla qual bloco será executado. Use igualdade estrita e escreva condições que expressem diretamente a regra.', 'É uma cancela que consulta uma regra e abre apenas quando a resposta é verdadeira.', 'javascript', 'const energia = 70;\nif (energia >= 50) {\n  console.log("Pronto");\n} else {\n  console.log("Recarregue");\n}', 'Crie uma condição que informe se uma pessoa atingiu a idade mínima.', 'Usar = dentro da condição quando queria comparar valores.'),
    ],
  },
  {
    topicId: 'javascript', levelId: 'basic', lessons: [
      l('branching', 'Condições sem caminhos escondidos', 'Comparações e guard clauses', 'Condições claras tratam entradas inválidas cedo e deixam o fluxo principal visível. Evite níveis excessivos de aninhamento quando uma saída antecipada explica melhor a regra.', 'É barrar equipamentos inválidos na entrada para manter livre o caminho da inspeção principal.', 'javascript', 'function liberar(nivel) {\n  if (nivel < 1) return "inválido";\n  if (nivel >= 5) return "elite";\n  return "treino";\n}', 'Escreva uma função que classifique um valor vazio, negativo ou válido.', 'Aninhar vários if quando retornos antecipados tornariam o fluxo mais direto.'),
      l('iteration', 'Repetindo sobre coleções', 'for...of e acumuladores', 'for...of percorre os valores de uma coleção e um acumulador guarda o resultado parcial. Inicialize o acumulador com o elemento neutro adequado à operação.', 'É somar o placar rodada após rodada sem esquecer o total anterior.', 'javascript', 'const pontos = [10, 20, 15];\nlet total = 0;\nfor (const valor of pontos) {\n  total += valor;\n}\nconsole.log(total);', 'Some uma lista de preços e calcule a média ao final.', 'Iniciar o acumulador com um valor que altera indevidamente o resultado.'),
      l('array-tools', 'Transformando arrays', 'map, filter e imutabilidade', 'map cria uma coleção transformada e filter mantém itens aprovados por uma condição. Esses métodos comunicam intenção e evitam alterar o array original sem necessidade.', 'É uma linha de seleção: uma etapa transforma peças e outra deixa passar apenas as aprovadas.', 'javascript', 'const notas = [4, 7, 9];\nconst aprovadas = notas.filter((nota) => nota >= 7);\nconst dobradas = aprovadas.map((nota) => nota * 2);', 'Filtre produtos disponíveis e gere uma lista apenas com seus nomes.', 'Usar map quando queria remover itens, produzindo valores undefined no resultado.'),
    ],
  },
  {
    topicId: 'javascript', levelId: 'intermediate', lessons: [
      l('higher-order', 'Comportamentos recebidos por parâmetro', 'Callbacks e funções de alta ordem', 'Callbacks permitem parametrizar uma etapa de comportamento. Uma função de alta ordem deve deixar claro quando chama o callback e qual valor espera receber.', 'É contratar uma estratégia diferente para a mesma etapa de uma missão.', 'javascript', 'function processar(itens, transformar) {\n  return itens.map(transformar);\n}\nconst nomes = processar([{ nome: "Ana" }], (item) => item.nome);', 'Crie uma função que receba uma lista e uma regra de validação.', 'Passar o resultado de uma função quando a API espera receber a própria função.'),
      l('objects', 'Modelando entidades sem espalhar campos', 'Objetos, cópia e atualização', 'Objetos agrupam propriedades relacionadas. Ao atualizar estado compartilhado, criar uma nova cópia torna a mudança explícita e reduz efeitos inesperados em referências existentes.', 'É emitir uma nova ficha atualizada sem rasurar silenciosamente todas as cópias anteriores.', 'javascript', 'const perfil = { nome: "Bia", xp: 40 };\nconst atualizado = { ...perfil, xp: perfil.xp + 10 };\nconsole.log(perfil.xp, atualizado.xp);', 'Atualize um objeto aninhado preservando os campos que não mudaram.', 'Acreditar que copiar um objeto com spread também clona profundamente todos os níveis.'),
      l('async-flow', 'Esperando operações assíncronas', 'Promises, async e await', 'Promises representam resultados futuros. await pausa somente a função assíncrona atual e try/catch permite tratar rejeições perto da operação que conhece o contexto.', 'É receber um protocolo e continuar quando a oficina avisar que a peça ficou pronta.', 'javascript', 'async function carregar() {\n  try {\n    const resposta = await fetch("/api/perfil");\n    if (!resposta.ok) throw new Error("falha HTTP");\n    return await resposta.json();\n  } catch (erro) {\n    return null;\n  }\n}', 'Crie uma função assíncrona que trate resposta HTTP inválida e indisponibilidade.', 'Tratar apenas rejeição de rede e esquecer que respostas 404 ou 500 não rejeitam fetch.'),
    ],
  },
  {
    topicId: 'javascript', levelId: 'advanced', lessons: [
      l('module-boundaries', 'Módulos orientados por responsabilidade', 'ES Modules e dependências', 'Módulos devem expor uma API pequena e manter detalhes internos privados. Dependências direcionais reduzem ciclos e deixam testes menos acoplados à inicialização da aplicação.', 'É uma oficina com balcão público e ferramentas internas que não precisam sair para a rua.', 'javascript', 'export function criarPontuacao(valor) {\n  if (valor < 0) throw new Error("valor inválido");\n  return Object.freeze({ valor });\n}', 'Separe validação, armazenamento e apresentação em três módulos com APIs explícitas.', 'Exportar tudo por conveniência e transformar detalhes internos em contratos permanentes.'),
      l('reliability', 'Erros como parte do contrato', 'Erros tipados e recuperação', 'Falhas esperadas merecem códigos e contexto que permitam ao chamador decidir entre repetir, orientar ou interromper. Capturar um erro sem ação apenas desloca o defeito para outro lugar.', 'É um sinal da arena que informa não só que houve problema, mas qual equipe deve agir.', 'javascript', 'class ValidationError extends Error {}\nfunction validar(nome) {\n  if (!nome.trim()) throw new ValidationError("nome vazio");\n  return nome.trim();\n}', 'Modele erros distintos para validação e indisponibilidade externa.', 'Converter qualquer falha em null e perder a causa necessária para recuperação.'),
      l('performance-tests', 'Desempenho guiado por evidências', 'Medição, testes e regressões', 'Otimização começa com um cenário mensurável e um limite aceitável. Testes protegem comportamento enquanto medições verificam se a mudança realmente reduz o gargalo observado.', 'É cronometrar a pista antes e depois de trocar o equipamento, mantendo o mesmo percurso.', 'javascript', 'const inicio = performance.now();\nconst resultado = calcular(dados);\nconst duracao = performance.now() - inicio;\nconsole.assert(resultado.length > 0);\nconsole.log({ duracao });', 'Defina um cenário, meça uma operação e registre um limite de regressão.', 'Otimizar pelo tamanho do código ou por intuição sem medir o caminho relevante.'),
    ],
  },
  {
    topicId: 'html-css', levelId: 'never-coded', lessons: [
      l('document-structure', 'A estrutura mínima de uma página', 'Documento, head e body', 'HTML descreve a estrutura e o significado do conteúdo. head guarda metadados; body contém o que será apresentado e elementos semânticos ajudam navegador e pessoas a entender a página.', 'É a planta de uma arena: cada área recebe um nome antes da decoração.', 'html', '<!doctype html>\n<html lang="pt-BR">\n<head><title>DevRoyale</title></head>\n<body><h1>Minha arena</h1></body>\n</html>', 'Crie um documento com idioma, título e um cabeçalho principal.', 'Usar elementos apenas pela aparência e ignorar o significado estrutural.'),
      l('text-links', 'Conteúdo que pode ser navegado', 'Títulos, parágrafos e links', 'Títulos formam uma hierarquia, parágrafos agrupam ideias e links conectam destinos. Um texto de link útil descreve para onde a pessoa irá, mesmo fora do contexto.', 'É um mapa com placas claras em vez de várias setas escritas apenas “clique aqui”.', 'html', '<main>\n  <h1>Trilha Python</h1>\n  <p>Comece pelos fundamentos.</p>\n  <a href="/estudos">Abrir Área dos Estudos</a>\n</main>', 'Monte uma seção com título, explicação e link cujo texto descreva o destino.', 'Pular níveis de título apenas para obter um tamanho visual menor.'),
      l('first-style', 'Aplicando o primeiro estilo', 'Seletores, propriedades e valores', 'CSS seleciona elementos e declara propriedades visuais. Separar conteúdo de apresentação permite mudar cores e espaçamentos sem reescrever a estrutura HTML.', 'HTML é a armadura; CSS define acabamento, cor e encaixe.', 'css', 'body {\n  background: #111318;\n  color: #f5f1e8;\n}\nh1 { color: #d6a84a; }', 'Aplique fundo escuro, texto legível e uma cor de destaque ao título.', 'Escolher cores isoladamente sem conferir contraste entre texto e fundo.'),
    ],
  },
  {
    topicId: 'html-css', levelId: 'basic', lessons: [
      l('box-model', 'Entendendo o espaço de cada elemento', 'Box model', 'Todo elemento ocupa conteúdo, preenchimento, borda e margem. box-sizing border-box torna a largura declarada mais previsível ao incluir padding e borda no cálculo.', 'É uma caixa com objeto, proteção interna, parede e distância até a próxima caixa.', 'css', '* { box-sizing: border-box; }\n.card {\n  width: 320px;\n  padding: 24px;\n  border: 1px solid #444;\n  margin: 16px;\n}', 'Desenhe uma caixa e identifique visualmente conteúdo, padding, borda e margem.', 'Somar padding à largura sem considerar o valor de box-sizing.'),
      l('flex-layout', 'Alinhando itens em uma direção', 'Flexbox e eixos', 'Flexbox organiza itens em um eixo principal e outro transversal. justify-content atua no eixo principal, align-items no transversal e gap cria espaçamento consistente.', 'É uma equipe em formação: direção, alinhamento e distância seguem comandos diferentes.', 'css', '.acoes {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  flex-wrap: wrap;\n}', 'Crie uma barra de ações que alinhe texto e botões e quebre no espaço reduzido.', 'Trocar justify-content e align-items sem observar qual é o eixo principal.'),
      l('forms', 'Formulários claros e utilizáveis', 'Labels, inputs e estados', 'Cada campo precisa de label associado, tipo adequado e orientação de erro compreensível. Estados de foco visíveis ajudam navegação por teclado e não devem depender apenas de cor.', 'É uma ficha de inscrição com perguntas nomeadas e instruções perto do lugar certo.', 'html', '<label for="email">E-mail</label>\n<input id="email" name="email" type="email" required>\n<p id="email-ajuda">Usaremos para entrar na conta.</p>', 'Crie um formulário com nome e e-mail, labels associados e mensagens de ajuda.', 'Usar placeholder como substituto permanente do label.'),
    ],
  },
  {
    topicId: 'html-css', levelId: 'intermediate', lessons: [
      l('responsive-grid', 'Grades que respondem ao espaço', 'CSS Grid e responsividade', 'Grid define colunas e linhas para layouts bidimensionais. minmax e auto-fit permitem que o conteúdo determine quantas colunas cabem sem depender de larguras fixas.', 'É uma arquibancada modular que reorganiza assentos conforme o espaço disponível.', 'css', '.grade {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n  gap: 20px;\n}', 'Monte uma grade de cards que varie entre uma e quatro colunas sem overflow.', 'Escolher uma largura mínima maior que a tela disponível em celulares estreitos.'),
      l('accessibility', 'Semântica e acessibilidade prática', 'Navegação, foco e alternativas', 'Acessibilidade combina HTML semântico, ordem de foco, nomes acessíveis e contraste. Elementos nativos oferecem comportamento de teclado que não deve ser recriado com divs clicáveis.', 'É projetar entradas e caminhos para diferentes equipamentos, não apenas para um tipo de visitante.', 'html', '<button type="button" aria-expanded="false">\n  Ver conquistas\n</button>\n<img src="scout.png" alt="Scout Professor apontando a trilha">', 'Revise uma interface e substitua controles improvisados por elementos semânticos.', 'Adicionar ARIA para imitar um botão quando um button nativo resolveria o problema.'),
      l('cascade', 'Controlando a cascata sem guerra de seletores', 'Especificidade, herança e camadas', 'A cascata escolhe regras por origem, importância, especificidade e ordem. Classes simples e uma ordem previsível evitam !important e tornam componentes mais fáceis de sobrescrever.', 'É uma hierarquia de regras em que empates são resolvidos pela prioridade e pela ordem.', 'css', '.card { color: var(--text-muted); }\n.card__title { color: var(--text); }\n.card.is-highlighted { border-color: var(--gold); }', 'Simplifique um conjunto de seletores muito específicos usando classes de componente.', 'Aumentar especificidade a cada correção até tornar o estilo impossível de reutilizar.'),
    ],
  },
  {
    topicId: 'html-css', levelId: 'advanced', lessons: [
      l('css-architecture', 'Arquitetura CSS por responsabilidade', 'Tokens, componentes e páginas', 'Uma base sustentável separa tokens, padrões globais, componentes e ajustes de página. A ordem de importação precisa ser explícita para preservar a cascata e reduzir regras duplicadas.', 'É separar materiais, peças reutilizáveis e montagem final em setores da oficina.', 'css', '@import "tokens.css";\n@import "base.css";\n@import "components/card.css";\n@import "pages/profile.css";', 'Organize uma folha extensa em camadas e documente a ordem necessária dos imports.', 'Dividir arquivos sem preservar a ordem da cascata e alterar o resultado final.'),
      l('render-performance', 'Estilos com custo previsível', 'Renderização e propriedades animadas', 'Mudanças em transform e opacity geralmente evitam recalcular layout, enquanto dimensões e posições podem afetar muitos elementos. Meça antes de otimizar e respeite prefers-reduced-motion.', 'É mover uma projeção em vez de reconstruir o palco a cada quadro.', 'css', '.card { transition: transform 180ms ease; }\n.card:hover { transform: translateY(-2px); }\n@media (prefers-reduced-motion: reduce) {\n  .card { transition: none; }\n}', 'Compare uma animação por top com outra por transform e verifique movimento reduzido.', 'Animar várias propriedades com transition: all sem avaliar o custo e a intenção.'),
      l('design-system', 'Componentes visuais consistentes', 'Design tokens e variantes', 'Tokens dão nomes semânticos a cores, espaços e sombras; variantes combinam esses tokens em componentes. A consistência reduz decisões repetidas sem impedir exceções justificadas.', 'É um arsenal com peças padronizadas que ainda permite montar equipamentos diferentes.', 'css', ':root {\n  --color-action: #c83232;\n  --space-card: 1.25rem;\n}\n.button--primary {\n  background: var(--color-action);\n}', 'Defina tokens de cor, espaço e raio e use-os em botão, card e input.', 'Criar um token para cada valor isolado sem significado compartilhado.'),
    ],
  },
  {
    topicId: 'sql', levelId: 'never-coded', lessons: [
      l('tables', 'Tabelas, linhas e colunas', 'Modelo relacional básico', 'Uma tabela representa um conjunto de entidades; cada linha é um registro e cada coluna descreve um atributo. Uma chave identifica cada registro sem depender de dados que podem mudar.', 'É uma planilha organizada em que cada participante ocupa uma linha e cada informação tem coluna própria.', 'sql', 'CREATE TABLE jogadores (\n  id INTEGER PRIMARY KEY,\n  nome TEXT NOT NULL,\n  xp INTEGER NOT NULL\n);', 'Desenhe uma tabela de cursos com identificador, título e carga horária.', 'Usar o nome como identificador mesmo quando duas pessoas podem ter o mesmo nome.'),
      l('select', 'Consultando dados sem alterá-los', 'SELECT e projeção', 'SELECT lê colunas de uma fonte e permite escolher apenas os dados necessários. Nomear explicitamente colunas documenta a intenção e reduz dependência de mudanças na tabela.', 'É pedir ao arquivo apenas as fichas e campos necessários para uma missão.', 'sql', 'SELECT nome, xp\nFROM jogadores;', 'Consulte título e duração da tabela de cursos sem usar SELECT estrela.', 'Usar SELECT * em toda consulta e transportar colunas desnecessárias.'),
      l('filters', 'Filtrando registros', 'WHERE e comparações', 'WHERE mantém somente linhas cuja condição é verdadeira. Valores textuais usam aspas e condições combinadas precisam refletir exatamente a regra de negócio.', 'É uma peneira que deixa passar apenas registros com as características escolhidas.', 'sql', 'SELECT nome, xp\nFROM jogadores\nWHERE xp >= 100;', 'Liste cursos com duração maior que dez horas e status ativo.', 'Escrever filtros que ignoram valores nulos ou limites inclusivos.'),
    ],
  },
  {
    topicId: 'sql', levelId: 'basic', lessons: [
      l('ordering', 'Ordenando e limitando resultados', 'ORDER BY, LIMIT e paginação', 'ORDER BY define uma ordem estável e LIMIT restringe a quantidade retornada. Para paginação confiável, inclua um critério de desempate único.', 'É montar um ranking com regra clara também para participantes empatados.', 'sql', 'SELECT id, nome, xp\nFROM jogadores\nORDER BY xp DESC, id ASC\nLIMIT 10;', 'Crie um ranking dos cinco cursos mais longos com desempate pelo id.', 'Paginar sem ordem estável e ver registros mudarem de página.'),
      l('aggregates', 'Resumindo conjuntos de dados', 'COUNT, SUM, AVG e GROUP BY', 'Funções de agregação transformam várias linhas em medidas. GROUP BY define quais grupos produzem uma linha de resultado e HAVING filtra grupos depois do cálculo.', 'É transformar várias fichas de partida em um placar resumido por equipe.', 'sql', 'SELECT linguagem, COUNT(*) AS total, AVG(xp) AS media\nFROM jogadores\nGROUP BY linguagem;', 'Conte cursos por categoria e mostre apenas categorias com mais de dois cursos.', 'Selecionar uma coluna não agregada sem incluí-la no GROUP BY.'),
      l('joins', 'Relacionando tabelas', 'JOIN e chaves estrangeiras', 'JOIN combina registros por uma relação explícita. INNER JOIN mantém correspondências; LEFT JOIN preserva todas as linhas da esquerda, mesmo quando não há relação.', 'É cruzar a lista de inscrições com a lista de participantes usando o número de identificação.', 'sql', 'SELECT j.nome, b.titulo\nFROM jogadores AS j\nJOIN batalhas AS b ON b.vencedor_id = j.id;', 'Relacione pedidos e clientes e explique quando usar LEFT JOIN.', 'Juntar tabelas sem condição e criar uma multiplicação de linhas.'),
    ],
  },
  {
    topicId: 'sql', levelId: 'intermediate', lessons: [
      l('ctes', 'Consultas em etapas legíveis', 'CTEs e subconsultas', 'Uma CTE nomeia um resultado intermediário e torna transformações em etapas mais fáceis de revisar. Ela não é automaticamente mais rápida; sua principal vantagem inicial é clareza.', 'É preparar listas auxiliares nomeadas antes de montar o relatório final.', 'sql', 'WITH ativos AS (\n  SELECT id, xp FROM jogadores WHERE ativo = true\n)\nSELECT AVG(xp)\nFROM ativos;', 'Reescreva uma consulta aninhada usando uma CTE com nome descritivo.', 'Usar muitas CTEs pequenas sem que elas revelem etapas significativas.'),
      l('transactions', 'Mudanças que acontecem juntas', 'Transações e atomicidade', 'Uma transação reúne operações que precisam confirmar ou falhar como unidade. COMMIT publica o conjunto; ROLLBACK desfaz quando uma regra não pode ser cumprida.', 'É uma troca de itens: ninguém entrega sua peça se a outra parte não puder concluir.', 'sql', 'BEGIN;\nUPDATE contas SET saldo = saldo - 50 WHERE id = 1;\nUPDATE contas SET saldo = saldo + 50 WHERE id = 2;\nCOMMIT;', 'Descreva uma compra que atualiza estoque e pedido dentro da mesma transação.', 'Confirmar uma parte antes de verificar se todas as operações tiveram sucesso.'),
      l('indexes', 'Índices orientados por consultas', 'Índices e seletividade', 'Índices aceleram caminhos de leitura ao custo de espaço e manutenção em escritas. Escolha colunas usadas em filtros e junções reais, observando seletividade e ordem.', 'É o índice remissivo de um livro: ocupa páginas extras para evitar leitura completa.', 'sql', 'CREATE INDEX idx_jogadores_email\nON jogadores (email);\n\nSELECT id FROM jogadores WHERE email = $1;', 'Escolha um índice para três consultas frequentes e justifique a ordem das colunas.', 'Criar índices para todas as colunas sem medir custo de escrita e uso real.'),
    ],
  },
  {
    topicId: 'sql', levelId: 'advanced', lessons: [
      l('execution-plans', 'Lendo planos de execução', 'EXPLAIN e gargalos', 'O plano mostra como o banco pretende acessar, juntar e ordenar dados. Compare estimativas com resultados reais para localizar leituras excessivas, cardinalidade incorreta ou índices ignorados.', 'É analisar o mapa da rota escolhida pelo mensageiro, não apenas o tempo final.', 'sql', 'EXPLAIN ANALYZE\nSELECT j.nome\nFROM jogadores j\nWHERE j.email = $1;', 'Capture o plano de uma consulta lenta e registre hipótese, mudança e nova medição.', 'Concluir que uma operação é ruim apenas pelo nome sem analisar volume e tempo.'),
      l('modeling', 'Modelagem orientada por invariantes', 'Normalização e restrições', 'Uma modelagem forte representa relações e protege regras com tipos, chaves e constraints. Desnormalização só deve ocorrer com motivo medido e estratégia de consistência.', 'É construir muros e portões no mapa para impedir caminhos inválidos, não apenas pedir cuidado.', 'sql', 'CREATE TABLE inscricoes (\n  jogador_id INTEGER REFERENCES jogadores(id),\n  batalha_id INTEGER REFERENCES batalhas(id),\n  UNIQUE (jogador_id, batalha_id)\n);', 'Modele inscrições impedindo duplicidade e referências inexistentes.', 'Depender apenas da aplicação para regras que o banco pode garantir.'),
      l('concurrency-security', 'Concorrência e acesso mínimo', 'Isolamento, bloqueios e permissões', 'Operações simultâneas podem observar ou sobrescrever estados inesperados. Escolha isolamento conforme o risco e conceda a cada usuário apenas permissões necessárias.', 'É coordenar várias equipes no mesmo depósito usando reservas e chaves específicas.', 'sql', 'BEGIN;\nSELECT saldo FROM contas WHERE id = 1 FOR UPDATE;\nUPDATE contas SET saldo = saldo - 10 WHERE id = 1;\nCOMMIT;', 'Simule duas atualizações concorrentes e proponha controle sem bloquear o sistema inteiro.', 'Usar a mesma conta administrativa para aplicação, migração e análise.'),
    ],
  },
  {
    topicId: 'git-github', levelId: 'never-coded', lessons: [
      l('repository', 'Criando um histórico local', 'Repositório e status', 'Um repositório acompanha mudanças dentro de uma pasta. git status mostra o que foi alterado, preparado ou ainda não rastreado antes de qualquer registro.', 'É abrir um diário de bordo e conferir quais páginas mudaram antes de escrever a próxima entrada.', 'bash', 'git init\ngit status', 'Crie um repositório de teste, adicione dois arquivos e interprete cada seção do status.', 'Executar comandos sem confirmar em qual pasta e repositório está.'),
      l('first-commit', 'Preparando e registrando mudanças', 'Stage e commit', 'git add escolhe o conteúdo do próximo registro; git commit cria uma fotografia com mensagem. Separar mudanças por intenção produz histórico mais fácil de entender e desfazer.', 'É selecionar as peças que pertencem ao mesmo pacote e etiquetar o motivo do envio.', 'bash', 'git add README.md\ngit diff --staged\ngit commit -m "docs: explica o projeto"', 'Faça dois commits separados: um para documentação e outro para código.', 'Adicionar todos os arquivos sem revisar o diff preparado.'),
      l('history', 'Lendo o que aconteceu', 'log e diff', 'git log apresenta commits e git diff mostra diferenças entre estados. Ler o histórico antes de agir evita desfazer trabalho correto ou repetir uma mudança existente.', 'É consultar o diário e comparar duas versões do mapa antes de corrigir a rota.', 'bash', 'git log --oneline --decorate\ngit diff HEAD~1 HEAD', 'Encontre o commit que mudou uma frase e explique o diff linha por linha.', 'Interpretar linhas removidas e adicionadas sem observar qual versão está de cada lado.'),
    ],
  },
  {
    topicId: 'git-github', levelId: 'basic', lessons: [
      l('branches', 'Trabalhando em uma linha separada', 'Branches e troca de contexto', 'Uma branch é um nome apontando para uma linha de commits. Criar uma branch por objetivo isola trabalho e permite revisão antes de integrar.', 'É abrir uma pista paralela para testar uma estratégia sem interromper a corrida principal.', 'bash', 'git switch -c feature/perfil\ngit status\ngit add .\ngit commit -m "feat: cria perfil"', 'Crie uma branch, faça um commit pequeno e volte à branch principal.', 'Começar uma tarefa na branch errada e misturar objetivos no mesmo histórico.'),
      l('merge', 'Integrando histórias', 'Merge e conflitos', 'merge combina linhas de desenvolvimento. Conflitos aparecem quando o Git não consegue decidir qual conteúdo representa a intenção correta; a resolução exige entender as duas mudanças.', 'É juntar dois mapas editados e decidir conscientemente como sobrepor áreas conflitantes.', 'bash', 'git switch main\ngit merge feature/perfil\ngit status', 'Crie um conflito controlado em um arquivo, resolva e revise o commit de merge.', 'Apagar marcadores de conflito sem compreender qual resultado o código precisa ter.'),
      l('remote', 'Compartilhando pelo GitHub', 'Remotos, push e pull', 'Um remoto referencia outro repositório. fetch traz informações sem integrar, pull busca e integra, e push publica commits locais respeitando a história remota.', 'É sincronizar o diário local com uma cópia compartilhada da equipe.', 'bash', 'git remote -v\ngit fetch origin\ngit push -u origin feature/perfil', 'Publique uma branch e abra uma comparação no GitHub sem alterar a principal.', 'Usar push forçado para resolver divergência sem verificar commits remotos.'),
    ],
  },
  {
    topicId: 'git-github', levelId: 'intermediate', lessons: [
      l('rebase', 'Reorganizando commits locais', 'Rebase e história linear', 'rebase reaplica commits sobre uma nova base e muda suas identidades. É útil para organizar trabalho local, mas exige cuidado quando commits já são compartilhados.', 'É reescrever suas anotações sobre a edição mais nova do manual antes de publicá-las.', 'bash', 'git fetch origin\ngit switch feature/perfil\ngit rebase origin/main', 'Rebase uma branch local de teste e compare o log antes e depois.', 'Reescrever commits usados por outras pessoas e obrigar reconciliação desnecessária.'),
      l('conflict-strategy', 'Resolvendo conflitos com contexto', 'Resolução e testes', 'Resolver conflito é combinar intenções, não escolher automaticamente um lado. Depois da edição, execute testes e revise o diff final antes de continuar a operação.', 'É mediar duas propostas e verificar se a solução conjunta ainda cumpre a missão.', 'bash', 'git status\ngit diff\n# editar e testar\ngit add arquivo.ts\ngit rebase --continue', 'Documente uma resolução explicando o que veio de cada branch e como foi testada.', 'Usar “aceitar tudo” sem conferir dependências entre as mudanças.'),
      l('safe-undo', 'Desfazendo sem apagar evidências', 'revert, restore e reset', 'revert cria um novo commit inverso e é seguro para histórico compartilhado. restore atua em arquivos; reset move referências e deve ser reservado para situações compreendidas.', 'É registrar uma correção no diário em vez de arrancar páginas que outras pessoas já leram.', 'bash', 'git log --oneline\ngit revert abc123\ngit show --stat HEAD', 'Reverta um commit em repositório de teste e confirme que o histórico permanece completo.', 'Usar reset --hard como primeira opção e perder trabalho não registrado.'),
    ],
  },
  {
    topicId: 'git-github', levelId: 'advanced', lessons: [
      l('workflow', 'Desenhando um fluxo de colaboração', 'Branches, revisão e proteção', 'Um workflow define duração de branches, critérios de revisão, automações e estratégia de integração. O processo deve reduzir risco sem criar filas desnecessárias.', 'É definir regras de entrada, inspeção e liberação para manter a arena operando.', 'text', 'branch curta -> pull request -> CI -> revisão -> squash merge', 'Proponha um workflow para uma equipe pequena incluindo emergência e rollback.', 'Copiar um fluxo corporativo complexo sem relacioná-lo aos riscos da equipe.'),
      l('bisect', 'Encontrando a mudança que introduziu uma falha', 'git bisect e diagnóstico', 'git bisect usa busca binária entre um commit bom e um ruim. Um teste reproduzível permite automatizar a classificação e encontrar o primeiro commit defeituoso com poucas etapas.', 'É dividir repetidamente uma pilha de mapas até encontrar a edição que desviou a rota.', 'bash', 'git bisect start\ngit bisect bad HEAD\ngit bisect good v1.0.0\ngit bisect run npm test', 'Crie uma sequência de commits e use bisect para localizar uma regressão conhecida.', 'Iniciar bisect sem um teste confiável que diferencie estados bons e ruins.'),
      l('releases-security', 'Releases rastreáveis e seguras', 'Tags, assinaturas e segredos', 'Tags identificam versões e pipelines podem produzir artefatos reproduzíveis a partir delas. Segredos nunca pertencem ao histórico, pois remover um arquivo depois não apaga commits anteriores.', 'É lacrar uma edição oficial do manual e manter as chaves fora das páginas públicas.', 'bash', 'git tag -a v1.0.0 -m "DevRoyale V1.0"\ngit push origin v1.0.0\ngit log --show-signature -1', 'Desenhe um checklist de release com tag, changelog, CI e plano de reversão.', 'Versionar credenciais e acreditar que um commit posterior as removeu de todo o histórico.'),
    ],
  },
  {
    topicId: 'frontend', levelId: 'never-coded', lessons: [
      l('browser-role', 'O que acontece no navegador', 'Documento, estilo e comportamento', 'O navegador combina HTML para estrutura, CSS para apresentação e JavaScript para comportamento. Cada tecnologia resolve uma responsabilidade e as três colaboram na interface.', 'É um palco: cenário, figurino e ações formam a experiência final.', 'text', 'HTML -> estrutura\nCSS -> apresentação\nJavaScript -> interação', 'Escolha uma página conhecida e identifique exemplos das três responsabilidades.', 'Tratar frontend apenas como aparência e ignorar comportamento e acessibilidade.'),
      l('dom-event', 'Respondendo a uma ação da pessoa', 'DOM e eventos', 'O DOM representa elementos da página como objetos. Um listener observa um evento e executa uma função sem precisar verificar continuamente se algo aconteceu.', 'É um sino ligado a uma equipe: a ação dispara o aviso e a equipe responde.', 'javascript', 'const botao = document.querySelector("#treinar");\nbotao.addEventListener("click", () => {\n  console.log("Treino iniciado");\n});', 'Crie um botão que atualize uma mensagem ao receber clique.', 'Buscar um seletor inexistente e tentar registrar evento em null.'),
      l('first-request', 'Carregando dados de uma API', 'fetch e JSON', 'Uma interface pode pedir dados a um servidor. fetch devolve uma Promise; a resposta precisa ser verificada e convertida antes de atualizar a tela.', 'É enviar um pedido à central e aguardar o pacote antes de expor seu conteúdo.', 'javascript', 'async function carregar() {\n  const resposta = await fetch("/api/trilhas");\n  if (!resposta.ok) throw new Error("Falha");\n  return resposta.json();\n}', 'Carregue uma lista e apresente estados de carregamento, sucesso e erro.', 'Exibir a interface como vazia durante a espera sem informar o estado.'),
    ],
  },
  {
    topicId: 'frontend', levelId: 'basic', lessons: [
      l('components', 'Componentes com propósito', 'Propriedades e composição', 'Componentes encapsulam uma parte da interface com responsabilidade reconhecível. Propriedades configuram o conteúdo e composição evita componentes gigantes cheios de opções.', 'É montar uma arena com módulos reutilizáveis em vez de reconstruir cada setor.', 'tsx', 'function Badge({ label }: { label: string }) {\n  return <span className="badge">{label}</span>\n}\n<Badge label="Básico" />', 'Crie um card composto por título, descrição e badge reutilizável.', 'Criar um componente para cada pequena tag sem obter reutilização ou clareza.'),
      l('state', 'Estado que representa a interface', 'Estado e renderização', 'Estado guarda informações que mudam e influenciam o que aparece. Evite duplicar valores que podem ser calculados de outras fontes, pois cópias podem divergir.', 'É um placar oficial: a tela deriva dele em vez de manter contagens paralelas.', 'tsx', 'const [aulas, setAulas] = useState<string[]>([])\nconst total = aulas.length\nfunction adicionar(id: string) {\n  setAulas((atuais) => [...atuais, id])\n}', 'Implemente seleção de itens mantendo apenas a fonte mínima de estado.', 'Guardar total e lista separadamente e esquecer de atualizar ambos.'),
      l('controlled-form', 'Formulários controlados e claros', 'Inputs, validação e envio', 'Um formulário controlado liga valor e evento ao estado da aplicação. Valide no momento adequado, preserve o que a pessoa digitou e associe erros aos campos.', 'É uma ficha cuja cópia de trabalho permanece sincronizada com o que aparece na tela.', 'tsx', '<label htmlFor="nome">Nome</label>\n<input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />\n<button type="submit">Salvar</button>', 'Crie um formulário com validação de campo obrigatório e foco no primeiro erro.', 'Validar a cada tecla com mensagens agressivas antes de a pessoa terminar.'),
    ],
  },
  {
    topicId: 'frontend', levelId: 'intermediate', lessons: [
      l('routing', 'Rotas e estados navegáveis', 'URL e navegação', 'A URL deve representar estados importantes para permitir atualização, compartilhamento e histórico do navegador. Parâmetros e busca carregam contexto sem duplicar toda a tela.', 'É um endereço no mapa que leva ao mesmo setor mesmo quando o visitante retorna depois.', 'tsx', '<Route path="/estudos/:trilhaId" element={<Trilha />} />\nconst { trilhaId } = useParams()', 'Modele rotas para lista, detalhe e edição mantendo navegação previsível.', 'Guardar toda navegação apenas em estado local e perder contexto ao atualizar.'),
      l('shared-state', 'Estado compartilhado na distância certa', 'Elevação, contexto e stores', 'Mantenha estado perto de quem o usa e eleve somente quando consumidores precisam coordenar. Contexto serve dados transversais estáveis, mas não substitui toda comunicação entre componentes.', 'É manter ferramentas na bancada local e levar ao depósito apenas o que várias equipes compartilham.', 'tsx', 'const ThemeContext = createContext<ThemeContextValue | null>(null)\nfunction useTheme() {\n  const value = useContext(ThemeContext)\n  if (!value) throw new Error("Provider ausente")\n  return value\n}', 'Escolha onde armazenar filtro local, usuário autenticado e dados de formulário.', 'Colocar todo estado em um contexto global e provocar renderizações e acoplamento.'),
      l('server-data', 'Dados remotos com ciclo de vida', 'Cache, atualização e estados', 'Dados de servidor têm carregamento, erro, validade e atualização próprios. Uma estratégia de cache define quando reutilizar, invalidar ou buscar novamente sem mostrar informações antigas como atuais.', 'É um mural que informa quando foi atualizado e quando precisa consultar a central outra vez.', 'typescript', 'type LoadState<T> =\n  | { status: "loading" }\n  | { status: "success"; data: T }\n  | { status: "error"; message: string }', 'Modele uma listagem com estados explícitos e política de atualização após edição.', 'Representar carregamento, erro e ausência de dados com o mesmo valor null.'),
    ],
  },
  {
    topicId: 'frontend', levelId: 'advanced', lessons: [
      l('frontend-architecture', 'Fronteiras de uma aplicação frontend', 'Features, domínio e infraestrutura', 'Organize por capacidades do produto e mantenha componentes de domínio independentes de detalhes de rede quando possível. Fronteiras claras permitem substituir implementação sem espalhar mudanças.', 'É organizar equipes por missão e definir contratos com a central de suprimentos.', 'text', 'features/estudos -> domain + ui\nservices/ -> integrações externas\ncomponents/ui -> padrões compartilhados', 'Desenhe fronteiras para autenticação, estudos e progresso e liste dependências permitidas.', 'Criar pastas por tipo sem controlar dependências entre funcionalidades.'),
      l('web-performance', 'Desempenho percebido e medido', 'Carregamento, renderização e Core Web Vitals', 'Desempenho envolve bytes, prioridade de recursos, trabalho na thread principal e estabilidade visual. Meça cenários reais e priorize o caminho que afeta a percepção da pessoa.', 'É liberar primeiro as partes essenciais da arena enquanto setores secundários terminam a montagem.', 'javascript', 'const observer = new PerformanceObserver((list) => {\n  console.log(list.getEntries());\n});\nobserver.observe({ type: "largest-contentful-paint", buffered: true });', 'Meça uma tela, escolha um gargalo e valide a melhoria com o mesmo cenário.', 'Otimizar o bundle inteiro sem identificar qual rota e métrica estão prejudicadas.'),
      l('testing-accessibility', 'Qualidade pelo comportamento observável', 'Testes, acessibilidade e resiliência', 'Testes de interface devem observar o que a pessoa vê e faz, evitando detalhes internos frágeis. Consultas acessíveis aproximam testes do uso por tecnologias assistivas.', 'É testar os portões como visitante, não desmontar a fechadura para conferir cada peça.', 'tsx', 'render(<Login />)\nawait user.type(screen.getByLabelText("E-mail"), "dev@arena.com")\nawait user.click(screen.getByRole("button", { name: "Entrar" }))', 'Escreva testes para sucesso, validação e falha de rede usando nomes acessíveis.', 'Testar classes e estado interno enquanto o comportamento para a pessoa continua quebrado.'),
    ],
  },
  {
    topicId: 'backend', levelId: 'never-coded', lessons: [
      l('request-response', 'Como cliente e servidor conversam', 'Requisição e resposta HTTP', 'O cliente envia método, endereço, cabeçalhos e eventualmente dados. O servidor processa e responde com status, cabeçalhos e corpo; o status resume o resultado da operação.', 'É um protocolo de entrega com pedido, endereço, comprovante e resposta da central.', 'http', 'GET /api/trilhas HTTP/1.1\nAccept: application/json\n\nHTTP/1.1 200 OK\nContent-Type: application/json', 'Descreva requisição e resposta para consultar o perfil de um usuário.', 'Pensar que toda falha deve retornar 200 acompanhada de uma mensagem de erro.'),
      l('first-route', 'Criando uma rota de API', 'Método, caminho e handler', 'Uma rota associa método e caminho a uma função que valida a entrada, executa uma regra e produz resposta. O handler deve terminar cada caminho com status coerente.', 'É uma mesa especializada que recebe apenas um tipo de solicitação e encaminha o resultado.', 'javascript', 'app.get("/api/status", (req, res) => {\n  res.status(200).json({ online: true });\n});', 'Defina uma rota para consultar uma trilha pelo identificador e trate ausência.', 'Criar caminhos ambíguos e misturar várias operações no mesmo método.'),
      l('persistence', 'Guardando dados além da execução', 'Memória, arquivos e banco', 'Variáveis desaparecem quando o processo termina; persistência mantém dados em armazenamento apropriado. Bancos oferecem consultas, consistência e acesso concorrente que uma lista em memória não resolve.', 'É a diferença entre anotar no ar e registrar no arquivo oficial da arena.', 'javascript', 'const trilha = await repositorio.buscarPorId(id);\nif (!trilha) {\n  return resposta.status(404).json({ erro: "não encontrada" });\n}', 'Compare memória e banco para armazenar usuários, apontando riscos de cada opção.', 'Tratar dados em memória como permanentes em uma aplicação reiniciável.'),
    ],
  },
  {
    topicId: 'backend', levelId: 'basic', lessons: [
      l('rest-validation', 'Entradas validadas na fronteira', 'REST e validação', 'Dados externos não são confiáveis até passarem por validação de tipo, formato e regra. Respostas de validação devem apontar campos e problemas sem expor detalhes internos.', 'É a inspeção de credenciais antes de permitir acesso aos setores internos.', 'javascript', 'app.post("/api/aulas", (req, res) => {\n  if (!req.body.titulo?.trim()) {\n    return res.status(400).json({ campo: "titulo", erro: "obrigatório" });\n  }\n  return res.status(201).json(criarAula(req.body));\n});', 'Modele validação para cadastro com nome, e-mail e nível.', 'Confiar na validação do frontend e aceitar diretamente qualquer corpo recebido.'),
      l('service-layer', 'Separando transporte da regra', 'Controller, serviço e repositório', 'Controllers traduzem HTTP, serviços coordenam regras e repositórios cuidam da persistência. Essa separação evita que detalhes de framework dominem a lógica do produto.', 'É dividir recepção, equipe de decisão e arquivo, cada qual com responsabilidade conhecida.', 'typescript', 'async function concluirAula(userId: string, aulaId: string) {\n  const existente = await historico.buscar(userId, aulaId)\n  if (existente) return existente\n  return historico.salvar({ userId, aulaId })\n}', 'Separe uma rota de conclusão em controller, serviço e repositório.', 'Criar camadas que apenas repassam argumentos sem proteger regra ou abstração.'),
      l('api-errors', 'Erros consistentes para clientes', 'Status e contrato de erro', 'Uma API previsível usa status adequados e formato estável de erro. Logs internos podem conter contexto técnico, enquanto a resposta pública evita dados sensíveis.', 'É entregar ao visitante uma orientação clara e enviar à manutenção o diagnóstico completo.', 'json', '{\n  "code": "LESSON_NOT_FOUND",\n  "message": "A aula solicitada não existe",\n  "requestId": "req_123"\n}', 'Defina contratos para validação, ausência, conflito e erro inesperado.', 'Retornar stack trace e dados internos para quem fez a requisição.'),
    ],
  },
  {
    topicId: 'backend', levelId: 'intermediate', lessons: [
      l('authentication', 'Identidade e autorização separadas', 'Sessão, token e permissões', 'Autenticação confirma identidade; autorização decide o que ela pode fazer. Verifique permissão perto do recurso e trate credenciais como dados sensíveis com expiração e revogação.', 'É conferir quem entrou e, depois, quais portas aquela credencial pode abrir.', 'typescript', 'const user = await autenticar(token)\nif (!user) return resposta.status(401).end()\nif (!podeEditar(user, recurso)) return resposta.status(403).end()', 'Modele acesso de aluno e administrador a leitura, edição e exclusão.', 'Considerar que estar autenticado concede automaticamente acesso a qualquer recurso.'),
      l('transaction-boundary', 'Consistência em operações compostas', 'Transações e idempotência', 'Operações com múltiplas escritas precisam de fronteira transacional ou compensação. Uma chave idempotente evita repetir efeitos quando o cliente reenvia a mesma solicitação.', 'É carimbar uma missão para que uma segunda entrega do mesmo comprovante não duplique a recompensa.', 'typescript', 'await banco.transacao(async (tx) => {\n  if (await tx.eventos.existe(chave)) return\n  await tx.progresso.adicionarXp(userId, 20)\n  await tx.eventos.registrar(chave)\n})', 'Desenhe uma conclusão de pagamento que suporte repetição da requisição.', 'Conceder recompensa antes de registrar a conclusão única da operação.'),
      l('background-jobs', 'Trabalho fora da resposta imediata', 'Filas, jobs e repetição', 'Tarefas demoradas podem ir para uma fila após a operação principal ser confirmada. Jobs precisam ser idempotentes, observáveis e ter política de tentativa que não sobrecarregue dependências.', 'É enviar uma ordem para a oficina com protocolo, em vez de manter o visitante esperando no balcão.', 'typescript', 'await fila.publicar("enviar-certificado", { userId, aulaId })\nreturn resposta.status(202).json({ status: "agendado" })', 'Modele envio de e-mail em fila com tentativas e fila de falhas.', 'Repetir jobs sem idempotência e produzir mensagens ou cobranças duplicadas.'),
    ],
  },
  {
    topicId: 'backend', levelId: 'advanced', lessons: [
      l('architecture', 'Escolhendo fronteiras de serviço', 'Monólito modular e serviços', 'Fronteiras devem acompanhar capacidades de negócio e necessidades reais de escala ou autonomia. Um monólito modular costuma preservar simplicidade até que evidências justifiquem distribuição.', 'É manter equipes em um forte bem organizado antes de construir várias fortalezas com pontes complexas.', 'text', 'domínio/progresso\n  aplicação\n  contratos\n  infraestrutura\n\ndomínio/estudos\n  aplicação\n  contratos\n  infraestrutura', 'Compare monólito modular e microsserviços para uma equipe pequena e um domínio em evolução.', 'Distribuir cedo e trocar chamadas locais por rede sem benefício mensurável.'),
      l('observability', 'Observabilidade que responde perguntas', 'Logs, métricas e traces', 'Logs registram eventos, métricas revelam tendências e traces conectam etapas de uma requisição. Inclua identificadores e contexto suficiente para investigar sem registrar segredos.', 'É combinar diário, placar e mapa de percurso para entender uma missão problemática.', 'json', '{\n  "level": "info",\n  "event": "lesson.completed",\n  "userId": "user_123",\n  "requestId": "req_456",\n  "durationMs": 42\n}', 'Defina sinais para investigar aumento de erros e lentidão em conclusão de aulas.', 'Coletar grande volume de dados sem perguntas, retenção ou proteção de informações.'),
      l('scalability-security', 'Escala com limites e defesa em profundidade', 'Cache, rate limit e segurança', 'Escalar envolve reduzir trabalho repetido, proteger dependências e manter consistência aceitável. Cache precisa de invalidação; rate limit protege recursos; permissões e validação continuam obrigatórias.', 'É abrir mais portões sem retirar guardas, regras de lotação e sincronização do placar.', 'text', 'cliente -> rate limit -> API -> cache\n                         -> banco\nprincípio: negar por padrão e medir antes de ampliar', 'Projete leitura de ranking com cache, invalidação, limite e fallback.', 'Adicionar cache sem definir validade e servir dados incorretos após atualizações.'),
    ],
  },
]

function explainCodeLine(line: string, index: number, theme: string): string {
  const trimmed = line.trim()
  if (!trimmed) return 'Separa visualmente duas etapas do exemplo.'
  if (/^(#|\/\/)/.test(trimmed)) return 'Documenta a intenção da etapa seguinte.'
  if (/^(if|elif|else|SE |SENAO|WHERE|HAVING)/i.test(trimmed)) {
    return `Define uma decisão ou filtro necessário para ${theme.toLowerCase()}.`
  }
  if (/^(for|while|PARA |ENQUANTO)/i.test(trimmed)) {
    return `Inicia a repetição controlada usada em ${theme.toLowerCase()}.`
  }
  if (/^(return|RETORNAR)/i.test(trimmed)) return 'Entrega o resultado para quem iniciou a operação.'
  if (/^(SELECT|FROM|JOIN|GROUP BY|ORDER BY|LIMIT|WITH|BEGIN|COMMIT|UPDATE|CREATE)/i.test(trimmed)) {
    return `Compõe a etapa SQL de ${theme.toLowerCase()} sem esconder a intenção da consulta.`
  }
  if (/^(git |<|\.|@|export |import |function |def |class |const |let |async )/i.test(trimmed)) {
    return `Prepara ou executa uma parte explícita de ${theme.toLowerCase()}.`
  }
  return index === 0
    ? `Estabelece o ponto de partida do exemplo de ${theme.toLowerCase()}.`
    : `Avança o exemplo e torna observável a próxima etapa de ${theme.toLowerCase()}.`
}

function createLesson(
  topicId: StudyTopicId,
  levelId: StudyLevelId,
  seed: LessonSeed,
): StudyLesson {
  const topicLabel = topicLabels[topicId]
  const codeLines = seed.code.split('\n')

  return {
    id: `${topicId}-${levelId}-${seed.slug}-v1`,
    topicId,
    levelId,
    title: seed.title,
    lessonTheme: seed.theme,
    shortDescription: `${seed.concept.split('. ')[0]}.`,
    explanation: `${seed.concept} Nesta aula, o foco é reconhecer a intenção de cada etapa, testar um exemplo pequeno e explicar o resultado com palavras próprias antes de ampliar a solução.`,
    analogy: seed.analogy,
    codeExample: {
      language: seed.language,
      code: seed.code,
      lineByLine: codeLines.map((line, index) => ({
        line,
        explanation: explainCodeLine(line, index, seed.theme),
      })),
    },
    commonMistakes: [
      seed.pitfall,
      `Alterar várias ideias ao mesmo tempo sem testar a etapa de ${seed.theme.toLowerCase()}.`,
      'Copiar o exemplo sem conseguir explicar qual entrada muda e qual resultado é esperado.',
    ],
    miniActivity: {
      title: `Prática: ${seed.title}`,
      instructions: seed.activity,
      successCriteria: [
        `Aplicar conscientemente ${seed.theme.toLowerCase()}.`,
        'Testar pelo menos um caso comum e um caso de limite ou falha.',
        'Explicar o resultado e registrar uma melhoria possível.',
      ],
    },
    recommendedVideos: [
      {
        title: `${topicLabel} — busca de aulas no freeCodeCamp`,
        description: 'Vídeos complementares para observar o conceito em execução.',
        url: `https://www.youtube.com/@freecodecamp/search?query=${encodeURIComponent(`${topicLabel} ${seed.theme}`)}`,
      },
    ],
    trustedResources: [officialResources[topicId]],
    suggestedStrengths: [
      seed.theme.toLowerCase(),
      'leitura passo a passo',
      'explicação do raciocínio',
    ],
    suggestedReinforcements: [
      seed.pitfall.toLowerCase(),
      'testes com casos de limite',
    ],
  }
}

function createPath(seed: PathSeed): StudyLearningPath {
  const topicLabel = topicLabels[seed.topicId]
  const levelLabel = levelLabels[seed.levelId]

  return {
    id: `${seed.topicId}-${seed.levelId}-v1`,
    topicId: seed.topicId,
    levelId: seed.levelId,
    title: `${topicLabel}: trilha ${levelLabel.toLowerCase()}`,
    description: `Três aulas progressivas para ${levelGoals[seed.levelId]} em ${topicLabel}.`,
    lessons: seed.lessons.map((lesson) => createLesson(seed.topicId, seed.levelId, lesson)),
  }
}

export function expandStudyLearningPaths(
  existingPaths: StudyLearningPath[],
): StudyLearningPath[] {
  const pathBySelection = new Map(
    existingPaths.map((path) => [`${path.topicId}:${path.levelId}`, path]),
  )

  pathSeeds.forEach((seed) => {
    const key = `${seed.topicId}:${seed.levelId}`
    const generatedPath = createPath(seed)
    const existingPath = pathBySelection.get(key)

    if (!existingPath) {
      pathBySelection.set(key, generatedPath)
      return
    }

    const existingLessonIds = new Set(existingPath.lessons.map((lesson) => lesson.id))
    pathBySelection.set(key, {
      ...existingPath,
      lessons: [
        ...existingPath.lessons,
        ...generatedPath.lessons.filter((lesson) => !existingLessonIds.has(lesson.id)),
      ],
    })
  })

  return [...pathBySelection.values()]
}
