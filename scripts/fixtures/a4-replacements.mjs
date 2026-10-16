// PUBLIC DEMONSTRATION DATA. All cases, oracles and solutions in this file are
// intentionally disclosed and MUST NEVER provision a competitive suite.
// Do not import test fixtures or reference solutions into the application bundle.
const common = { language: 'javascript', difficulty: 'advanced', validation_type: 'function_tests', is_active: true }
export const replacements = [
  { ...common, id: 'a4000000-0000-4000-8000-000000000001', slug: 'javascript-advanced-route-coupon',
    title: 'Rota mínima com um trecho gratuito', functionName: 'menorCusto',
    statement: 'Em um grafo dirigido, encontre o menor custo entre origem e destino. Você pode tornar gratuito no máximo um trecho da rota. Retorne -1 se não houver rota.',
    instructions: ['Implemente menorCusto(n, arestas, origem, destino). Cada aresta é [u, v, custo].',
      'Vértices de 0 a n-1; 1 <= n <= 80; até 400 arestas; custos inteiros de 0 a 1000000.',
      'Podem existir ciclos, laços e arestas paralelas. O cupom é opcional e só pode ser usado uma vez.',
      'Origem igual ao destino tem custo 0. Retorne somente o custo inteiro; qualquer algoritmo correto é aceito.'],
    starter_code: 'function menorCusto(n, arestas, origem, destino) {\n  // Retorne o custo ótimo usando no máximo um cupom.\n}\n',
    cases: [
      [4, [[0,1,8],[1,3,3],[0,2,4],[2,3,9]], 0, 3],
      [1, [], 0, 0], [3, [[0,1,4]], 0, 2], [2, [[0,1,7]], 0, 1],
      [4, [[0,1,4],[1,2,4],[2,3,4],[0,3,13]], 0, 3],
      [5, [[0,1,2],[1,2,9],[2,4,2],[0,3,7],[3,4,7]], 0, 4],
      [3, [[0,1,0],[1,0,0],[1,2,8]], 0, 2],
      [4, [[0,1,100],[0,1,3],[1,2,4],[2,3,5],[2,1,1]], 0, 3],
      [3, [[0,0,9],[0,1,6],[1,2,2]], 0, 2], [3, [[0,1,2],[1,2,4]], 2, 0],
      [80, Array.from({length:79}, (_,i)=>[i,i+1,(i%7+1)*1000]), 0, 79],
    ],
    reference: `function menorCusto(n, edges, s, t) {
      const d = Array.from({length:n},()=>[Infinity,Infinity]); d[s][0]=0;
      for(let k=0;k<2*n;k++) for(const [u,v,w] of edges) {
        d[v][1]=Math.min(d[v][1],d[u][1]+w,d[u][0]); d[v][0]=Math.min(d[v][0],d[u][0]+w);
      } const answer=Math.min(...d[t]); return answer===Infinity?-1:answer;
    }`,
    alternative: `const menorCusto = async (n, edges, s, t) => {
      const d=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?0:Infinity));
      for(const [u,v,w] of edges)d[u][v]=Math.min(d[u][v],w);
      for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)d[i][j]=Math.min(d[i][j],d[i][k]+d[k][j]);
      let result=d[s][t]; for(const [u,v] of edges)result=Math.min(result,d[s][u]+d[v][t]);
      return Number.isFinite(result)?result:-1;
    };`,
    wrong: 'function menorCusto() { return 0; }',
    // Correct only for the public case: must fail submit while run can succeed.
    publicOnly: 'function menorCusto() { return 3; }',
  },
  { ...common, id: 'a4000000-0000-4000-8000-000000000002', slug: 'javascript-advanced-weighted-schedule',
    title: 'Agenda ótima com limite de trabalhos', functionName: 'lucroMaximo',
    statement: 'Escolha até limite trabalhos sem sobreposição para maximizar o lucro total. Resolver apenas pelo maior lucro ou pelo término mais cedo não garante o ótimo.',
    instructions: ['Implemente lucroMaximo(trabalhos, limite). Cada trabalho é [inicio, fim, lucro].',
      'Até 80 trabalhos; 0 <= limite <= 50; tempos inteiros entre 0 e 1000, com inicio < fim; lucros inteiros entre 0 e 1000000.',
      'Os trabalhos não estão necessariamente ordenados. Um trabalho pode começar exatamente quando outro termina.',
      'Escolher nenhum trabalho é permitido. Retorne somente o lucro máximo inteiro.'],
    starter_code: 'function lucroMaximo(trabalhos, limite) {\n  // Combine compatibilidade de intervalos e o limite de escolhas.\n}\n',
    cases: [
      [[[1,3,6],[3,5,6],[1,5,10]],2], [[],3], [[[0,1,9]],0],
      [[[0,5,20],[0,2,11],[2,5,11]],2], [[[0,5,20],[0,2,11],[2,5,11]],1],
      [[[5,6,8],[1,2,4],[3,5,6],[2,3,5]],3],
      [[[0,3,7],[0,3,9],[0,3,9]],5], [[[0,1,0],[1,2,0]],2],
      [[[0,2,5],[1,3,10],[2,4,6],[4,6,5],[3,6,1]],2],
      [Array.from({length:80},(_,i)=>[i*2,i*2+2,(i%5+1)*100]),50],
    ],
    reference: `function lucroMaximo(jobs, k) {
      const a=jobs.slice().sort((a,b)=>a[1]-b[1]); const dp=Array.from({length:a.length+1},()=>Array(k+1).fill(0));
      for(let i=1;i<=a.length;i++){let lo=0,hi=i-1; while(lo<hi){const mid=Math.ceil((lo+hi)/2); if(a[mid-1][1]<=a[i-1][0])lo=mid;else hi=mid-1;}
        for(let c=1;c<=k;c++)dp[i][c]=Math.max(dp[i-1][c],a[i-1][2]+dp[lo][c-1]);}
      return dp[a.length][k];
    }`,
    alternative: `function lucroMaximo(jobs, k) {
      const a=jobs.slice().sort((a,b)=>a[0]-b[0]); const memo=new Map();
      function solve(i,c){if(i===a.length||c===0)return 0;const key=i+':'+c;if(memo.has(key))return memo.get(key);
        let j=i+1;while(j<a.length&&a[j][0]<a[i][1])j++;
        const value=Math.max(solve(i+1,c),a[i][2]+solve(j,c-1));memo.set(key,value);return value;}
      return solve(0,k);
    }`,
    wrong: 'function lucroMaximo(jobs, k) { return jobs.map(x=>x[2]).sort((a,b)=>b-a).slice(0,k).reduce((a,b)=>a+b,0); }',
    publicOnly: 'function lucroMaximo() { return 12; }',
  },
  { ...common, id: 'a4000000-0000-4000-8000-000000000003', slug: 'javascript-advanced-critical-path',
    title: 'Prazo mínimo de um projeto com dependências', functionName: 'tempoProjeto',
    statement: 'Calcule o prazo mínimo para terminar todas as tarefas com paralelismo ilimitado. Uma tarefa só começa após todas as suas dependências. Retorne -1 se houver qualquer ciclo.',
    instructions: ['Implemente tempoProjeto(duracoes, dependencias). [u, v] significa que u deve terminar antes de v começar.',
      'De 1 a 100 tarefas; durações inteiras entre 0 e 1000000; até 500 dependências, sem pares duplicados.',
      'Tarefas sem dependências começam no instante 0. Componentes desconectados também devem terminar.',
      'Detecte ciclos inclusive em componentes desconectados e laços [u,u]. Retorne o prazo inteiro ou -1.'],
    starter_code: 'function tempoProjeto(duracoes, dependencias) {\n  // Considere caminhos críticos e ciclos em todo o projeto.\n}\n',
    cases: [
      [[3,5,2],[[0,2],[1,2]]], [[0],[]], [[7],[[0,0]]], [[1,2,3],[]],
      [[4,2,6,3],[[0,1],[0,2],[1,3],[2,3]]],
      [[2,3,4,5],[[0,1],[2,3],[3,2]]], [[0,0,1],[[0,1],[1,2]]],
      [[8,3,2,5,4],[[1,2],[2,4]]], [[1,2],[[0,1],[1,0]]],
      [Array.from({length:100},()=>10000),Array.from({length:99},(_,i)=>[i,i+1])],
    ],
    reference: `function tempoProjeto(d, edges) {
      const n=d.length,adj=Array.from({length:n},()=>[]),deg=Array(n).fill(0),end=d.slice();
      for(const [u,v] of edges){adj[u].push(v);deg[v]++;} const q=[];for(let i=0;i<n;i++)if(!deg[i])q.push(i);
      for(let i=0;i<q.length;i++)for(const v of adj[q[i]]){end[v]=Math.max(end[v],end[q[i]]+d[v]);if(--deg[v]===0)q.push(v);}
      return q.length===n?Math.max(...end):-1;
    }`,
    alternative: `const tempoProjeto=(d,edges)=>{
      const pred=d.map(()=>[]),state=d.map(()=>0),memo=d.map(()=>0);let cycle=false;
      for(const [u,v] of edges)pred[v].push(u);
      function dfs(v){if(state[v]===1){cycle=true;return 0;}if(state[v]===2)return memo[v];state[v]=1;
        let start=0;for(const u of pred[v])start=Math.max(start,dfs(u));state[v]=2;return memo[v]=start+d[v];}
      const result=Math.max(...d.map((_,i)=>dfs(i)));return cycle?-1:result;
    };`,
    wrong: 'function tempoProjeto(d) { return d.reduce((a,b)=>a+b,0); }',
    publicOnly: 'function tempoProjeto() { return 7; }',
  },
]

