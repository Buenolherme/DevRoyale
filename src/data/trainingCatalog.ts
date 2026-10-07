import type { StudyTopicId } from '@/types'

export interface TrainingProject { title: string; criteria: string[] }
export const trainingProjects: Record<StudyTopicId, TrainingProject> = {
  logic: { title: 'Planejador de uma rodada', criteria: ['Descrever entradas, regras e saída em pseudocódigo.', 'Percorrer um caso válido e um inválido manualmente.', 'Explicar a condição que encerra a repetição.'] },
  python: { title: 'Lista de tarefas no terminal', criteria: ['Criar, listar e concluir tarefas com funções pequenas.', 'Tratar entrada inválida sem encerrar o programa.', 'Testar lista vazia e documentar como executar.'] },
  javascript: { title: 'Placar interativo', criteria: ['Adicionar e remover participantes sem duplicar o estado.', 'Calcular totais a partir de um array de objetos.', 'Testar dados vazios e separar cálculo de apresentação.'] },
  'html-css': { title: 'Painel da arena', criteria: ['Usar títulos, regiões e campos com semântica adequada.', 'Adaptar o layout a desktop e mobile sem overflow.', 'Testar teclado, foco, contraste e movimento reduzido.'] },
  sql: { title: 'Relatório de partidas', criteria: ['Modelar jogadores e partidas com chaves e restrições.', 'Consultar resultados com filtro, JOIN e agregação.', 'Explicar como NULL, duplicatas e tabelas vazias afetam o relatório.'] },
  'git-github': { title: 'Histórico revisável', criteria: ['Criar commits pequenos em um repositório de exercício.', 'Revisar diff e resolver um conflito compreendendo os dois lados.', 'Documentar como desfazer uma mudança sem reescrever histórico compartilhado.'] },
  frontend: { title: 'Mini aplicação de treinamento', criteria: ['Separar componentes e manter uma única fonte de estado.', 'Exibir loading, vazio, sucesso e erro de uma API de teste.', 'Navegar por teclado e testar formulário e rota inválida.'] },
  backend: { title: 'Contrato de uma API de tarefas', criteria: ['Definir rotas, entradas, respostas e erros sem dados privados.', 'Separar autenticação de autorização por recurso.', 'Descrever persistência, idempotência e testes de falha.'] },
}

export interface TrainingCareer {
  id: string
  title: string
  description: string
  modules: string[]
  future?: string
  project: TrainingProject
}

