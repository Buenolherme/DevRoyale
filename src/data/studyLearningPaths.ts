import type {
  StudyLearningPath,
  StudyLevelOption,
  StudyTopicOption,
} from '@/types'
import { expandStudyLearningPaths } from './studyLearningPathsExpansion'

export const studyTopicOptions: StudyTopicOption[] = [
  {
    id: 'python',
    label: 'Python',
    description: 'Fundamentos, automação e resolução de problemas com sintaxe direta.',
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    description: 'Lógica e interatividade para aplicações web modernas.',
  },
  {
    id: 'html-css',
    label: 'HTML/CSS',
    description: 'Estrutura, estilo, acessibilidade e layouts responsivos.',
  },
  {
    id: 'sql',
    label: 'SQL',
    description: 'Consultas e organização de dados relacionais.',
  },
  {
    id: 'git-github',
    label: 'Git/GitHub',
    description: 'Versionamento, colaboração e histórico seguro de código.',
  },
  {
    id: 'logic',
    label: 'Lógica de Programação',
    description: 'Raciocínio estruturado antes de escolher uma linguagem.',
  },
  {
    id: 'frontend',
    label: 'Frontend',
    description: 'Interfaces úteis, acessíveis e conectadas a dados.',
  },
  {
    id: 'backend',
    label: 'Backend',
    description: 'APIs, regras de negócio, segurança e persistência.',
  },
]

export const studyLevelOptions: StudyLevelOption[] = [
  {
    id: 'never-coded',
    label: 'Nunca programei',
    description: 'Começa do zero e explica cada termo antes de usá-lo.',
  },
  {
    id: 'basic',
    label: 'Básico',
    description: 'Reforça fundamentos e transforma conhecimento solto em prática.',
  },
  {
    id: 'intermediate',
    label: 'Intermediário',
    description: 'Aprofunda decisões de implementação e organização do código.',
  },
  {
    id: 'advanced',
    label: 'Avançado',
    description: 'Explora arquitetura, trade-offs, desempenho e manutenção.',
  },
]

