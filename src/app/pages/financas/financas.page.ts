import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SqliteService } from '../../services/sqlite.service';
import { Subscription } from 'rxjs';

// Interface auxiliar para os cálculos de despesa por categoria
export interface CategoryTotal {
  category: string;
  amount: number;
  percentage: number;
  colorVar: string;
}

@Component({
  selector: 'app-financas',
  templateUrl: './financas.page.html',
  styleUrls: ['./financas.page.scss'],
  standalone: false,
})
export class FinancasPage implements OnInit, OnDestroy {
  // Lista de despesas financeiras registadas
  expensesList: any[] = [];
  
  // Total somado de todas as despesas da viagem
  totalSpent = 0;

  // Lista sumarizada por categorias para as barras de progresso
  categoryTotals: CategoryTotal[] = [];

  // Viagem ativa mapeada da base de dados
  activeTrip: any | undefined;

  // Guarda o estado de prontidão do banco e a subscrição para evitar Memory Leaks
  isDbReady = false;
  private dbSubscription!: Subscription;

  // Mapeamento de cores para cada categoria (Requisito 16)
  private categoryColors: Record<string, string> = {
    'Entradas/Cultura': 'var(--app-chart-1)',
    'Alimentação': 'var(--app-chart-2)',
    'Transporte': 'var(--app-chart-3)',
    'Alojamento': 'var(--app-chart-4)',
    'Compras': 'var(--app-chart-5)'
  };

  constructor(
    private sqlite: SqliteService,
    private router: Router
  ) { }

  ngOnInit() {
    // Subscreve com segurança ao estado do banco
    this.dbSubscription = this.sqlite.bancoPronto$.subscribe(async (pronto) => {
      this.isDbReady = pronto;
      if (pronto) {
        await this.loadExpensesData();
      }
    });
  }

  ngOnDestroy() {
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
    }
  }

  // Atualiza as despesas e recalcula os totais sempre que entra na página (Requisito 9 e 15)
  async ionViewWillEnter() {
    if (this.isDbReady) {
      await this.loadExpensesData();
    } else {
      this.loadMockExpensesData();
    }
  }

  // Carrega e processa as informações de despesa integradas ao SQLite
  async loadExpensesData() {
    try {
      const dbInstance = this.getSqliteDbInstance();

      if (!dbInstance) {
        this.loadMockExpensesData();
        return;
      }

      // 1. Busca a viagem mais recente ou ativa do banco
      const tripRes = await dbInstance.query({ statement: 'SELECT * FROM viagens ORDER BY id DESC LIMIT 1;' });
      if (tripRes.values && tripRes.values.length > 0) {
        this.activeTrip = tripRes.values[0];
      }

      // 2. Busca os gastos associados a essa viagem (tabela 'gastos' ou 'despesas')
      // Ajuste o nome da tabela e coluna de FK de acordo com o seu schema script (ex: viagem_id ou id_viagem)
      let queryGastos = 'SELECT * FROM gastos;';
      let values: any[] = [];

      if (this.activeTrip) {
        queryGastos = 'SELECT * FROM gastos WHERE viagem_id = ?;';
        values = [this.activeTrip.id];
      }

      const expensesRes = await dbInstance.query({ statement: queryGastos, values: values });
      this.expensesList = expensesRes.values ? expensesRes.values : [];

      // 3. Processa e calcula os sumários financeiros
      this.calculateFinancialTotals();

    } catch (erro) {
      console.error('Erro ao carregar dados financeiros do SQLite:', erro);
      this.loadMockExpensesData();
    }
  }

  // Realiza os cálculos matemáticos de agrupamento por categoria e percentual
  private calculateFinancialTotals() {
    // Calcula o valor total geral gasto (coluna 'valor' ou 'quantia' do banco)
    this.totalSpent = this.expensesList.reduce((sum, exp) => sum + (exp.valor || exp.amount || 0), 0);

    // Agrupa e soma despesas por categoria (coluna 'categoria')
    const rawTotals: Record<string, number> = {};
    this.expensesList.forEach(exp => {
      const cat = exp.categoria || exp.category || 'Outros';
      const val = exp.valor || exp.amount || 0;
      rawTotals[cat] = (rawTotals[cat] || 0) + val;
    });

    // Mapeia para a estrutura da UI calculando as percentagens dinâmicas
    this.categoryTotals = Object.entries(rawTotals).map(([category, amount]) => {
      const percentage = this.totalSpent > 0 ? (amount / this.totalSpent) * 100 : 0;
      return {
        category: category,
        amount: amount,
        percentage: parseFloat(percentage.toFixed(1)),
        colorVar: this.categoryColors[category] || 'var(--ion-color-tertiary)'
      };
    }).sort((a, b) => b.amount - a.amount); // Ordena de forma decrescente
  }

  // Método Fallback para rodar perfeitamente no Navegador/Simulador via LocalStorage
  private loadMockExpensesData() {
    const mockViagens = JSON.parse(localStorage.getItem('mock_viagens') || '[]');
    if (mockViagens.length > 0) {
      this.activeTrip = mockViagens[mockViagens.length - 1]; // pega a última criada
    }

    const allMockExpenses = JSON.parse(localStorage.getItem('mock_gastos') || '[]');
    
    if (this.activeTrip) {
      this.expensesList = allMockExpenses.filter((e: any) => e.viagem_id === this.activeTrip?.id || e.tripId === this.activeTrip?.id);
    } else {
      this.expensesList = allMockExpenses;
    }

    this.calculateFinancialTotals();
  }

  // Descobre dinamicamente a propriedade ou método que guarda o banco dentro do serviço privado
  private getSqliteDbInstance(): any {
    if ((this.sqlite as any).db) return (this.sqlite as any).db;
    if (typeof (this.sqlite as any).getDbConnection === 'function') return (this.sqlite as any).getDbConnection();
    if (typeof (this.sqlite as any).getDatabase === 'function') return (this.sqlite as any).getDatabase();
    return null;
  }

  // Ao clicar em uma despesa recente, redireciona o usuário para o mapa destacando o local (Requisito 4 e 5)
  viewOnMap(locationName: string) {
    this.router.navigate(['/tabs/mapa'], {
      queryParams: { location: locationName }
    });
  }
}