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
      this.tripsList = await this.dataService.getTripsWithStats();
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