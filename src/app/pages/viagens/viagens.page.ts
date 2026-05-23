import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { DataService, Trip } from '../../services/data.service';

@Component({
  selector: 'app-viagens',
  templateUrl: './viagens.page.html',
  styleUrls: ['./viagens.page.scss'],
  standalone: false,
})
export class ViagensPage implements OnInit {
  // Lista de viagens passadas e atual da usuária
  tripsList: Trip[] = [];

  // Controle de estado para exibição do Modal de Nova Viagem (O Botão Universal)
  isAddTripModalOpen = false;

  // Campos temporários para gravação do formulário de nova viagem
  newTripName = '';
  newTripStartDate = '';
  newTripEndDate = '';
  newTripRating = 5;

  constructor(
    private dataService: DataService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
  }

  // Carrega as informações dinamicamente a cada entrada na página (Requisito 9 e 15)
  async ionViewWillEnter() {
    await this.loadTrips();
  }

  // Carrega a listagem de viagens
  async loadTrips() {
    this.tripsList = await this.dataService.getTrips();
  }

  // Navega para os detalhes da viagem, passando o ID da viagem como parâmetro de rota (Requisito 4 e 5)
  goToTripDetails(tripId: string) {
    this.router.navigate(['/tabs/viagem-detalhe', tripId]);
  }

  // Abre o modal de adição de nova viagem
  openAddTripModal() {
    this.isAddTripModalOpen = true;
  }

  // Fecha o modal limpando campos
  closeAddTripModal() {
    this.isAddTripModalOpen = false;
    this.clearForm();
  }

  // Valida e grava uma nova viagem no Storage e apresenta Toast de Sucesso (O Feedback)
  async saveNewTrip() {
    if (!this.newTripName.trim()) {
      this.presentToast('Por favor, informe o nome do destino.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'A criar nova viagem...',
      spinner: 'circles'
    });
    await loading.present();

    const newTrip: Trip = {
      id: Date.now().toString(),
      name: this.newTripName,
      startDate: this.newTripStartDate || 'Hoje',
      endDate: this.newTripEndDate || 'A definir',
      locations: 0,
      totalSpent: 0,
      rating: this.newTripRating
    };

    await this.dataService.saveTrip(newTrip);
    await this.loadTrips();
    
    await loading.dismiss();
    // Dispara toast de sucesso (O Feedback)
    await this.presentToast('Nova viagem criada com absoluto sucesso!');
    this.closeAddTripModal();
  }

  // Auxiliar para limpar o formulário
  private clearForm() {
    this.newTripName = '';
    this.newTripStartDate = '';
    this.newTripEndDate = '';
    this.newTripRating = 5;
  }

  // Gera um array auxiliar para renderizar as estrelas da nota de viagem
  getStarsArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i);
  }

  // Apresenta mensagens flutuantes na tela usando ToastController (O Feedback)
  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2500,
      position: 'bottom'
    });
    await toast.present();
  }
}
