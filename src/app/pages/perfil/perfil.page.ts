import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { SqliteService } from '../../services/sqlite.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false,
})
export class PerfilPage implements OnInit {
  // Controle do estado da partilha de localização em tempo real
  sharingActive = false;
  showShareSheet = false;
  
  // Detalhes da partilha ativa
  shareDetails = {
    contactsCount: 0,
    duration: '2 horas'
  };

  dadosUsuario: any = {
    id: null,
    nome: 'Carregando...',
    email: '',
    imagem_base64: ''
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
    private sqlite: SqliteService,
    private toastController: ToastController
  ) { }

  async ngOnInit() {
    await this.applyRotationLock();
    
    // Aguarda que o SQLite esteja pronto antes de ler os dados
    this.sqlite.bancoPronto$.subscribe(async (pronto) => {
      if (pronto) {
        await this.carregarDadosDoPerfil();
      }
    });
  } // <-- A CHAVETA QUE FALTAVA FECHAR ESTÁ AQUI!

  async carregarDadosDoPerfil() {
    try {
      // Vai buscar a lista de utilizadores guardados no SQLite real
      const utilizadores = await this.sqlite.listarUtilizadores();
      
      if (utilizadores && utilizadores.length > 0) {
        // Para testes, pegamos o primeiro utilizador cadastrado (ex: a Amanda)
        this.dadosUsuario = utilizadores[0]; 
        console.log('Dados do perfil carregados do SQLite:', this.dadosUsuario);
      } else {
        console.warn('Nenhum utilizador encontrado no banco de dados SQLite.');
      }

      // Carrega as configurações de partilha simuladas/persistidas
      await this.loadSharingState();

    } catch (erro) {
      console.error('Erro ao ler dados do perfil do SQLite:', erro);
    }
  }

  async ionViewWillEnter() {
    console.log('Entrou na página de perfil.');
  }

  // Carrega se a partilha já estava ativa (Simulado via localStorage para evitar crashes)
  async loadSharingState() {
    const isSharing = localStorage.getItem('sharing_active') === 'true';
    this.sharingActive = isSharing;
    if (this.sharingActive) {
      const count = parseInt(localStorage.getItem('sharing_contacts_count') || '1', 10);
      const dur = localStorage.getItem('sharing_duration') || '2 horas';
      this.shareDetails = { contactsCount: count, duration: dur };
    }
  }

  // Ativa a exibição do Bottom Sheet de compartilhamento de localização
  activateShareMode() {
    this.showShareSheet = true;
  }

  // Grava o estado de partilha ativa e dispara notificações
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

    // Grava de forma persistente utilizando localStorage padrão para o estado da partilha
    localStorage.setItem('sharing_active', 'true');
    localStorage.setItem('sharing_contacts_count', selectedCount.toString());
    localStorage.setItem('sharing_duration', this.shareDetails.duration);

    this.presentToast(`Partilha de localização ativa com ${selectedCount} contato(s)`);
  }

  // Desativa e apaga o estado ativo da partilha
  async stopSharing() {
    this.sharingActive = false;
    localStorage.setItem('sharing_active', 'false');
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
        await ScreenOrientation.lock({ orientation: 'portrait' });
      } else {
        await ScreenOrientation.unlock();
      }
    } catch (err) {
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