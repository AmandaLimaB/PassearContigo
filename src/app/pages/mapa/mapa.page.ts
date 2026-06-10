import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { DataService, MapLocation, VisitedLocation, Expense } from '../../services/data.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import * as L from 'leaflet'; // IMPORTAÇÃO DO LEAFLET

// Definição dos possíveis passos do fluxo de registro de visita
type FlowStep = 'map' | 'confirm' | 'feedback' | 'addRecord' | 'photo' | 'cost';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: false,
})
export class MapaPage implements OnInit, OnDestroy {

  // Variável que guarda a instância do mapa real
  map!: L.Map;

  showShareSheet = false;
  shareDetails = { contactsCount: 0, duration: '2 horas' };
  selectedDuration = '2h';
  contactsList = [
    { id: '1', name: 'Ana Souza (Mãe)', selected: false, img: 'assets/icon/ana.jpg'},
    { id: '2', name: 'Carlos Lima (Namorado)', selected: false, img: 'assets/icon/joao.jpg'},
    { id: '3', name: 'Julia Martins (Irmã)', selected: false, img: 'assets/icon/lau.jpg' },
    { id: '4', name: 'Pedro Alves (Amigo)', selected: false, img: 'assets/icon/ze.jpg'}
  ];

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
    private loadingController: LoadingController,
    private zone: NgZone // IMPORTANTE: Para que o Angular atualize a UI após um clique num Pin do Leaflet
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
      const storage = (this.dataService as any)._storage;
      if (storage) {
        const isSharing = await storage.get('sharing_active');
        this.sharingLocation = !!isSharing;
      }
    });
  }

  // EVENTO CRUCIAL PARA O MAPA: Dispara quando a tela entra efetivamente no ecrã e a div já existe
  ionViewDidEnter() {
    this.initMap();
  }

  // MÉTODOS DO LEAFLET ==========================================

  initMap() {
    // Destrói a instância anterior caso o utilizador navegue e volte à página
    if (this.map) {
      this.map.remove();
    }

    // Coordenadas centrais simuladas (Ex: Porto, Portugal)
    const userLat = 41.6932;
    const userLng = -8.8329;

    // 1. Cria o mapa
    this.map = L.map('mapId', {
      zoomControl: false // Remove os botões de +/- para manter a estética limpa da app
    }).setView([userLat, userLng], 14);

    // 2. Adiciona os blocos visuais do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // 3. Desenha o Pin Principal (Utilizador - Cor Vermelha)
    const userIcon = L.divIcon({
      className: 'custom-user-pin',
      html: `<div style="font-size: 32px; filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.4));">📍</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32] // Ancora o ícone na ponta inferior
    });
    L.marker([userLat, userLng], { icon: userIcon }).addTo(this.map);

    // 4. Desenha os pins dos locais registados no JSON
    this.renderLocationsPins();
  }

  renderLocationsPins() {
    // Coordenadas base para espalhar locais se não houver lat/lng no JSON
    const baseLat = 41.1579;
    const baseLng = -8.6291;

    this.mapLocations.forEach((loc, index) => {
      // Tenta pegar a lat/lng do JSON. Se não existir, gera uma posição falsa próxima para testes
      const lat = (loc as any).lat || (baseLat + (index * 0.005) - 0.01);
      const lng = (loc as any).lng || (baseLng + (index * 0.005) - 0.01);

      const isVisited = this.isLocationVisited(loc.name);
      
      // Cores em HEX para manter consistência com o tema do Ionic (success = verde, primary = azul)
      const pinColor = isVisited ? '#00ff66' : '#083e9a'; 
      const pinSymbol = isVisited ? '✓' : '📌';

      const customIcon = L.divIcon({
        className: 'custom-nearby-pin',
        html: `
          <div style="background-color: white; border-radius: 50%; width: 30px; height: 30px; border: 3px solid ${pinColor}; box-shadow: 0 3px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transform: translateY(-5px);">
            <span style="color: ${pinColor}; font-size: 14px; font-weight: 900;">${pinSymbol}</span>
          </div>
          <div style="text-align: center; margin-top: 2px; font-weight: bold; color: #333; text-shadow: 1px 1px 2px white; font-size: 12px; white-space: nowrap; transform: translateX(-25%);">
            ${loc.name}
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);
      
      // Vincula o clique no pin
      marker.on('click', () => {
        // Envolve em NgZone para o Angular "ouvir" o evento e abrir a modal imediatamente
        this.zone.run(() => {
          this.selectLocation(loc);
        });
      });
    });
  }

  // Prevenção de quebras de memória
  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  // FIM DOS MÉTODOS DO LEAFLET ==================================

  // NOVA FUNÇÃO: Ativa/Desativa a partilha diretamente pela barra de ferramentas
  async toggleSharing() {
    this.sharingLocation = !this.sharingLocation;
    
    const storage = (this.dataService as any)._storage;
    if (storage) {
      await storage.set('sharing_active', this.sharingLocation);
    }
    
    if (this.sharingLocation) {
      this.presentToast('Partilha de localização em direto ATIVADA!');
    } else {
      this.presentToast('Partilha de localização DESATIVADA.');
    }
  }

  async loadData() {
    this.mapLocations = await this.dataService.getMapLocations();
    this.visitedLocations = await this.dataService.getVisitedLocations();
    
    // Atualiza os pins caso o mapa já esteja carregado (ex: o utilizador gravou uma visita e a cor deve mudar para verde)
    if (this.map) {
      this.initMap();
    }
  }

  isLocationVisited(locationName: string): boolean {
    const found = this.visitedLocations.find(v => v.name === locationName);
    return !!found && found.hasRecord;
  }

  getLocationPhoto(locationName: string): string {
    const found = this.visitedLocations.find(v => v.name === locationName);
    return found?.photoUrl || '';
  }

  handleFABClick() {
    this.currentStep = 'confirm';
  }

  confirmLocation() {
    this.currentStep = 'feedback';
  }

  async submitFeedback() {
    if (!this.tempComment.trim()) {
      this.presentToast('Por favor, adicione um comentário sobre o local.');
      return;
    }
    
    const visited: VisitedLocation = {
      id: Date.now().toString(),
      name: this.currentLocationName,
      hasRecord: true,
      rating: this.tempRating,
      comment: this.tempComment
    };
    
    await this.dataService.saveVisitedLocation(visited);
    await this.loadData();
    
    this.currentStep = 'addRecord';
  }

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

  async savePhoto(presetPhoto: string) {
    const loading = await this.loadingController.create({
      message: 'A guardar fotografia...',
      spinner: 'circles'
    });
    await loading.present();

    this.tempPhotoUrl = presetPhoto;
    
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
    
    await this.dataService.saveExpense(newExpense);
    await this.loadData();
    
    await loading.dismiss();
    await this.presentToast(`Despesa de €${this.tempCostAmount.toFixed(2)} guardada!`);
    
    this.tempCostAmount = null;
    this.hasAddedCost = true;
    this.currentStep = 'addRecord';
  }

  finishVisit() {
    this.presentToast('Visita registrada com absoluto sucesso!');
    this.currentStep = 'map';
    this.tempComment = '';
    this.tempRating = 5;
    this.tempPhotoUrl = '';
    
    this.hasAddedPhoto = false; 
    this.hasAddedCost = false;
  }

  cancelFlow() {
    this.currentStep = 'map';
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2500,
      position: 'bottom',
      cssClass: 'custom-toast'
    });
    await toast.present();
  }

  selectLocation(location: MapLocation) {
    this.currentLocationName = location.name;
    this.presentToast(`Local selecionado: ${location.name}. Clique no botão azul abaixo para registrar sua visita!`);
  }

  activateShareMode() { 
    this.showShareSheet = true; 
  }

  async confirmShare() {
    const selectedCount = this.contactsList.filter(c => c.selected).length;
    if (selectedCount === 0) {
      this.presentToast('Por favor, selecione ao menos um contato de confiança.');
      return;
    }
    const durationMap: Record<string, string> = { '1h': '1 hora', '2h': '2 horas', '5h': '5 horas', 'sempre': 'Até eu desligar' };
    
    this.sharingLocation = true; 
    this.shareDetails = { contactsCount: selectedCount, duration: durationMap[this.selectedDuration] || '2 horas' };
    this.showShareSheet = false; 
    
    const storage = (this.dataService as any)._storage;
    if (storage) {
      await storage.set('sharing_active', true);
      await storage.set('sharing_contacts_count', selectedCount.toString());
      await storage.set('sharing_duration', this.shareDetails.duration);
    }
    
    this.presentToast(`Partilha de localização ativa com ${selectedCount} contato(s)`);
  }

  async stopSharing() {
    this.sharingLocation = false;
    this.showShareSheet = false; 
    
    const storage = (this.dataService as any)._storage;
    if (storage) {
      await storage.set('sharing_active', false);
    }
    
    this.presentToast('Partilha de localização desativada.');
  }
}