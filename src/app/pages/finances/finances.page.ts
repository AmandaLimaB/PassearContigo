import { Component, OnInit } from '@angular/core';
import { DataService, Expense } from '../../services/data.service';

/**
 * Page component representing the Finances tab.
 * Aggregates expenses by category and lists recent expenses.
 * 
 * @author Antigravity
 */
@Component({
  selector: 'app-finances',
  templateUrl: './finances.page.html',
  styleUrls: ['./finances.page.scss'],
})
export class FinancesPage implements OnInit {
  expenses: Expense[] = [];
  totalSpent = 0;
  categoryTotals: { category: string; amount: number; percentage: number; colorClass: string }[] = [];

  // Color mappings matching reference CSS variables
  categoryColors: Record<string, string> = {
    'Entradas/Cultura': 'culture-bar',
    'Alimentação': 'food-bar',
    'Transporte': 'transport-bar',
    'Alojamento': 'lodging-bar',
    'Compras': 'shopping-bar',
    'Outro': 'other-bar'
  };

  constructor(private dataService: DataService) {}

  async ngOnInit() {
    await this.loadExpenses();
  }

  async ionViewWillEnter() {
    await this.loadExpenses();
  }

  /**
   * Fetches expense list and calculates category aggregations.
   */
  async loadExpenses() {
    this.expenses = await this.dataService.getExpenses();
    
    // Sum total expenses
    this.totalSpent = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Group expenses by category
    const totals: Record<string, number> = {};
    this.expenses.forEach(exp => {
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
    });

    // Structure category data for display
    this.categoryTotals = Object.keys(totals).map(category => {
      const amount = totals[category];
      const percentage = this.totalSpent > 0 ? (amount / this.totalSpent) * 100 : 0;
      const colorClass = this.categoryColors[category] || 'other-bar';
      
      return {
        category,
        amount,
        percentage,
        colorClass
      };
    });

    // Sort category breakdown by largest amount
    this.categoryTotals.sort((a, b) => b.amount - a.amount);
  }
}
