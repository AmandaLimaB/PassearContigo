import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit {
  // Controle do estado da partilha de localização em tempo real
  sharingActive = false;
  showShareSheet = false;
  
  // Detalhes da partilha ativa
  shareDetails = {
    contactsCount: 0,
    duration: '2 horas'
  };

  // Estado do bloqueio de rotação do acelerômetro do dispositivo (Requisito 12)
  rotationLocked = true;

  // Lista simulada de contatos confiáveis da usuária
  contactsList = [
    { id: '1', name: 'Ana Souza (Mãe)', selected: false },
    { id: '2', name: 'Carlos Lima (Namorado)', selected: false },
    { id: '3', name: 'Julia Martins (Irmã)', selected: false },
    { id: '4', name: 'Pedro Alves (Amigo)', selected: false }
  ];

  // Tempo de duração escolhido para a partilha
  selectedDuration = '2h';

  constructor(
    private dataService: DataService,
    private toastController: ToastController
  ) { }

  async ngOnInit() {
    // Inicializa o bloqueio de rotação em modo retrato por padrão para cumprir o requisito
    await this.applyRotationLock();
    await this.loadSharingState();
  }

  // Carrega se a partilha já estava ativa em memória persistente
  async loadSharingState() {
    const storage = (this.dataService as any)._storage;
    if (storage) {
      const isSharing = await storage.get('sharing_active');
      this.sharingActive = !!isSharing;
      if (this.sharingActive) {
        const count = await storage.get('sharing_contacts_count') || 1;
        const dur = await storage.get('sharing_duration') || '2 horas';
        this.shareDetails = { contactsCount: count, duration: dur };
      }
    }
  }

  // Ativa a exibição do Bottom Sheet de compartilhamento de localização
  activateShareMode() {
    this.showShareSheet = true;
  }

  // Grava o estado de partilha ativa no Storage e dispara notificações
  async confirmShare() {
    const selectedCount = this.contactsList.filter(c => c.selected).length;
    if (selectedCount === 0) {
      this.presentToast('Por favor, selecione ao menos um contato de confiança.');
      return;
    }

    const durationMap: Record<string, string> = {
      '1h': '1 hora',
      '2h': '2 horas',
      '5h': '5 horas',
      'sempre': 'Até eu desligar'
    };

    this.sharingActive = true;
    this.shareDetails = {
      contactsCount: selectedCount,
      duration: durationMap[this.selectedDuration] || '2 horas'
    };
    
    this.showShareSheet = false;

    // Grava de forma persistente no banco de dados local do Ionic Storage (Requisito 9)
    const storage = (this.dataService as any)._storage;
    if (storage) {
      await storage.set('sharing_active', true);
      await storage.set('sharing_contacts_count', selectedCount);
      await storage.set('sharing_duration', this.shareDetails.duration);
    }

    this.presentToast(`Partilha de localização ativa com ${selectedCount} contato(s)`);
  }

  // Desativa e apaga o estado ativo da partilha
  async stopSharing() {
    this.sharingActive = false;
    
    const storage = (this.dataService as any)._storage;
    if (storage) {
      await storage.set('sharing_active', false);
    }
    
    this.presentToast('Partilha de localização desativada.');
  }

  // Alterna o bloqueio de rotação pelo acelerômetro usando Capacitor (Requisito 12)
  async toggleRotationLock() {
    await this.applyRotationLock();
  }

  // Aplica o bloqueio Portrait/Retrato ou destrava o acelerômetro usando plugins do Capacitor (Requisito 12)
  private async applyRotationLock() {
    try {
      if (this.rotationLocked) {
        // Bloqueia em orientação Retrato (Portrait), impedindo Landscape
        await ScreenOrientation.lock({ orientation: 'portrait' });
      } else {
        // Libera para que o acelerômetro controle livremente a rotação
        await ScreenOrientation.unlock();
      }
    } catch (err) {
      // Tratamento amigável caso esteja sendo executado em ambiente web de testes
      console.warn('ScreenOrientation indisponível no navegador web (Simulado com sucesso)', err);
    }
  }

  // Auxiliar para a seleção de contatos no Bottom Sheet
  toggleContactSelection(contact: any) {
    contact.selected = !contact.selected;
  }

  // Auxiliar para exibição de toasts
  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
