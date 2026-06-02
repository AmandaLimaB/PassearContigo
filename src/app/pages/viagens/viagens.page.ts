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
  tripsList: any[] = [];
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

      const dbInstance = (this.sqlite as any).db;

      if (dbInstance) {
        await dbInstance.run({
          statement: "UPDATE viagens SET local = 'Norte de Portugal' WHERE local = 'Viagem Atual' AND pessoa_id = ?",
          values: [pessoaId]
        });

        const regioes = ['Norte de Portugal', 'Centro de Portugal', 'Sul de Portugal'];
        for (const r of regioes) {
          const res = await dbInstance.query({
            statement: 'SELECT id FROM viagens WHERE pessoa_id = ? AND local = ? LIMIT 1;',
            values: [pessoaId, r]
          });
          if (!res.values || res.values.length === 0) {
            const dataInicio = new Date().toISOString().split('T')[0];
            await dbInstance.run({
              statement: 'INSERT INTO viagens (local, data_ida, data_volta, avaliacao, pessoa_id) VALUES (?, ?, ?, ?, ?);',
              values: [r, dataInicio, 'A definir', 5, pessoaId]
            });
          }
        }
      } else {
         const mockViagens = JSON.parse(localStorage.getItem('mock_viagens') || '[]');
         let mudou = false;
         for (const v of mockViagens) {
           if (v.pessoa_id?.toString() === pessoaId.toString() && (v.nome === 'Viagem Atual' || v.local === 'Viagem Atual')) {
             v.nome = 'Norte de Portugal';
             v.local = 'Norte de Portugal';
             mudou = true;
           }
         }
         
         const regioes = ['Norte de Portugal', 'Centro de Portugal', 'Sul de Portugal'];
         for (const r of regioes) {
           const existe = mockViagens.find((v: any) => v.pessoa_id?.toString() === pessoaId.toString() && (v.nome === r || v.local === r));
           if (!existe) {
             mockViagens.push({
               id: Date.now() + Math.floor(Math.random() * 1000),
               nome: r,
               local: r,
               data_inicio: new Date().toISOString().split('T')[0],
               data_fim: 'A definir',
               avaliacao: 5,
               pessoa_id: pessoaId
             });
             mudou = true;
           }
         }
         if (mudou) {
           localStorage.setItem('mock_viagens', JSON.stringify(mockViagens));
         }
      }

      const viagensCruas = await this.sqlite.listarViagensDaPessoa(pessoaId);

      this.tripsList = await Promise.all(viagensCruas.map(async (v: any) => {
        const tripId = v.id;

        if (dbInstance) {
          const locaisRes = await dbInstance.query({ statement: 'SELECT nome FROM locais WHERE viagem_id = ?;', values: [tripId] });
          const count = locaisRes.values ? locaisRes.values.length : 0;
          const cidades_visitadas = (locaisRes.values || []).map((l: any) => l.nome).join(', ');
          
          const gastosRes = await dbInstance.query({ statement: 'SELECT SUM(valor) as total FROM gastos WHERE viagem_id = ?;', values: [tripId] });
          return {
            id: v.id,
            nome: v.local || v.nome || '',
            data_inicio: v.data_ida || v.data_inicio || '',
            data_fim: v.data_volta || v.data_fim || '',
            avaliacao: v.avaliacao || 5,
            locais: count,
            cidades_visitadas: cidades_visitadas,
            total_gasto: gastosRes.values?.[0]?.total || 0
          };
        } else {
          const tripIdStr = tripId.toString();
          const mockLocais = JSON.parse(localStorage.getItem('mock_locais') || '[]');
          const mockGastos = JSON.parse(localStorage.getItem('mock_gastos') || '[]');
          
          const locaisDaViagem = mockLocais.filter((l: any) => l.viagem_id?.toString() === tripIdStr || l.tripId?.toString() === tripIdStr);
          const locaisCount = locaisDaViagem.length;
          const cidades_visitadas = locaisDaViagem.map((l: any) => l.nome || l.name).join(', ');
          
          const totalGasto = mockGastos.filter((g: any) => g.viagem_id?.toString() === tripIdStr || g.tripId?.toString() === tripIdStr)
            .reduce((sum: number, g: any) => sum + (g.valor || g.amount || 0), 0);
          return {
            id: v.id,
            nome: v.nome || v.local || '',
            data_inicio: v.data_inicio || v.data_ida || '',
            data_fim: v.data_fim || v.data_volta || '',
            avaliacao: v.avaliacao || 5,
            locais: locaisCount,
            cidades_visitadas: cidades_visitadas,
            total_gasto: totalGasto
          };
        }
      }));
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