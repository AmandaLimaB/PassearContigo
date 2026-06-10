# 8.3 Declaração Detalhada de Autoria e Utilização de Inteligência Artificial

Conforme exigido, o ficheiro autónomo `IA_Human_Help.md` encontra-se na raiz do repositório Git submetido, assim como aqui no relatório, presente logo abaixo.

## 8.3.1. Componente de Autoria e Execução Humana (Engenharia e Arquitetura)

### Conceção e Modelação UX/UI
Desenvolvimento integral do modelo conceptual, análise de tarefas, elaboração de storyboards e desenho dos protótipos de baixa e alta fidelidade (PBF/PAF), incluindo a fundamentação de todas as decisões com base em avaliações heurísticas de usabilidade.

### Arquitetura de Navegação e Rotas
Estruturação manual da árvore de navegação por abas com carregamento independente (*Lazy Loading*) centralizado no ficheiro `tabs-routing.module.ts`. Configuração manual do encaminhamento dinâmico aninhado e captura de parâmetros de estado (`viagem-detalhe/:id`) em tempo de execução através do serviço `ActivatedRoute`.

### Persistência de Dados e Autenticação
Desenho e modelação manual do esquema de tabelas locais de utilizadores e gestão do fluxo de autenticação local no ficheiro `sqlite.service.ts`. Planeamento e desenvolvimento da lógica de persistência híbrida e controlo de estados locais através do `Ionic Storage` e gestão de dados no `data.service.ts`.

### Controlo Nativo do Hardware
Criação do algoritmo de controlo periférico do dispositivo com o ecossistema Capacitor. Programação manual da escuta do acelerómetro (`@capacitor/motion`) no ciclo de vida global (`app.component.ts`), definindo a lógica matemática para processar o eixo X e forçar o bloqueio da orientação do ecrã em modo *portrait*.

### Design System e Identidade Visual
Escolha da palete de cores, definição da hierarquia visual, tipografia e diretrizes gerais de interface da aplicação **"PassearContigo"**.

---

## 8.3.2. Componente de Assistência por Inteligência Artificial (Produtividade e Boilerplate)

### Geração de Dados de Teste (*Mock Data*)
Automação no preenchimento e formatação do volume de registos estáticos estruturados no ficheiro `mock.json` (como listas de despesas e locais fictícios) para testar o comportamento da interface.

### Escrita de Código Repetitivo (*Boilerplate UI*)
Geração rápida de blocos HTML estruturais e redundantes da framework Ionic (repetições de elementos como `ion-item`, `ion-label` e `ion-card`) para posterior vinculação e refinação manual de dados pelo grupo.

### Transcrição e Expansão de CSS/SCSS
Tradução das diretrizes de design do grupo para código funcional, incluindo a geração mecânica de variações de tonalidades (*tints* e *shades* das propriedades customizadas no `variables.scss`), propriedades longas de alinhamento (*Flexbox*) e regras de responsividade.

### Suporte à Depuração Sintática (*Debugging*)
Resolução de pequenos conflitos estritos de tipagem em TypeScript durante o mapeamento de objetos, correção rápida de falhas de sintaxe e mitigação de avisos reportados.