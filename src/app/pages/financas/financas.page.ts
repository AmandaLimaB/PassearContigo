import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService, Expense } from '../../services/data.service';

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
export class FinancasPage implements OnInit {
  // Lista de despesas financeiras registradas
  expensesList: Expense[] = [];
  
  // Total somado de todas as despesas da viagem
  totalSpent = 0;

  // Lista sumarizada por categorias para renderização das barras de progresso
  categoryTotals: CategoryTotal[] = [];

  // Mapeamento de cores premium para cada categoria (Requisito 16)
  private categoryColors: Record<string, string> = {
    'Entradas/Cultura': 'var(--app-chart-1)',
    'Alimentação': 'var(--app-chart-2)',
    'Transporte': 'var(--app-chart-3)',
    'Alojamento': 'var(--app-chart-4)',
    'Compras': 'var(--app-chart-5)'
  };

  constructor(
    private dataService: DataService,
    private router: Router
  ) { }

  ngOnInit() {
  }

  // Atualiza as despesas e recalcula os totais sempre que entra na página (Requisito 9 e 15)
  async ionViewWillEnter() {
    await this.loadExpensesData();
  }

  // Carrega e processa as informações de despesa
  async loadExpensesData() {
    this.expensesList = await this.dataService.getExpenses();
    
    // Calcula o valor total geral gasto
    this.totalSpent = this.expensesList.reduce((sum, exp) => sum + exp.amount, 0);

    // Agrupa e soma despesas por categoria
    const rawTotals: Record<string, number> = {};
    this.expensesList.forEach(exp => {
      rawTotals[exp.category] = (rawTotals[exp.category] || 0) + exp.amount;
    });

    // Mapeia para a estrutura da UI calculando porcentagens dinâmicas
    this.categoryTotals = Object.entries(rawTotals).map(([category, amount]) => {
      const percentage = this.totalSpent > 0 ? (amount / this.totalSpent) * 100 : 0;
      return {
        category: category,
        amount: amount,
        percentage: parseFloat(percentage.toFixed(1)),
        colorVar: this.categoryColors[category] || 'var(--ion-color-tertiary)'
      };
    }).sort((a, b) => b.amount - a.amount); // Ordena por valor gasto decrescente
  }

  // Ao clicar em uma despesa recente, redireciona o usuário para o mapa destacando o local (Requisito 4 e 5)
  viewOnMap(locationName: string) {
    this.router.navigate(['/tabs/mapa'], {
      queryParams: { location: locationName }
    });
  }
}