const originalStudyLearningPaths: StudyLearningPath[] = [
  {
    id: 'python-never-coded-foundations',
    topicId: 'python',
    levelId: 'never-coded',
    title: 'Python: seu primeiro mapa de código',
    description:
      'Uma entrada gentil em programação: valores, decisões e pequenos programas que você consegue explicar.',
    lessons: [
      {
        id: 'python-never-coded-values',
        topicId: 'python',
        levelId: 'never-coded',
        title: 'Dando nomes às informações',
        lessonTheme: 'Variáveis, textos e números',
        shortDescription:
          'Aprenda a guardar informações e usá-las para montar uma mensagem.',
        explanation:
          'Um programa trabalha com valores. Alguns representam texto, outros representam números, respostas de sim ou não e muitas outras coisas. Uma variável dá um nome útil a um valor para que ele possa ser lido e reutilizado. Em Python, você cria essa associação com o sinal de igual. O nome fica à esquerda e o valor à direita. Bons nomes reduzem a necessidade de comentários porque já contam qual papel aquela informação cumpre.',
        analogy:
          'Imagine uma estante com caixas etiquetadas. A etiqueta “nome_do_dev” permite encontrar a caixa certa sem precisar abri-la primeiro. A variável é a etiqueta; o valor é o conteúdo guardado.',
        codeExample: {
          language: 'python',
          code: 'nome_do_dev = "Lia"\nmissoes_concluidas = 3\nprint(f"{nome_do_dev} concluiu {missoes_concluidas} missões")',
          lineByLine: [
            {
              line: 'nome_do_dev = "Lia"',
              explanation: 'Guarda o texto Lia em uma variável com nome descritivo.',
            },
            {
              line: 'missoes_concluidas = 3',
              explanation: 'Guarda o número inteiro 3 para representar uma quantidade.',
            },
            {
              line: 'print(f"{nome_do_dev} concluiu {missoes_concluidas} missões")',
              explanation:
                'Monta uma frase com os dois valores e envia o resultado para a tela.',
            },
          ],
        },
        commonMistakes: [
          'Colocar aspas no nome da variável em vez de apenas no texto.',
          'Usar nomes genéricos como a ou coisa, que escondem a intenção.',
          'Tentar juntar texto e número com + sem converter o número.',
        ],
        miniActivity: {
          title: 'Seu cartão de aventureiro',
          instructions:
            'Crie variáveis para seu nome, sua linguagem de interesse e o número de horas que deseja estudar por semana. Depois, exiba tudo em uma frase.',
          successCriteria: [
            'Usar três variáveis com nomes claros.',
            'Guardar pelo menos um texto e um número.',
            'Exibir uma frase que use os três valores.',
          ],
        },
        recommendedVideos: [
          {
            title: 'Python para iniciantes — busca do freeCodeCamp',
            description: 'Aulas em vídeo para observar os fundamentos em prática.',
            url: 'https://www.youtube.com/@freecodecamp/search?query=python%20beginner',
          },
        ],
        trustedResources: [
          {
            title: 'Tutorial oficial de Python',
            description: 'Material mantido pelo projeto Python para consulta complementar.',
            url: 'https://docs.python.org/pt-br/3/tutorial/',
          },
        ],
        suggestedStrengths: [
          'nomeação de variáveis',
          'distinção entre texto e número',
          'leitura de expressões simples',
        ],
        suggestedReinforcements: [
          'diferença entre nome e valor',
          'formatação de mensagens',
        ],
      },
      {
        id: 'python-never-coded-decisions',
        topicId: 'python',
        levelId: 'never-coded',
        title: 'Escolhendo caminhos com condições',
        lessonTheme: 'Comparações e if/else',
        shortDescription:
          'Faça o programa responder de maneiras diferentes conforme uma regra.',
        explanation:
          'Uma condição transforma uma comparação em uma escolha. O bloco if é executado quando a comparação é verdadeira; o bloco else cobre o caminho alternativo. Em Python, os dois-pontos anunciam o início de um bloco e a indentação mostra quais linhas pertencem a ele. A regra fica mais fácil de testar quando descreve uma pergunta objetiva, como “a pontuação chegou ao mínimo?”.',
        analogy:
          'É como uma porta da arena com uma regra simples: quem tem pelo menos 100 pontos entra na disputa final; quem ainda não chegou recebe uma orientação diferente.',
        codeExample: {
          language: 'python',
          code: 'pontos = 85\nif pontos >= 100:\n    print("Arena final liberada")\nelse:\n    print(f"Faltam {100 - pontos} pontos")',
          lineByLine: [
            {
              line: 'pontos = 85',
              explanation: 'Define o valor que será comparado.',
            },
            {
              line: 'if pontos >= 100:',
              explanation: 'Pergunta se pontos é maior ou igual a 100.',
            },
            {
              line: '    print("Arena final liberada")',
              explanation: 'Executa somente quando a comparação é verdadeira.',
            },
            {
              line: 'else:',
              explanation: 'Abre o caminho usado quando a comparação é falsa.',
            },
            {
              line: '    print(f"Faltam {100 - pontos} pontos")',
              explanation: 'Calcula a diferença e informa quanto falta.',
            },
          ],
        },
        commonMistakes: [
          'Esquecer os dois-pontos depois de if ou else.',
          'Misturar espaços de indentação e deixar linhas fora do bloco.',
          'Usar = para comparar quando o operador correto é ==.',
        ],
        miniActivity: {
          title: 'Classificador de energia',
          instructions:
            'Crie uma variável energia. Mostre “Pronto para batalha” quando ela for pelo menos 50 e “Recarregue primeiro” nos demais casos.',
          successCriteria: [
            'Comparar a energia com 50.',
            'Ter um caminho if e um caminho else.',
            'Testar o programa com um valor abaixo e outro acima do limite.',
          ],
        },
        recommendedVideos: [
          {
            title: 'Condições em Python — busca do freeCodeCamp',
            description: 'Demonstrações visuais de decisões simples em Python.',
            url: 'https://www.youtube.com/@freecodecamp/search?query=python%20if%20else',
          },
        ],
        trustedResources: [
          {
            title: 'Controle de fluxo — documentação Python',
            description: 'Referência oficial sobre if e outras estruturas de fluxo.',
            url: 'https://docs.python.org/pt-br/3/tutorial/controlflow.html',
          },
        ],
        suggestedStrengths: [
          'construção de comparações',
          'leitura de caminhos alternativos',
          'indentação de blocos',
        ],
        suggestedReinforcements: [
          'operadores relacionais',
          'diferença entre atribuição e comparação',
        ],
      },
    ],
  },
  {
    id: 'javascript-basic-practice',
    topicId: 'javascript',
    levelId: 'basic',
    title: 'JavaScript: fundamentos em movimento',
    description:
      'Uma trilha para organizar o que você já conhece e praticar transformações previsíveis de dados.',
    lessons: [
      {
        id: 'javascript-basic-functions',
        topicId: 'javascript',
        levelId: 'basic',
        title: 'Funções com uma responsabilidade clara',
        lessonTheme: 'Parâmetros, retorno e escopo',
        shortDescription:
          'Agrupe uma regra em uma função pequena e reutilize o resultado.',
        explanation:
          'Uma função dá nome a uma transformação. Os parâmetros representam os dados de entrada, e return entrega o resultado para o ponto que chamou a função. Uma função pequena costuma ser mais fácil de testar porque responde a uma pergunta específica. Evite misturar cálculo, alteração de tela e armazenamento no mesmo bloco quando essas tarefas podem ser separadas.',
        analogy:
          'Pense em uma forja com uma receita conhecida. Você entrega os materiais pelos parâmetros, a forja executa uma única técnica e devolve a peça pronta pelo return.',
        codeExample: {
          language: 'javascript',
          code: 'function calcularNivel(xp) {\n  return Math.floor(xp / 100) + 1;\n}\n\nconst nivelAtual = calcularNivel(240);\nconsole.log(nivelAtual);',
          lineByLine: [
            {
              line: 'function calcularNivel(xp) {',
              explanation: 'Declara uma função e define xp como entrada.',
            },
            {
              line: 'return Math.floor(xp / 100) + 1;',
              explanation: 'Calcula um nível inteiro e devolve o valor.',
            },
            {
              line: 'const nivelAtual = calcularNivel(240);',
              explanation: 'Executa a função com 240 e guarda o retorno.',
            },
            {
              line: 'console.log(nivelAtual);',
              explanation: 'Mostra o resultado sem colocar essa responsabilidade na função.',
            },
          ],
        },
        commonMistakes: [
          'Confundir console.log com return.',
          'Ler uma variável externa quando ela poderia ser um parâmetro.',
          'Criar uma função que executa várias tarefas sem relação direta.',
        ],
        miniActivity: {
          title: 'Calculadora de recompensa',
          instructions:
            'Crie uma função que receba pontos base e um bônus, some os dois e devolva o total. Use a função duas vezes com valores diferentes.',
          successCriteria: [
            'Receber os dois valores por parâmetros.',
            'Devolver o total com return.',
            'Guardar ou exibir os dois resultados fora da função.',
          ],
        },
        recommendedVideos: [
          {
            title: 'Funções em JavaScript — busca do freeCodeCamp',
            description: 'Exemplos em vídeo sobre parâmetros e valores de retorno.',
            url: 'https://www.youtube.com/@freecodecamp/search?query=javascript%20functions',
          },
        ],
        trustedResources: [
          {
            title: 'Funções — Guia JavaScript da MDN',
            description: 'Referência da MDN sobre declaração e uso de funções.',
            url: 'https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Guide/Functions',
          },
        ],
        suggestedStrengths: [
          'definição de entradas e saídas',
          'funções pequenas',
          'reutilização de regras',
        ],
        suggestedReinforcements: [
          'escopo de variáveis',
          'diferença entre executar e referenciar uma função',
        ],
      },
      {
        id: 'javascript-basic-arrays',
        topicId: 'javascript',
        levelId: 'basic',
        title: 'Transformando listas sem perder a origem',
        lessonTheme: 'Arrays, filter e map',
        shortDescription:
          'Selecione e transforme dados com operações que preservam a lista original.',
        explanation:
          'Um array organiza valores em sequência. O método filter cria uma nova lista apenas com os itens que passam por uma condição. O método map cria outra lista transformando cada item. Como ambos devolvem novos arrays, o fluxo fica mais previsível e a coleção original pode continuar sendo usada. Dê nomes intermediários quando uma cadeia de operações começar a esconder a intenção.',
        analogy:
          'Imagine uma fila de candidatos. O filter funciona como a triagem que seleciona quem atende ao requisito. O map é a bancada seguinte, que entrega um crachá novo para cada pessoa selecionada.',
        codeExample: {
          language: 'javascript',
          code: 'const pontuacoes = [45, 80, 120];\nconst aprovadas = pontuacoes.filter((pontos) => pontos >= 80);\nconst comBonus = aprovadas.map((pontos) => pontos + 10);\nconsole.log(comBonus);',
          lineByLine: [
            {
              line: 'const pontuacoes = [45, 80, 120];',
              explanation: 'Cria a lista original com três números.',
            },
            {
              line: 'const aprovadas = pontuacoes.filter((pontos) => pontos >= 80);',
              explanation: 'Mantém somente os valores iguais ou superiores a 80.',
            },
            {
              line: 'const comBonus = aprovadas.map((pontos) => pontos + 10);',
              explanation: 'Cria uma nova lista somando 10 a cada valor aprovado.',
            },
            {
              line: 'console.log(comBonus);',
              explanation: 'Exibe a lista final; pontuacoes permanece intacta.',
            },
          ],
        },
        commonMistakes: [
          'Esperar que map ou filter modifique a lista original.',
          'Usar map quando o objetivo é apenas selecionar alguns itens.',
          'Esquecer o return em uma arrow function que usa chaves.',
        ],
        miniActivity: {
          title: 'Missões prioritárias',
          instructions:
            'A partir de uma lista de níveis [1, 4, 2, 5], mantenha apenas os níveis 3 ou maiores e transforme cada número no texto “Missão nível X”.',
          successCriteria: [
            'Usar filter para selecionar os níveis.',
            'Usar map para criar as mensagens.',
            'Manter a lista original sem alterações.',
          ],
        },
        recommendedVideos: [
          {
            title: 'Métodos de array — busca do freeCodeCamp',
            description: 'Revisões em vídeo de map, filter e outros métodos.',
            url: 'https://www.youtube.com/@freecodecamp/search?query=javascript%20array%20methods',
          },
        ],
        trustedResources: [
          {
            title: 'Array — referência JavaScript da MDN',
            description: 'Documentação dos arrays e de seus métodos.',
            url: 'https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/Array',
          },
        ],
        suggestedStrengths: [
          'leitura de callbacks',
          'transformações imutáveis',
          'escolha entre map e filter',
        ],
        suggestedReinforcements: [
          'retorno de arrow functions',
          'encadeamento legível',
        ],
      },
    ],
  },
  {
    id: 'logic-never-coded-first-algorithms',
    topicId: 'logic',
    levelId: 'never-coded',
    title: 'Lógica: pense antes da sintaxe',
    description:
      'Aprenda a quebrar problemas em passos, testar decisões e reconhecer repetições sem depender de uma linguagem específica.',
    lessons: [
      {
        id: 'logic-never-coded-sequence',
        topicId: 'logic',
        levelId: 'never-coded',
        title: 'Transformando objetivos em passos',
        lessonTheme: 'Sequência e decomposição',
        shortDescription:
          'Divida uma tarefa grande em instruções pequenas, ordenadas e verificáveis.',
        explanation:
          'Um algoritmo é uma sequência finita de passos para alcançar um resultado. Antes de escrever código, identifique o que entra, qual transformação precisa acontecer e qual saída confirma o sucesso. Cada passo deve ser claro o bastante para que outra pessoa consiga executá-lo sem adivinhar intenções escondidas. Se um passo ainda contém várias ações, ele provavelmente pode ser decomposto.',
        analogy:
          'Uma receita não diz apenas “faça o jantar”. Ela separa ingredientes, preparo e resultado em uma ordem que pode ser repetida. Um algoritmo faz o mesmo com um problema.',
        codeExample: {
          language: 'pseudocode',
          code: 'INÍCIO\n  LER pontos_da_missao\n  SOMAR 10 aos pontos_da_missao\n  MOSTRAR pontos_da_missao\nFIM',
          lineByLine: [
            {
              line: 'INÍCIO',
              explanation: 'Marca onde a sequência começa.',
            },
            {
              line: 'LER pontos_da_missao',
              explanation: 'Recebe a informação de entrada.',
            },
            {
              line: 'SOMAR 10 aos pontos_da_missao',
              explanation: 'Aplica a transformação desejada.',
            },
            {
              line: 'MOSTRAR pontos_da_missao',
              explanation: 'Entrega uma saída que permite conferir o resultado.',
            },
            {
              line: 'FIM',
              explanation: 'Indica que não existem outros passos.',
            },
          ],
        },
        commonMistakes: [
          'Começar pela solução sem definir entrada e resultado esperado.',
          'Escrever passos vagos como “resolver os dados”.',
          'Pular uma etapa porque ela parece óbvia para quem criou o algoritmo.',
        ],
        miniActivity: {
          title: 'Algoritmo do acesso seguro',
          instructions:
            'Escreva em pseudocódigo os passos para receber um nome de usuário, conferir se ele não está vazio e mostrar uma saudação.',
          successCriteria: [
            'Identificar claramente a entrada.',
            'Separar conferência e mensagem em passos distintos.',
            'Definir qual saída aparece quando o nome é válido.',
          ],
        },
        recommendedVideos: [
          {
            title: 'Algoritmos e pensamento computacional — CS50',
            description: 'Aulas do CS50 para observar a decomposição de problemas.',
            url: 'https://www.youtube.com/@cs50/search?query=algorithms',
          },
        ],
        trustedResources: [
          {
            title: 'CS50x — Harvard',
            description: 'Curso aberto com fundamentos de ciência da computação.',
            url: 'https://cs50.harvard.edu/x/',
          },
        ],
        suggestedStrengths: [
          'decomposição de problemas',
          'ordenação de passos',
          'definição de entrada e saída',
        ],
        suggestedReinforcements: [
          'clareza das instruções',
          'critérios de sucesso',
        ],
      },
      {
        id: 'logic-never-coded-repetition',
        topicId: 'logic',
        levelId: 'never-coded',
        title: 'Reconhecendo o que se repete',
        lessonTheme: 'Laços e condição de parada',
        shortDescription:
          'Repita uma ação com controle e defina quando o processo deve terminar.',
        explanation:
          'Uma repetição evita copiar o mesmo passo várias vezes. Para que ela seja segura, você precisa identificar o estado inicial, a ação repetida, a mudança que acontece a cada rodada e a condição de parada. Sem mudança ou parada alcançável, o algoritmo pode continuar para sempre. Contadores são uma forma simples de acompanhar quantas rodadas já ocorreram.',
        analogy:
          'Em um treino de três voltas, você começa na volta um, completa o circuito, atualiza o placar e para depois da terceira. Sem atualizar a volta, o treino nunca termina.',
        codeExample: {
          language: 'pseudocode',
          code: 'DEFINIR rodada como 1\nENQUANTO rodada <= 3\n  MOSTRAR "Treino da rodada", rodada\n  SOMAR 1 à rodada\nFIM ENQUANTO',
          lineByLine: [
            {
              line: 'DEFINIR rodada como 1',
              explanation: 'Cria o estado inicial antes da repetição.',
            },
            {
              line: 'ENQUANTO rodada <= 3',
              explanation: 'Repete somente enquanto a condição for verdadeira.',
            },
            {
              line: 'MOSTRAR "Treino da rodada", rodada',
              explanation: 'Executa a ação principal de cada rodada.',
            },
            {
              line: 'SOMAR 1 à rodada',
              explanation: 'Atualiza o contador para aproximá-lo da condição de parada.',
            },
            {
              line: 'FIM ENQUANTO',
              explanation: 'Fecha o bloco que será repetido.',
            },
          ],
        },
        commonMistakes: [
          'Esquecer de atualizar o valor usado na condição.',
          'Criar uma condição que já começa falsa sem perceber.',
          'Usar repetição quando três passos diferentes seriam mais claros.',
        ],
        miniActivity: {
          title: 'Contagem de missões',
          instructions:
            'Escreva um pseudocódigo que mostre as missões de 1 até 5 e, depois da repetição, exiba “Treino concluído”.',
          successCriteria: [
            'Começar o contador em 1.',
            'Atualizar o contador em cada rodada.',
            'Encerrar após mostrar a missão 5.',
          ],
        },
        recommendedVideos: [
          {
            title: 'Loops e repetição — busca do CS50',
            description: 'Explicações em vídeo sobre repetição e controle de fluxo.',
            url: 'https://www.youtube.com/@cs50/search?query=loops',
          },
        ],
        trustedResources: [
          {
            title: 'Loops e iteração — Guia JavaScript da MDN',
            description: 'Uma referência prática para ver esses conceitos em uma linguagem real.',
            url: 'https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Guide/Loops_and_iteration',
          },
        ],
        suggestedStrengths: [
          'identificação de padrões',
          'controle de contadores',
          'definição de parada',
        ],
        suggestedReinforcements: [
          'simulação passo a passo',
          'prevenção de repetição infinita',
        ],
      },
    ],
  },
]

export const studyLearningPaths = expandStudyLearningPaths(originalStudyLearningPaths)

export function getStudyLearningPath(
  topicId: StudyLearningPath['topicId'],
  levelId: StudyLearningPath['levelId'],
): StudyLearningPath | null {
  return (
    studyLearningPaths.find(
      (path) => path.topicId === topicId && path.levelId === levelId,
    ) ?? null
  )
}