// References only: a career never copies lessons or awards another completion.
export const trainingCareers: TrainingCareer[] = [
  { id: 'foundations', title: 'Fundamentos de Programação', description: 'Entenda valores, decisões e repetição antes de competir.', modules: ['logic-never-coded-first-algorithms', 'python-never-coded-foundations', 'logic-basic-v1', 'python-basic-v1'], project: trainingProjects.logic },
  { id: 'frontend', title: 'Front-End', description: 'Estrutura e estilo → JavaScript → interfaces e dados remotos.', modules: ['logic-never-coded-first-algorithms', 'html-css-never-coded-v1', 'html-css-basic-v1', 'javascript-never-coded-v1', 'javascript-basic-practice', 'javascript-intermediate-v1', 'frontend-never-coded-v1', 'frontend-basic-v1', 'frontend-intermediate-v1', 'html-css-intermediate-v1'], project: trainingProjects.frontend },
  { id: 'backend', title: 'Back-End', description: 'Lógica → Python → contratos HTTP → dados e permissões.', modules: ['logic-never-coded-first-algorithms', 'python-never-coded-foundations', 'python-basic-v1', 'python-intermediate-v1', 'backend-never-coded-v1', 'sql-never-coded-v1', 'sql-basic-v1', 'backend-basic-v1', 'backend-intermediate-v1', 'git-github-never-coded-v1'], project: trainingProjects.backend },
  { id: 'fullstack', title: 'Full Stack', description: 'Conecte interface, contrato de API e persistência sem duplicar cursos.', modules: ['logic-never-coded-first-algorithms', 'html-css-never-coded-v1', 'html-css-basic-v1', 'javascript-never-coded-v1', 'javascript-basic-practice', 'javascript-intermediate-v1', 'frontend-never-coded-v1', 'frontend-basic-v1', 'backend-never-coded-v1', 'backend-basic-v1', 'sql-never-coded-v1', 'sql-basic-v1', 'git-github-basic-v1'], project: { title: 'Painel integrado de tarefas', criteria: ['Definir o contrato entre formulário, API e banco.', 'Representar loading, vazio, erro e sucesso na interface.', 'Documentar autorização e testar reenvio de uma operação.'] } },
  { id: 'data', title: 'Dados', description: 'Python e SQL para transformar, agrupar e interpretar pequenos conjuntos.', modules: ['python-never-coded-foundations', 'python-basic-v1', 'python-intermediate-v1', 'sql-never-coded-v1', 'sql-basic-v1', 'sql-intermediate-v1'], project: { title: 'Análise de resultados', criteria: ['Descrever os dados e a pergunta que será respondida.', 'Tratar dados ausentes e validar totais com um exemplo manual.', 'Apresentar uma consulta agregada e explicar os limites da conclusão.'] } },
  { id: 'cloud', title: 'Cloud', description: 'Preparação disponível: HTTP, versionamento, arquitetura e observabilidade.', modules: ['backend-never-coded-v1', 'git-github-never-coded-v1', 'git-github-basic-v1', 'backend-basic-v1', 'backend-advanced-v1'], future: 'Linux/Bash, redes, containers e fundamentos de provedores ainda não têm curso próprio. Este percurso é preparatório, não uma formação Cloud completa.', project: { title: 'Plano de operação de uma API', criteria: ['Desenhar o caminho cliente → API → banco e identificar falhas.', 'Definir sinais de saúde, timeout e política limitada de repetição.', 'Separar configuração pública de credenciais, sem publicar secrets.'] } },
]

