import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { DataService, MapLocation, VisitedLocation, Expense } from '../../services/data.service';

// Definição dos possíveis passos do fluxo de registro de visita
type FlowStep = 'map' | 'confirm' | 'feedback' | 'addRecord' | 'photo' | 'cost';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: false,
})
export class MapaPage implements OnInit {
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
    private toastController: ToastController
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
      // Para simular a partilha ativa que aparece no topo
      const storage = (this.dataService as any)._storage;
      if (storage) {
        const isSharing = await storage.get('sharing_active');
        this.sharingLocation = !!isSharing;
      }
    });
  }

  // Carrega informações mescladas do JSON e do banco Ionic Storage (Requisito 9 e 10)
  async loadData() {
    this.mapLocations = await this.dataService.getMapLocations();
    this.visitedLocations = await this.dataService.getVisitedLocations();
  }

  // Verifica se um determinado local possui um registro completo gravado (Requisito 11)
  isLocationVisited(locationName: string): boolean {
    const found = this.visitedLocations.find(v => v.name === locationName);
    return !!found && found.hasRecord;
  }

  // Retorna a URL da foto de um local visitado, se houver
  getLocationPhoto(locationName: string): string {
    const found = this.visitedLocations.find(v => v.name === locationName);
    return found?.photoUrl || '';
  }

  // Dispara o início do fluxo de confirmação ao clicar no FAB (Requisito 11)
  handleFABClick() {
    this.currentStep = 'confirm';
  }

  // Confirmação de que o usuário chegou ao local correto
  confirmLocation() {
    this.currentStep = 'feedback';
  }

  // Submissão do feedback inicial (avaliação por estrelas e comentários)
  async submitFeedback() {
    if (!this.tempComment.trim()) {
      this.presentToast('Por favor, adicione um comentário sobre o local.');
      return;
    }
    
    // Salva estado intermediário no banco usando o Service
    const visited: VisitedLocation = {
      id: Date.now().toString(),
      name: this.currentLocationName,
      hasRecord: true,
      rating: this.tempRating,
      comment: this.tempComment
    };
    
    await this.dataService.saveVisitedLocation(visited);
    await this.loadData();
    
    // Avança para a oferta de registros adicionais (Foto ou Custo)
    this.currentStep = 'addRecord';
  }

  // Simula a captura de fotos do celular, permitindo escolher imagens ilustrativas
  async savePhoto(presetPhoto: string) {
    this.tempPhotoUrl = presetPhoto;
    
    // Obtém o registro existente deste local para complementar com a foto
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
    
    await this.presentToast('Fotografia salva com sucesso!');
    this.currentStep = 'addRecord';
  }

  // Registra despesas financeiras associadas a este local da viagem
  async saveCost() {
    if (!this.tempCostAmount || this.tempCostAmount <= 0) {
      this.presentToast('Por favor, informe um valor de custo válido.');
      return;
    }
    
    const newExpense: Expense = {
      id: Date.now().toString(),
      category: this.tempCostCategory,
      amount: this.tempCostAmount,
      location: this.currentLocationName,
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    };
    
    // Grava no Storage central através do Service (Requisito 9 e 15)
    await this.dataService.saveExpense(newExpense);
    await this.loadData();
    
    await this.presentToast(`Despesa de €${this.tempCostAmount.toFixed(2)} registrada!`);
    
    // Limpa campos e retorna ao menu de registros adicionais
    this.tempCostAmount = null;
    this.currentStep = 'addRecord';
  }

  // Conclui todo o fluxo de visita do local e retorna ao estado normal do mapa
  finishVisit() {
    this.presentToast('Visita registrada com absoluto sucesso!');
    this.currentStep = 'map';
    // Limpa os dados temporários
    this.tempComment = '';
    this.tempRating = 5;
    this.tempPhotoUrl = '';
  }

  // Cancela o fluxo em qualquer ponto e retorna para o mapa
  cancelFlow() {
    this.currentStep = 'map';
  }

  // Auxiliar para exibição de mensagens rápidas no rodapé da tela
  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2500,
      position: 'bottom',
      cssClass: 'custom-toast'
    });
    await toast.present();
  }

  // Permite selecionar um local do mapa clicando diretamente nele
  selectLocation(location: MapLocation) {
    this.currentLocationName = location.name;
    this.presentToast(`Local selecionado: ${location.name}. Clique no botão azul abaixo para registrar sua visita!`);
  }
}
