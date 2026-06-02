import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { SqliteService } from '../../services/sqlite.service';
import { DataService } from '../../services/data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-viagens',
  templateUrl: './viagens.page.html',
  styleUrls: ['./viagens.page.scss'],
  standalone: false,
})
export class ViagensPage implements OnInit, OnDestroy {
  tripsNorte: any[] = [];
  tripsCentro: any[] = [];
  tripsSul: any[] = [];
  tripsOutras: any[] = [];
  tripCategories: { name: string; trips: any[] }[] = [];
  isAddTripModalOpen = false;
  newTripName = '';
  newTripStartDate = '';
  newTripEndDate = '';
  newTripRating = 5;
  isDbReady = false;
  private dbSubscription!: Subscription;

  constructor(
    private sqlite: SqliteService,
    private dataService: DataService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
    this.dbSubscription = this.sqlite.bancoPronto$.subscribe(async (pronto) => {
      this.isDbReady = pronto;
      if (pronto) {
        await this.loadTrips();
      }
    });
  }

  ngOnDestroy() {
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
    }
  }

  async ionViewWillEnter() {
    await this.loadTrips();
  }

  async loadTrips() {
    try {
      const loggedId = localStorage.getItem('usuario_logado_id');
      const pessoaId = loggedId ? parseInt(loggedId, 10) : 1;

      const viagensCruas = await this.sqlite.listarViagensDaPessoa(pessoaId);
      const dbInstance = (this.sqlite as any).db;

      const todasViagens = await Promise.all(viagensCruas.map(async (v: any) => {
        const tripId = v.id;
        let locaisCount = 0;
        let totalGasto = 0;
        let locaisNomes: string[] = [];

        if (dbInstance) {
          const locaisRes = await dbInstance.query({ statement: 'SELECT nome FROM locais WHERE viagem_id = ?;', values: [tripId] });
          locaisCount = locaisRes.values ? locaisRes.values.length : 0;
          locaisNomes = locaisRes.values ? locaisRes.values.map((l:any) => (l.nome || '').toLowerCase()) : [];
          
          const gastosRes = await dbInstance.query({ statement: 'SELECT SUM(valor) as total FROM gastos WHERE viagem_id = ?;', values: [tripId] });
          totalGasto = gastosRes.values?.[0]?.total || 0;
        } else {
          const tripIdStr = tripId.toString();
          const mockLocais = JSON.parse(localStorage.getItem('mock_locais') || '[]');
          const mockGastos = JSON.parse(localStorage.getItem('mock_gastos') || '[]');
          
          const tripLocais = mockLocais.filter((l: any) => l.viagem_id?.toString() === tripIdStr || l.tripId?.toString() === tripIdStr);
          locaisCount = tripLocais.length;
          locaisNomes = tripLocais.map((l:any) => (l.nome || l.name || '').toLowerCase());
          
          totalGasto = mockGastos.filter((g: any) => g.viagem_id?.toString() === tripIdStr || g.tripId?.toString() === tripIdStr)
            .reduce((sum: number, g: any) => sum + (g.valor || g.amount || 0), 0);
        }

        return {
          id: v.id,
          nome: v.nome || v.local || '',
          data_inicio: v.data_inicio || v.data_ida || '',
          data_fim: v.data_fim || v.data_volta || '',
          avaliacao: v.avaliacao || 5,
          locais: locaisCount,
          locaisNomes: locaisNomes,
          total_gasto: totalGasto
        };
      }));

      // Categorizar as viagens
      this.tripsNorte = [];
      this.tripsCentro = [];
      this.tripsSul = [];
      this.tripsOutras = [];

      const norteKws = ['norte', 'viana', 'lima', 'porto', 'braga', 'guimarães', 'luzia', 'douro', 'minho'];
      const centroKws = ['centro', 'lisboa', 'sintra', 'coimbra', 'aveiro', 'fátima', 'leiria', 'óbidos'];
      const sulKws = ['sul', 'algarve', 'faro', 'rocha', 'vicente', 'albufeira', 'portimão', 'lagos', 'tavira'];

      todasViagens.forEach(trip => {
        const textToSearch = (trip.nome + ' ' + trip.locaisNomes.join(' ')).toLowerCase();
        
        if (norteKws.some(kw => textToSearch.includes(kw))) {
          this.tripsNorte.push(trip);
        } else if (sulKws.some(kw => textToSearch.includes(kw))) {
          this.tripsSul.push(trip);
        } else if (centroKws.some(kw => textToSearch.includes(kw))) {
          this.tripsCentro.push(trip);
        } else {
          this.tripsOutras.push(trip);
        }
      });

      this.tripCategories = [];
      if (this.tripsNorte.length > 0) this.tripCategories.push({ name: 'Norte de Portugal', trips: this.tripsNorte });
      if (this.tripsCentro.length > 0) this.tripCategories.push({ name: 'Centro de Portugal', trips: this.tripsCentro });
      if (this.tripsSul.length > 0) this.tripCategories.push({ name: 'Sul de Portugal', trips: this.tripsSul });
      if (this.tripsOutras.length > 0) this.tripCategories.push({ name: 'Outras Regiões', trips: this.tripsOutras });
    } catch (erro) {
      console.error('Erro ao carregar viagens:', erro);
    }
  }

  async saveNewTrip() {
    if (!this.newTripName.trim()) {
      this.presentToast('Por favor, informe o nome do destino.');
      return;
    }

    const loading = await this.loadingController.create({ message: 'A criar nova viagem...', spinner: 'circles' });
    await loading.present();

    try {
      const dataInicio = this.newTripStartDate || new Date().toISOString().split('T')[0];
      const dataFim = this.newTripEndDate || 'A definir';
      const usuarioLogadoId = localStorage.getItem('usuario_logado_id');
      const pessoaId = usuarioLogadoId ? parseInt(usuarioLogadoId, 10) : 1;

      const dbInstance = (this.sqlite as any).db;
      if (dbInstance) {
        await dbInstance.run({
          statement: 'INSERT INTO viagens (local, data_ida, data_volta, avaliacao, pessoa_id) VALUES (?, ?, ?, ?, ?);',
          values: [this.newTripName, dataInicio, dataFim, this.newTripRating, pessoaId]
        });
      }

      // Sempre persiste no localStorage para modo mock
      const mockViagens = JSON.parse(localStorage.getItem('mock_viagens') || '[]');
      const novaViagem = {
        id: Date.now(),
        nome: this.newTripName,
        data_inicio: dataInicio,
        data_fim: dataFim,
        avaliacao: this.newTripRating,
        pessoa_id: pessoaId
      };
      mockViagens.push(novaViagem);
      localStorage.setItem('mock_viagens', JSON.stringify(mockViagens));

      await loading.dismiss();
      await this.presentToast('Nova viagem criada com sucesso!');
      this.closeAddTripModal();
      await this.loadTrips();
    } catch (erro) {
      await loading.dismiss();
      console.error('Erro ao gravar nova viagem:', erro);
      this.presentToast('Erro ao salvar a viagem.');
    }
  }

  goToTripDetails(tripId: number | string) {
    this.router.navigate(['/tabs/viagem-detalhe', tripId]);
  }

  openAddTripModal() { this.isAddTripModalOpen = true; }

  closeAddTripModal() {
    this.isAddTripModalOpen = false;
    this.newTripName = '';
    this.newTripStartDate = '';
    this.newTripEndDate = '';
    this.newTripRating = 5;
  }

  getStarsArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i);
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({ message, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}