export interface LessonPractice { bugId?: string; battleId?: string; concept: string }
export const lessonPractice: Record<string, LessonPractice> = {
  'python-never-coded-print-values-v1': { bugId: 'bug-python-never-print', battleId: 'python-never-hello', concept: 'Textos e saída com print' },
  'python-never-coded-values': { battleId: 'battle-v1-python-never-1', concept: 'Variáveis e mensagens' },
  'python-basic-loops-v1': { bugId: 'bug-python-basic-counter', battleId: 'battle-v1-python-basic-1', concept: 'Laços e acumulação; no bug, pratique a parada de while' },
  'python-basic-lists-v1': { battleId: 'battle-v1-python-basic-2', concept: 'Percorrer e filtrar listas' },
  'python-intermediate-functions-v1': { bugId: 'bug-python-intermediate-average', battleId: 'battle-v1-python-intermediate-2', concept: 'Funções com retorno e cálculo de média' },
  'python-intermediate-dictionaries-v1': { bugId: 'bug-python-intermediate-inventory', battleId: 'python-intermediate-frequency', concept: 'Chaves, valores e acumulação' },
  'javascript-never-coded-console-v1': { bugId: 'bug-javascript-never-log', battleId: 'javascript-never-hello', concept: 'Saída no console' },
  'javascript-basic-functions': { bugId: 'bug-javascript-basic-return', battleId: 'javascript-beginner-double', concept: 'Parâmetros e return' },
  'javascript-basic-arrays': { bugId: 'bug-javascript-intermediate-users', battleId: 'battle-v1-javascript-basic-1', concept: 'filter e map; o bug é um passo intermediário' },
  'javascript-basic-array-tools-v1': { bugId: 'bug-javascript-intermediate-users', battleId: 'battle-v1-javascript-basic-1', concept: 'Filtragem e transformação de arrays' },
  'javascript-basic-iteration-v1': { bugId: 'bug-javascript-basic-score', concept: 'Laços sobre arrays' },
  'javascript-intermediate-async-flow-v1': { bugId: 'bug-javascript-advanced-request', concept: 'Prática avançada de async/await e fetch' },
  'html-css-never-coded-document-structure-v1': { bugId: 'bug-html-css-never-title', battleId: 'html-css-never-hello', concept: 'Tags e hierarquia do documento' },
  'html-css-never-coded-text-links-v1': { battleId: 'battle-v1-html-css-never-2', concept: 'Links com destino e texto descritivo' },
  'html-css-basic-flex-layout-v1': { bugId: 'bug-html-css-intermediate-flex', battleId: 'battle-v1-html-css-basic-1', concept: 'Flexbox; o bug também exige responsividade' },
  'html-css-basic-forms-v1': { battleId: 'battle-v1-html-css-basic-2', concept: 'Associação label/input' },
  'html-css-intermediate-responsive-grid-v1': { bugId: 'bug-html-css-advanced-grid', battleId: 'battle-v1-html-css-intermediate-1', concept: 'Grid responsivo; o bug amplia para media queries' },
  'sql-never-coded-select-v1': { bugId: 'bug-sql-never-users', battleId: 'battle-v1-sql-never-1', concept: 'SELECT, FROM e colunas' },
  'sql-never-coded-filters-v1': { bugId: 'bug-sql-basic-where', battleId: 'sql-beginner-active-users', concept: 'Filtrar linhas com WHERE' },
  'sql-basic-ordering-v1': { bugId: 'bug-sql-intermediate-order', battleId: 'sql-beginner-products', concept: 'Ordenação com ORDER BY' },
  'sql-basic-aggregates-v1': { bugId: 'bug-sql-intermediate-summary', battleId: 'sql-basic-category-count', concept: 'GROUP BY e agregações' },
  'sql-basic-joins-v1': { bugId: 'bug-sql-advanced-customers', battleId: 'sql-intermediate-orders', concept: 'Relacionamentos; o bug aprofunda LEFT JOIN' },
  'sql-intermediate-ctes-v1': { battleId: 'battle-v1-sql-intermediate-2', concept: 'Consultas organizadas com WITH' },
}

