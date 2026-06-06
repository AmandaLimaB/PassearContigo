import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { SqliteService } from '../../services/sqlite.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false,
})
export class PerfilPage implements OnInit {
  sharingActive = false;
  showShareSheet = false;
  shareDetails = { contactsCount: 0, duration: '2 horas' };

  dadosUsuario: any = { id: null, nome: 'Carregando...', email: '', imagem_base64: '' };
  estatisticas = { viagens: 0, locais: 0, paises: 0 };
  rotationLocked = true;

  contactsList = [
    { id: '1', name: 'Ana Souza (Mãe)', selected: false },
    { id: '2', name: 'Carlos Lima (Namorado)', selected: false },
    { id: '3', name: 'Julia Martins (Irmã)', selected: false },
    { id: '4', name: 'Pedro Alves (Amigo)', selected: false }
  ];
  selectedDuration = '2h';

  constructor(
    private sqlite: SqliteService,
    private toastController: ToastController,
    private dataService: DataService,
    private router: Router
  ) { }

  async ngOnInit() {
    await this.applyRotationLock();
    // Libera finanças
    await this.dataService.setVisitedPerfil(true);

    this.sqlite.bancoPronto$.subscribe(async () => {
      await this.carregarDadosDoPerfil();
    });
  }

  async ionViewWillEnter() {
    await this.carregarDadosDoPerfil();
  }

  async carregarDadosDoPerfil() {
    try {
      const utilizadores = await this.sqlite.listarUtilizadores();

      if (utilizadores && utilizadores.length > 0) {
        const loggedId = localStorage.getItem('usuario_logado_id');
        let usuario = null;
        if (loggedId) {
          usuario = utilizadores.find((u: any) => u.id?.toString() === loggedId);
        }
        this.dadosUsuario = usuario || utilizadores[0];
      }

      await this.atualizarEstatisticas();
      await this.loadSharingState();
    } catch (erro) {
      console.error('Erro ao ler dados do perfil:', erro);
    }
  }

  async atualizarEstatisticas() {
    try {
      const dbInstance = (this.sqlite as any).db;
      const loggedId = localStorage.getItem('usuario_logado_id');
      const pessoaId = loggedId ? parseInt(loggedId, 10) : 1;

      if (dbInstance) {
        const viagens = await this.sqlite.listarViagensDaPessoa(pessoaId);
        let totalLocais = 0;
        for (const v of viagens) {
          const res = await dbInstance.query({ statement: 'SELECT COUNT(*) as count FROM locais WHERE viagem_id = ?;', values: [v.id] });
          totalLocais += res.values?.[0]?.count || 0;
        }
        this.estatisticas = {
          viagens: viagens.length,
          locais: totalLocais,
          paises: viagens.length > 0 ? 1 : 0
        };
      } else {
        // Lê mock local
        const mockViagens = JSON.parse(localStorage.getItem('mock_viagens') || '[]');
        const userViagens = mockViagens.filter((v: any) => v.pessoa_id?.toString() === pessoaId.toString());
        const mockLocais = JSON.parse(localStorage.getItem('mock_locais') || '[]');

        const viagensIds = userViagens.map((v: any) => v.id.toString());
        const totalLocais = mockLocais.filter((l: any) =>
          viagensIds.includes(l.viagem_id?.toString()) || viagensIds.includes(l.tripId?.toString())
        ).length;

        this.estatisticas = {
          viagens: userViagens.length,
          locais: totalLocais,
          paises: userViagens.length > 0 ? 1 : 0
        };
      }
    } catch (e) {
      console.error('Erro ao atualizar estatísticas do perfil:', e);
    }
  }

  async loadSharingState() {
    const isSharing = localStorage.getItem('sharing_active') === 'true';
    this.sharingActive = isSharing;
    if (this.sharingActive) {
      const count = parseInt(localStorage.getItem('sharing_contacts_count') || '1', 10);
      const dur = localStorage.getItem('sharing_duration') || '2 horas';
      this.shareDetails = { contactsCount: count, duration: dur };
    }
  }

  activateShareMode() { this.showShareSheet = true; }

  async confirmShare() {
    const selectedCount = this.contactsList.filter(c => c.selected).length;
    if (selectedCount === 0) {
      this.presentToast('Por favor, selecione ao menos um contato de confiança.');
      return;
    }
    const durationMap: Record<string, string> = { '1h': '1 hora', '2h': '2 horas', '5h': '5 horas', 'sempre': 'Até eu desligar' };
    this.sharingActive = true;
    this.shareDetails = { contactsCount: selectedCount, duration: durationMap[this.selectedDuration] || '2 horas' };
    this.showShareSheet = false;
    localStorage.setItem('sharing_active', 'true');
    localStorage.setItem('sharing_contacts_count', selectedCount.toString());
    localStorage.setItem('sharing_duration', this.shareDetails.duration);
    this.presentToast(`Partilha de localização ativa com ${selectedCount} contato(s)`);
  }

  async stopSharing() {
    this.sharingActive = false;
    localStorage.setItem('sharing_active', 'false');
    this.presentToast('Partilha de localização desativada.');
  }

  async toggleRotationLock() { await this.applyRotationLock(); }

  private async applyRotationLock() {
    try {
      if (this.rotationLocked) {
        await ScreenOrientation.lock({ orientation: 'portrait' });
      } else {
        await ScreenOrientation.unlock();
      }
    } catch (err) {
      console.warn('ScreenOrientation indisponível no navegador web', err);
    }
  }

  toggleContactSelection(contact: any) { contact.selected = !contact.selected; }

  async presentToast(message: string) {
    const toast = await this.toastController.create({ message, duration: 2000, position: 'bottom' });
    await toast.present();
  }

  logout() {
    localStorage.removeItem('usuario_logado_id');
    this.router.navigate(['/cadastro']);
  }
}