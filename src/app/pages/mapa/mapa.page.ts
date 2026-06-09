import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { DataService, MapLocation, VisitedLocation, Expense } from '../../services/data.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Definição dos possíveis passos do fluxo de registro de visita
type FlowStep = 'map' | 'confirm' | 'feedback' | 'addRecord' | 'photo' | 'cost';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: false,
})
export class MapaPage implements OnInit {
  hasAddedPhoto: boolean = false;
  hasAddedCost: boolean = false;

  // Controle do passo ativo na UI do mapa
  currentStep: FlowStep = 'map';
  
  // Localização simulada atual do usuário GPS
  currentLocationName = 'Santuário de Santa Luzia';
  
  // Flag que simula se a partilha de localização está ativa (sincronizada com o Perfil)
  sharingLocation = false;

  // Listas de locais do mapa e locais visitados obtidas do Service
  mapLocations: MapLocation[] = [];
  visitedLocations: VisitedLocation[] = [];

  // Dados coletados temporariamente durante o fluxo de visita
  tempRating = 5;
  tempComment = '';
  tempCostAmount: number | null = null;
  tempCostCategory = 'Alimentação';
  tempPhotoUrl = '';

  constructor(
    private dataService: DataService,
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  async ngOnInit() {
    // Escuta parâmetros de rota dinâmicos para suportar navegação entre páginas (Requisito 4 e 5)
    this.route.queryParams.subscribe(async params => {
      await this.loadData();
      
      // Se vier uma localização por parâmetro, destaca ela no mapa com um brinde informativo
      if (params['location']) {
        const locName = params['location'];
        this.presentToast(`Visualizando localização: ${locName}`);
        
        // Simula focar o mapa no local vindo por parâmetro
        const matched = this.mapLocations.find(l => l.name.toLowerCase() === locName.toLowerCase());
        if (matched) {
          this.currentLocationName = matched.name;
        }
      }
      
      // Se vier uma viagem focada por parâmetro
      if (params['tripId']) {
        this.presentToast(`Carregando mapa para a viagem #${params['tripId']}`);
      }
    });
  }

  async ionViewWillEnter() {
    await this.loadData();
    // Simula a sincronização da partilha ativa buscando um registro temporário no storage
    this.dataService.getVisitedLocations().then(async () => {
      // Usaremos o storage para ler se o compartilhamento está ativo no perfil
      // Simula partilha
      const storage = (this.dataService as any)._storage;
      if (storage) {
        const isSharing = await storage.get('sharing_active');
        this.sharingLocation = !!isSharing;
      }
    });
  }

  // Carrega info do banco e JSON
  async loadData() {
    this.mapLocations = await this.dataService.getMapLocations();
    this.visitedLocations = await this.dataService.getVisitedLocations();
  }

  // Verifica registro local
  isLocationVisited(locationName: string): boolean {
    const found = this.visitedLocations.find(v => v.name === locationName);
    return !!found && found.hasRecord;
  }

  // Retorna foto local
  getLocationPhoto(locationName: string): string {
    const found = this.visitedLocations.find(v => v.name === locationName);
    return found?.photoUrl || '';
  }

  // Inicia confirmação
  handleFABClick() {
    this.currentStep = 'confirm';
  }

  // Confirma chegada
  confirmLocation() {
    this.currentStep = 'feedback';
  }

  // Salva feedback
  async submitFeedback() {
    if (!this.tempComment.trim()) {
      this.presentToast('Por favor, adicione um comentário sobre o local.');
      return;
    }
    
    // Salva rascunho no banco
    const visited: VisitedLocation = {
      id: Date.now().toString(),
      name: this.currentLocationName,
      hasRecord: true,
      rating: this.tempRating,
      comment: this.tempComment
    };
    
    await this.dataService.saveVisitedLocation(visited);
    await this.loadData();
    
    // Avança para opções
    this.currentStep = 'addRecord';
  }

  // Abre galeria
  async capturePhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      if (image.dataUrl) {
        await this.savePhoto(image.dataUrl);
      }
    } catch (e) {
      console.warn('A seleção de foto foi cancelada ou ocorreu um erro:', e);
    }
  }

  // Salva foto
  async savePhoto(presetPhoto: string) {
    const loading = await this.loadingController.create({
      message: 'A guardar fotografia...',
      spinner: 'circles'
    });
    await loading.present();

    this.tempPhotoUrl = presetPhoto;
    
    // Pega registro atual
    const visitedList = await this.dataService.getVisitedLocations();
    const existing = visitedList.find(loc => loc.name === this.currentLocationName);
    
    const updated: VisitedLocation = {
      id: existing?.id || Date.now().toString(),
      name: this.currentLocationName,
      hasRecord: true,
      rating: existing?.rating || 5,
      comment: existing?.comment || '',
      photoUrl: this.tempPhotoUrl
    };
    
    await this.dataService.saveVisitedLocation(updated);
    await this.loadData();
    
    await loading.dismiss();
    await this.presentToast('Fotografia guardada com sucesso!');
    this.hasAddedPhoto = true;
    this.currentStep = 'addRecord';
  }

  // Salva despesa
  async saveCost() {
    if (!this.tempCostAmount || this.tempCostAmount <= 0) {
      this.presentToast('Por favor, informe um valor de custo válido.');
      return;
    }
    
    const loading = await this.loadingController.create({
      message: 'A guardar despesa...',
      spinner: 'circles'
    });
    await loading.present();

    const newExpense: Expense = {
      id: Date.now().toString(),
      category: this.tempCostCategory,
      amount: this.tempCostAmount,
      location: this.currentLocationName,
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    };
    
    // Salva no banco
    await this.dataService.saveExpense(newExpense);
    await this.loadData();
    
    await loading.dismiss();
    await this.presentToast(`Despesa de €${this.tempCostAmount.toFixed(2)} guardada!`);
    
    // Limpa campos
    this.tempCostAmount = null;
    this.hasAddedCost = true;
    this.currentStep = 'addRecord';
  }

  // Finaliza visita
  finishVisit() {
    this.presentToast('Visita registrada com absoluto sucesso!');
    this.currentStep = 'map';
    // Limpa rascunho
    this.tempComment = '';
    this.tempRating = 5;
    this.tempPhotoUrl = '';
    
    this.hasAddedPhoto = false; 
    this.hasAddedCost = false;
  }

  // Cancela fluxo
  cancelFlow() {
    this.currentStep = 'map';
  }

  // Mostra toast
  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2500,
      position: 'bottom',
      cssClass: 'custom-toast'
    });
    await toast.present();
  }

  // Clica no local
  selectLocation(location: MapLocation) {
    this.currentLocationName = location.name;
    this.presentToast(`Local selecionado: ${location.name}. Clique no botão azul abaixo para registrar sua visita!`);
  }
}