export interface ConceptCheck { question: string; options: string[]; answer: number; explanation: string }
export const lessonChecks: Record<string, ConceptCheck> = {
  'logic-never-coded-simple-variables-v1': { question: 'O placar começa em 10 e recebe mais 5. Qual valor é mostrado?', options: ['10', '15', '105'], answer: 1, explanation: 'O estado é atualizado pela soma 10 + 5, resultando em 15.' },
  'python-never-coded-values': { question: 'O que a variável missoes_concluidas = 3 armazena?', options: ['Um inteiro', 'O texto "3"', 'Uma comparação'], answer: 0, explanation: 'Sem aspas, 3 é um valor inteiro. O sinal = associa esse valor ao nome.' },
  'python-never-coded-print-values-v1': { question: 'Qual saída corresponde a print(2 + 3)?', options: ['2 + 3', '23', '5'], answer: 2, explanation: 'A expressão numérica é calculada antes de print exibir 5.' },
  'python-basic-conditionals-v1': { question: 'Com xp = 180, qual ramo do exemplo é escolhido?', options: ['Ouro', 'Prata', 'Bronze'], answer: 1, explanation: '180 não alcança 200, mas atende xp >= 100; portanto o elif imprime Prata.' },
  'python-basic-loops-v1': { question: 'Quais valores range(1, 4) produz?', options: ['1, 2, 3', '1, 2, 3, 4', '0, 1, 2, 3'], answer: 0, explanation: 'O início é incluído e o limite final é excluído.' },
  'python-intermediate-functions-v1': { question: 'O que calcular_bonus(200, 0.1) retorna?', options: ['200', '20.0', 'Nada, porque falta print dentro da função'], answer: 1, explanation: 'return entrega o produto 200 × 0.1 ao chamador. print não é necessário para retornar.' },
  'python-intermediate-dictionaries-v1': { question: 'O que get permite ao consultar uma chave ausente?', options: ['Apagar o dicionário', 'Definir um valor padrão', 'Renomear todas as chaves'], answer: 1, explanation: 'get(chave, padrão) evita KeyError nessa consulta e devolve o padrão quando a chave não existe.' },
  'javascript-never-coded-values-v1': { question: 'Qual declaração permite reatribuir xp?', options: ['const xp = 10', 'let xp = 10', 'Ambas'], answer: 1, explanation: 'let permite reatribuição. const impede reatribuir a ligação, mas não torna objetos profundamente imutáveis.' },
  'javascript-basic-iteration-v1': { question: 'Qual total o array [10, 20, 15] produz no exemplo?', options: ['15', '35', '45'], answer: 2, explanation: 'O acumulador começa em zero e recebe cada valor uma única vez: 0 + 10 + 20 + 15.' },
  'javascript-basic-array-tools-v1': { question: 'Depois de filtrar notas >= 7 e dobrá-las, qual array resulta de [4, 7, 9]?', options: ['[8, 14, 18]', '[14, 18]', '[7, 9]'], answer: 1, explanation: 'filter remove 4; map transforma 7 e 9 em 14 e 18 sem alterar o array inicial.' },
  'javascript-intermediate-async-flow-v1': { question: 'fetch rejeita automaticamente a Promise quando o servidor retorna 404?', options: ['Sim', 'Não: é preciso verificar resposta.ok'], answer: 1, explanation: 'Uma resposta HTTP de erro ainda é uma resposta; a validação de status é responsabilidade do código.' },
  'html-css-basic-box-model-v1': { question: 'Com border-box, a largura declarada inclui padding e borda?', options: ['Sim, mas não a margem', 'Não inclui nenhum dos dois'], answer: 0, explanation: 'border-box inclui conteúdo, padding e borda; margem permanece fora da largura declarada.' },
  'html-css-basic-flex-layout-v1': { question: 'justify-content alinha em qual eixo?', options: ['Sempre vertical', 'No eixo principal definido por flex-direction', 'Sempre transversal'], answer: 1, explanation: 'O eixo principal muda com flex-direction. align-items atua no eixo transversal.' },
  'html-css-basic-forms-v1': { question: 'Qual associação conecta label e input?', options: ['Mesmo placeholder', 'for do label igual ao id do input'], answer: 1, explanation: 'A associação explícita usa for/id. Placeholder não substitui um label.' },
  'sql-never-coded-select-v1': { question: 'SELECT nome FROM jogadores altera registros?', options: ['Não: consulta a coluna nome', 'Sim: renomeia a tabela'], answer: 0, explanation: 'Esta consulta apenas lê a projeção nome. Alterações exigem comandos apropriados como UPDATE.' },
  'sql-never-coded-filters-v1': { question: 'Qual cláusula filtra linhas antes da agregação?', options: ['ORDER BY', 'WHERE', 'LIMIT'], answer: 1, explanation: 'WHERE aplica a condição às linhas. HAVING filtra grupos depois da agregação.' },
  'sql-basic-joins-v1': { question: 'Qual JOIN preserva todas as linhas da tabela à esquerda?', options: ['INNER JOIN', 'LEFT JOIN'], answer: 1, explanation: 'LEFT JOIN preserva a esquerda e usa NULL para colunas da direita sem correspondência.' },
  'backend-intermediate-authentication-v1': { question: 'Estar autenticado permite editar qualquer recurso?', options: ['Sim', 'Não: ainda é necessário autorizar o acesso'], answer: 1, explanation: 'Identidade não equivale a permissão; a autorização precisa considerar o recurso e a operação.' },
}
