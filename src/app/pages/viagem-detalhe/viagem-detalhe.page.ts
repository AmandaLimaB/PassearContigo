import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SqliteService } from '../../services/sqlite.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-viagem-detalhe',
  templateUrl: './viagem-detalhe.page.html',
  styleUrls: ['./viagem-detalhe.page.scss'],
  standalone: false,
})
export class ViagemDetalhePage implements OnInit, OnDestroy {
  tripId: string | null = null;
  trip: any | undefined;
  
  // Listas filtradas específicas desta viagem vindas do SQLite
  expensesList: any[] = [];
  visitedList: any[] = [];

  // Controle de prontidão do banco e gerenciamento de subscrição
  isDbReady = false;
  private dbSubscription!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private sqlite: SqliteService
  ) { }

  ngOnInit() {
    this.tripId = this.route.snapshot.paramMap.get('id');

    // Subscreve ao estado do banco para carregar as informações assim que estiver pronto
    this.dbSubscription = this.sqlite.bancoPronto$.subscribe(async (pronto) => {
      this.isDbReady = pronto;
      if (pronto && this.tripId) {
        await this.loadTripDetails();
      }
    });
  }

  ngOnDestroy() {
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
    }
  }

  // Recarrega as informações dinamicamente ao reentrar no ecrã de detalhes
  async ionViewWillEnter() {
    if (this.isDbReady && this.tripId) {
      await this.loadTripDetails();
    } else if (!this.isDbReady && this.tripId) {
      this.loadMockDetails();
    }
  }

  // Carrega e filtra as informações específicas desta viagem utilizando queries SQL
  async loadTripDetails() {
    if (!this.tripId) return;
    
    try {
      const dbInstance = this.getSqliteDbInstance();

      if (!dbInstance) {
        this.loadMockDetails();
        return;
      }

      // 1. Busca a viagem específica pelo ID recebido na rota
      const tripRes = await dbInstance.query({
        statement: 'SELECT * FROM viagens WHERE id = ?;',
        values: [this.tripId]
      });
      if (tripRes.values && tripRes.values.length > 0) {
        this.trip = tripRes.values[0];
      }

      // 2. Busca as despesas (gastos) pertencentes a esta viagem específica
      // Nota: Ajusta o nome da FK se no teu banco for 'id_viagem' em vez de 'viagem_id'
      const expensesRes = await dbInstance.query({
        statement: 'SELECT * FROM gastos WHERE viagem_id = ?;',
        values: [this.tripId]
      });
      this.expensesList = expensesRes.values ? expensesRes.values : [];
      
      // 3. Busca todos os locais visitados mapeados para esta viagem específica
      const visitedRes = await dbInstance.query({
        statement: 'SELECT * FROM locais WHERE viagem_id = ?;',
        values: [this.tripId]
      });
      this.visitedList = visitedRes.values ? visitedRes.values : [];

      console.log('Detalhes carregados com sucesso do SQLite para a viagem ID:', this.tripId);
    } catch (erro) {
      console.error('Erro ao buscar detalhes da viagem no SQLite:', erro);
      this.loadMockDetails();
    }
  }

  // Mecanismo Fallback para rodar perfeitamente no Navegador (LocalStorage)
  private loadMockDetails() {
    if (!this.tripId) return;

    const mockViagens = JSON.parse(localStorage.getItem('mock_viagens') || '[]');
    // Procura comparando string ou número
    this.trip = mockViagens.find((t: any) => t.id.toString() === this.tripId?.toString());

    const allMockExpenses = JSON.parse(localStorage.getItem('mock_gastos') || '[]');
    this.expensesList = allMockExpenses.filter((e: any) => (e.viagem_id?.toString() === this.tripId || e.tripId?.toString() === this.tripId));

    const allMockLocais = JSON.parse(localStorage.getItem('mock_locais') || '[]');
    this.visitedList = allMockLocais.filter((l: any) => (l.viagem_id?.toString() === this.tripId || l.tripId?.toString() === this.tripId));
  }

  // Descobre dinamicamente a propriedade ou método que guarda o banco dentro do serviço privado
  private getSqliteDbInstance(): any {
    if ((this.sqlite as any).db) return (this.sqlite as any).db;
    if (typeof (this.sqlite as any).getDbConnection === 'function') return (this.sqlite as any).getDbConnection();
    if (typeof (this.sqlite as any).getDatabase === 'function') return (this.sqlite as any).getDatabase();
    return null;
  }

  // Helper para renderizar estrelas
  getStarsArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i);
  }
}