// Trusted, independent fixture oracles. These are not submitted player code.
export function expectedFor(challenge, args) {
  if (challenge.functionName === 'menorCusto') {
    const [n,edges,s,t]=args, d=Array(2*n).fill(Infinity), done=Array(2*n).fill(false);d[s*2]=0;
    for(let step=0;step<2*n;step++) {let u=-1;for(let i=0;i<2*n;i++)if(!done[i]&&(u<0||d[i]<d[u]))u=i;
      if(u<0||!Number.isFinite(d[u]))break;done[u]=true;
      for(const [a,b,w] of edges)if(a===Math.floor(u/2)){d[b*2+u%2]=Math.min(d[b*2+u%2],d[u]+w);if(u%2===0)d[b*2+1]=Math.min(d[b*2+1],d[u]);}}
    const r=Math.min(d[t*2],d[t*2+1]);return Number.isFinite(r)?r:-1;
  }
  if (challenge.functionName === 'lucroMaximo') {
    const [jobs,k]=args;
    // Sparse search over end-times and count, independent of the submitted DPs.
    let states=new Map([['0:0',0]]);
    for(const [s,e,p] of jobs.slice().sort((a,b)=>a[1]-b[1])) {
      const next=new Map(states);for(const [key,value] of states){const [end,count]=key.split(':').map(Number);
        if(end<=s&&count<k){const key2=e+':'+(count+1);next.set(key2,Math.max(next.get(key2)??0,value+p));}}
      states=next;
    } return Math.max(...states.values());
  }
  const [d,edges]=args, n=d.length, reach=Array.from({length:n},()=>Array(n).fill(false));
  for(const [u,v] of edges)reach[u][v]=true;
  for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)reach[i][j] ||= reach[i][k]&&reach[k][j];
  if(reach.some((row,i)=>row[i]))return -1;
  const end=d.slice();for(let pass=0;pass<n;pass++)for(const [u,v] of edges)end[v]=Math.max(end[v],end[u]+d[v]);
  return Math.max(...end);
}

export const replacementCatalog = replacements.map(({cases,reference,alternative,wrong,publicOnly,functionName,...publicFields}) => ({
  ...publicFields, judge_config: {functionName},
  public_examples: [{input: {args: cases[0]}, output: expectedFor({functionName}, cases[0])}],
}))
export const replacementTests = replacements.flatMap(challenge=>challenge.cases.map((args,i)=>({
  challenge_id:challenge.id, is_public:i===0, ordinal:i===0?1:i,
  input:{args}, expected:expectedFor(challenge,args), validator_config:{}, weight:1,
})))
