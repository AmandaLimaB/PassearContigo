import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SqliteService } from '../../services/sqlite.service';
import { Subscription } from 'rxjs';

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
  expensesList: any[] = [];
  totalSpent = 0;
  categoryTotals: CategoryTotal[] = [];
  activeTrip: any | undefined;
  isDbReady = false;
  private dbSubscription!: Subscription;

  private categoryColors: Record<string, string> = {
    'Entradas/Cultura': 'var(--app-chart-1)',
    'Alimentação': 'var(--app-chart-2)',
    'Transporte': 'var(--app-chart-3)',
    'Alojamento': 'var(--app-chart-4)',
    'Compras': 'var(--app-chart-5)'
  };

  constructor(private sqlite: SqliteService, private router: Router) { }

  ngOnInit() {
    this.dbSubscription = this.sqlite.bancoPronto$.subscribe(async (pronto) => {
      this.isDbReady = pronto;
      await this.loadExpensesData();
    });
  }

  ngOnDestroy() {
    if (this.dbSubscription) this.dbSubscription.unsubscribe();
  }

  async ionViewWillEnter() {
    await this.loadExpensesData();
  }

  async loadExpensesData() {
    try {
      const dbInstance = (this.sqlite as any).db;

      if (dbInstance) {
        const tripRes = await dbInstance.query({ statement: 'SELECT * FROM viagens ORDER BY id DESC LIMIT 1;' });
        if (tripRes.values && tripRes.values.length > 0) {
          const t = tripRes.values[0];
          this.activeTrip = { id: t.id, nome: t.local || t.nome || '' };
        }

        const query = this.activeTrip
          ? 'SELECT * FROM gastos WHERE viagem_id = ?;'
          : 'SELECT * FROM gastos;';
        const values = this.activeTrip ? [this.activeTrip.id] : [];

        const expensesRes = await dbInstance.query({ statement: query, values });
        this.expensesList = (expensesRes.values || []).map((e: any) => ({
          ...e,
          categoria: e.nome_gasto || e.categoria || '',
          category: e.nome_gasto || e.categoria || '',
          valor: e.valor || 0,
          amount: e.valor || 0,
          local: e.descricao || e.local || '',
          location: e.descricao || e.local || ''
        }));
      } else {
        // Modo mock — usa localStorage como fonte única
        const allMockGastos = JSON.parse(localStorage.getItem('mock_gastos') || '[]');
        const mockViagens = JSON.parse(localStorage.getItem('mock_viagens') || '[]');

        if (mockViagens.length > 0) {
          this.activeTrip = mockViagens[mockViagens.length - 1];
        }

        this.expensesList = allMockGastos.map((e: any) => ({
          ...e,
          categoria: e.categoria || e.category || e.nome_gasto || '',
          category: e.categoria || e.category || e.nome_gasto || '',
          valor: e.valor || e.amount || 0,
          amount: e.valor || e.amount || 0,
          local: e.local || e.location || e.descricao || '',
          location: e.local || e.location || e.descricao || ''
        }));
      }

      this.calculateFinancialTotals();
    } catch (erro) {
      console.error('Erro ao carregar dados financeiros:', erro);
    }
  }

  private calculateFinancialTotals() {
    this.totalSpent = this.expensesList.reduce((sum, e) => sum + (e.valor || e.amount || 0), 0);

    const rawTotals: Record<string, number> = {};
    this.expensesList.forEach(e => {
      const cat = e.categoria || e.category || 'Outros';
      rawTotals[cat] = (rawTotals[cat] || 0) + (e.valor || e.amount || 0);
    });

    this.categoryTotals = Object.entries(rawTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: this.totalSpent > 0 ? parseFloat(((amount / this.totalSpent) * 100).toFixed(1)) : 0,
      colorVar: this.categoryColors[category] || 'var(--ion-color-tertiary)'
    })).sort((a, b) => b.amount - a.amount);
  }

  viewOnMap(locationName: string) {
    this.router.navigate(['/tabs/mapa'], { queryParams: { location: locationName } });
  }
}