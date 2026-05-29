import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { SqliteService } from '../../services/sqlite.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-viagens',
  templateUrl: './viagens.page.html',
  styleUrls: ['./viagens.page.scss'],
  standalone: false,
})
export class ViagensPage implements OnInit, OnDestroy {
  // Lista de viagens vindas do banco ou do mock
  tripsList: any[] = [];

  // Controle de estado para exibição do Modal
  isAddTripModalOpen = false;

  // Campos temporários do formulário
  newTripName = '';
  newTripStartDate = '';
  newTripEndDate = '';
  newTripRating = 5;

  // Guarda o estado de prontidão do banco localmente para evitar usar o .value do Observable
  isDbReady = false;
  private dbSubscription!: Subscription;

  constructor(
    private sqlite: SqliteService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
    // Subscreve ao estado do banco de forma segura
    this.dbSubscription = this.sqlite.bancoPronto$.subscribe(async (pronto) => {
      this.isDbReady = pronto;
      if (pronto) {
        await this.loadTrips();
      }
    });
  }

  ngOnDestroy() {
    // Evita vazamento de memória (Memory Leak)
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
    }
  }

  // Carrega as informações dinamicamente a cada reentrada na página
  async ionViewWillEnter() {
    if (this.isDbReady) {
      await this.loadTrips();
    } else {
      // Se o banco nativo não estiver pronto (ex: no Navegador), tenta carregar do localStorage
      this.loadMockTrips();
    }
  }

  // Tenta obter a conexão de forma reflexiva/segura ou executa o fallback mock
  async loadTrips() {
    try {
      // 1. Verifica se o teu serviço possui um método público direto para listar viagens
      if (typeof (this.sqlite as any).listarViagens === 'function') {
        this.tripsList = await (this.sqlite as any).listarViagens();
        return;
      }

      // 2. Tenta descobrir como a conexão "db" está exposta (pode ser um método público)
      const dbInstance = this.getSqliteDbInstance();

      if (!dbInstance) {
        this.loadMockTrips();
        return;
      }

      // Executa a query na instância encontrada
      const resultado = await dbInstance.query({ statement: 'SELECT * FROM viagens;' });
      this.tripsList = resultado.values ? resultado.values : [];
      console.log('Viagens carregadas do SQLite:', this.tripsList);
    } catch (erro) {
      console.error('Erro ao carregar viagens do SQLite:', erro);
      this.loadMockTrips(); // Fallback de segurança
    }
  }

  // Valida e grava uma nova viagem
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

    try {
      const dataInicio = this.newTripStartDate || new Date().toISOString().split('T')[0];
      const dataFim = this.newTripEndDate || 'A definir';

      const dbInstance = this.getSqliteDbInstance();

      if (!dbInstance) {
        // MODO NAVEGADOR / SIMULAÇÃO
        const mockViagens = JSON.parse(localStorage.getItem('mock_viagens') || '[]');
        const novaViagemMock = {
          id: Date.now(),
          nome: this.newTripName,
          data_inicio: dataInicio,
          data_fim: dataFim,
          locais: 0,
          total_gasto: 0,
          avaliacao: this.newTripRating
        };
        mockViagens.push(novaViagemMock);
        localStorage.setItem('mock_viagens', JSON.stringify(mockViagens));
        this.loadMockTrips();
      } else {
        // MODO REAL (Telemóvel)
        const sql = `INSERT INTO viagens (nome, data_inicio, data_fim, avaliacao) VALUES (?, ?, ?, ?);`;
        await dbInstance.run({
          statement: sql,
          values: [this.newTripName, dataInicio, dataFim, this.newTripRating]
        });
        await this.loadTrips();
      }

      await loading.dismiss();
      await this.presentToast('Nova viagem criada com absoluto sucesso!');
      this.closeAddTripModal();

    } catch (erro) {
      await loading.dismiss();
      console.error('Erro ao gravar nova viagem:', erro);
      this.presentToast('Erro ao salvar a viagem no banco de dados.');
    }
  }

  // Método auxiliar para ler dados fictícios se o plugin nativo não estiver disponível
  private loadMockTrips() {
    this.tripsList = JSON.parse(localStorage.getItem('mock_viagens') || '[]');
  }

  // Descobre dinamicamente a propriedade ou método que guarda o banco de dados dentro do serviço privado
  private getSqliteDbInstance(): any {
    if ((this.sqlite as any).db) return (this.sqlite as any).db;
    if (typeof (this.sqlite as any).getDbConnection === 'function') return (this.sqlite as any).getDbConnection();
    if (typeof (this.sqlite as any).getDatabase === 'function') return (this.sqlite as any).getDatabase();
    return null;
  }

  goToTripDetails(tripId: number | string) {
    this.router.navigate(['/tabs/viagem-detalhe', tripId]);
  }

  openAddTripModal() {
    this.isAddTripModalOpen = true;
  }

  closeAddTripModal() {
    this.isAddTripModalOpen = false;
    this.clearForm();
  }

  private clearForm() {
    this.newTripName = '';
    this.newTripStartDate = '';
    this.newTripEndDate = '';
    this.newTripRating = 5;
  }

  getStarsArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i);
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2500,
      position: 'bottom'
    });
    await toast.present();
  }
}