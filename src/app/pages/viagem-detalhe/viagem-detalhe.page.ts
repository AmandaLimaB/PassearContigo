import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataService, Trip, Expense, VisitedLocation } from '../../services/data.service';

@Component({
  selector: 'app-viagem-detalhe',
  templateUrl: './viagem-detalhe.page.html',
  styleUrls: ['./viagem-detalhe.page.scss'],
  standalone: false,
})
export class ViagemDetalhePage implements OnInit {
  tripId: string | null = null;
  trip: Trip | undefined;
  
  // Listas filtradas específicas desta viagem
  expensesList: Expense[] = [];
  visitedList: VisitedLocation[] = [];

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService
  ) { }

  async ngOnInit() {
    this.tripId = this.route.snapshot.paramMap.get('id');
    if (this.tripId) {
      await this.loadTripDetails();
    }
  }

  async ionViewWillEnter() {
    if (this.tripId) {
      await this.loadTripDetails();
    }
  }

  // Carrega e filtra as informações específicas desta viagem (Requisito 4 e 5)
  async loadTripDetails() {
    if (!this.tripId) return;
    
    // 1. Busca a viagem pelo ID
    this.trip = await this.dataService.getTripById(this.tripId);
    
    // 2. Busca e filtra todas as despesas pertencentes a esta viagem
    const allExpenses = await this.dataService.getExpenses();
    this.expensesList = allExpenses.filter(e => e.tripId === this.tripId);
    
    // 3. Busca e filtra todos os locais visitados nesta viagem
    const allVisited = await this.dataService.getVisitedLocations();
    this.visitedList = allVisited.filter(v => v.tripId === this.tripId);
  }

  // Helper para renderizar estrelas
  getStarsArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i);
  }
}
