import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SqliteService } from '../../services/sqlite.service';
import { DataService } from '../../services/data.service';
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
  expensesList: any[] = [];
  visitedList: any[] = [];

  isDbReady = false;
  private dbSubscription!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private sqlite: SqliteService,
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.tripId = this.route.snapshot.paramMap.get('id');
    this.dbSubscription = this.sqlite.bancoPronto$.subscribe(async (pronto) => {
      this.isDbReady = pronto;
      if (this.tripId) await this.loadTripDetails();
    });
  }

  ngOnDestroy() {
    if (this.dbSubscription) this.dbSubscription.unsubscribe();
  }

  async ionViewWillEnter() {
    if (this.tripId) await this.loadTripDetails();
  }

  async loadTripDetails() {
    if (!this.tripId) return;

    try {
      const dbInstance = (this.sqlite as any).db;
      const tripIdStr = this.tripId.toString();

      if (dbInstance) {
        // Contagens dinâmicas via SQL
        const locaisRes = await dbInstance.query({ statement: 'SELECT COUNT(*) as count FROM locais WHERE viagem_id = ?;', values: [this.tripId] });
        const gastosRes = await dbInstance.query({ statement: 'SELECT SUM(valor) as total FROM gastos WHERE viagem_id = ?;', values: [this.tripId] });

        const tripRes = await dbInstance.query({ statement: 'SELECT * FROM viagens WHERE id = ?;', values: [this.tripId] });
        if (tripRes.values && tripRes.values.length > 0) {
          const t = tripRes.values[0];
          this.trip = {
            id: t.id,
            nome: t.local || t.nome || '',
            data_inicio: t.data_ida || t.data_inicio || '',
            data_fim: t.data_volta || t.data_fim || '',
            avaliacao: t.avaliacao || 5,
            locais: locaisRes.values?.[0]?.count || 0,
            total_gasto: gastosRes.values?.[0]?.total || 0
          };
        }

        const gastosListRes = await dbInstance.query({ statement: 'SELECT * FROM gastos WHERE viagem_id = ?;', values: [this.tripId] });
        this.expensesList = (gastosListRes.values || []).map((e: any) => ({
          ...e,
          categoria: e.nome_gasto || e.categoria || '',
          category: e.nome_gasto || e.categoria || '',
          valor: e.valor || 0,
          amount: e.valor || 0,
          local: e.descricao || e.local || '',
          location: e.descricao || e.local || '',
          data: e.data || ''
        }));

        const visitedRes = await dbInstance.query({ statement: 'SELECT * FROM locais WHERE viagem_id = ?;', values: [this.tripId] });
        this.visitedList = (visitedRes.values || []).map((l: any) => ({
          ...l,
          nome: l.nome || '',
          avaliacao: l.nota || l.avaliacao || 5,
          comentario: l.descricao || l.comentario || l.comment || '',
          comment: l.descricao || l.comentario || l.comment || '',
          photoUrl: l.foto_url || l.photoUrl || '',
          foto_url: l.foto_url || l.photoUrl || ''
        }));

      } else {
        // Modo mock — lê tudo do localStorage (fonte única de verdade)
        const mockViagens = JSON.parse(localStorage.getItem('mock_viagens') || '[]');
        const rawTrip = mockViagens.find((t: any) => t.id.toString() === tripIdStr);

        const allGastos = JSON.parse(localStorage.getItem('mock_gastos') || '[]');
        this.expensesList = allGastos.filter((g: any) =>
          g.viagem_id?.toString() === tripIdStr || g.tripId?.toString() === tripIdStr
        ).map((e: any) => ({
          ...e,
          categoria: e.categoria || e.category || e.nome_gasto || '',
          category: e.categoria || e.category || e.nome_gasto || '',
          valor: e.valor || e.amount || 0,
          amount: e.valor || e.amount || 0,
          local: e.local || e.location || e.descricao || '',
          location: e.local || e.location || e.descricao || ''
        }));

        const allLocais = JSON.parse(localStorage.getItem('mock_locais') || '[]');
        this.visitedList = allLocais.filter((l: any) =>
          l.viagem_id?.toString() === tripIdStr || l.tripId?.toString() === tripIdStr
        ).map((l: any) => ({
          ...l,
          nome: l.nome || l.name || '',
          avaliacao: l.avaliacao || l.rating || l.nota || 5,
          comentario: l.comentario || l.comment || l.descricao || '',
          comment: l.comentario || l.comment || l.descricao || '',
          photoUrl: l.photoUrl || l.foto_url || '',
          foto_url: l.photoUrl || l.foto_url || ''
        }));

        const totalGasto = this.expensesList.reduce((s: number, g: any) => s + (g.valor || g.amount || 0), 0);

        if (rawTrip) {
          this.trip = {
            id: rawTrip.id,
            nome: rawTrip.nome || rawTrip.local || '',
            data_inicio: rawTrip.data_inicio || rawTrip.data_ida || '',
            data_fim: rawTrip.data_fim || rawTrip.data_volta || '',
            avaliacao: rawTrip.avaliacao || 5,
            locais: this.visitedList.length,
            total_gasto: totalGasto
          };
        }
      }
    } catch (erro) {
      console.error('Erro ao buscar detalhes da viagem:', erro);
    }
  }

  getStarsArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i);
  }
}