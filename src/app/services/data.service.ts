import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { firstValueFrom, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Interface que define o formato de uma Viagem
export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  locations: number;
  totalSpent: number;
  rating: number;
}

// Interface que define o formato de uma Despesa
export interface Expense {
  id: string;
  category: string;
  amount: number;
  location: string;
  date: string;
  tripId?: string;
}

// Interface que define o formato de um Local Visitado/Mapa
export interface VisitedLocation {
  id: string;
  name: string;
  hasRecord: boolean;
  rating?: number;
  comment?: string;
  photoUrl?: string;
  tripId?: string;
}

// Interface que define o formato dos locais no mapa
export interface MapLocation {
  name: string;
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private _storage: Storage | null = null;
  private mockDataPath = 'assets/data/mock.json';

  // Caches em memória para carregamento instantâneo (otimização de performance)
  private tripsCache: Trip[] | null = null;
  private expensesCache: Expense[] | null = null;
  private visitedCache: VisitedLocation[] | null = null;

  // Flag em memória para navegação condicional (Guard de Finanças)
  private hasVisitedPerfilFlag = false;

  // Dados mockados robustos de fallback em caso de falha de carregamento do JSON
  private defaultMockData = {
    trips: [
      {
        id: "1",
        name: "Norte de Portugal",
        startDate: "10 Mar 2026",
        endDate: "17 Mar 2026",
        locations: 12,
        totalSpent: 450.0,
        rating: 5
      },
      {
        id: "2",
        name: "Lisboa e Sintra",
        startDate: "01 Fev 2026",
        endDate: "05 Fev 2026",
        locations: 8,
        totalSpent: 320.0,
        rating: 4
      },
      {
        id: "3",
        name: "Algarve",
        startDate: "15 Jan 2026",
        endDate: "22 Jan 2026",
        locations: 15,
        totalSpent: 580.0,
        rating: 5
      }
    ],
    expenses: [
      {
        id: "1",
        category: "Entradas/Cultura",
        amount: 15.0,
        location: "Santuário de Santa Luzia",
        date: "17 Mar 2026",
        tripId: "1"
      },
      {
        id: "2",
        category: "Alimentação",
        amount: 45.5,
        location: "Ponte de Lima",
        date: "16 Mar 2026",
        tripId: "1"
      },
      {
        id: "3",
        category: "Transporte",
        amount: 12.0,
        location: "Viana do Castelo",
        date: "15 Mar 2026",
        tripId: "1"
      },
      {
        id: "4",
        category: "Alojamento",
        amount: 80.0,
        location: "Braga",
        date: "14 Mar 2026",
        tripId: "1"
      },
      {
        id: "5",
        category: "Alimentação",
        amount: 65.0,
        location: "Albufeira",
        date: "18 Jan 2026",
        tripId: "3"
      },
      {
        id: "6",
        category: "Alojamento",
        amount: 250.0,
        location: "Praia da Rocha",
        date: "16 Jan 2026",
        tripId: "3"
      },
      {
        id: "7",
        category: "Transporte",
        amount: 45.0,
        location: "Faro",
        date: "15 Jan 2026",
        tripId: "3"
      },
      {
        id: "8",
        category: "Entradas/Cultura",
        amount: 30.0,
        location: "Farol do Cabo de São Vicente",
        date: "20 Jan 2026",
        tripId: "3"
      }
    ],
    locations: [
      {
        name: "Santuário de Santa Luzia",
        lat: 41.6925,
        lng: -8.8303
      },
      {
        name: "Ponte de Lima",
        lat: 41.7676,
        lng: -8.5834
      },
      {
        name: "Castelo de Viana",
        lat: 41.6937,
        lng: -8.8347
      },
      {
        name: "Praia da Rocha",
        lat: 37.1189,
        lng: -8.5357
      },
      {
        name: "Farol do Cabo de São Vicente",
        lat: 37.0233,
        lng: -8.9964
      }
    ]
  };

  constructor(
    private http: HttpClient,
    private storage: Storage
  ) {
    this.init();
  }

  // Inicializa o banco de dados local do Ionic Storage (Requisito 9)
  async init() {
    if (!this._storage) {
      const storage = await this.storage.create();
      this._storage = storage;
    }
  }

  // Garante que o storage esteja pronto antes de qualquer operação
  private async ensureStorageReady() {
    if (!this._storage) {
      await this.init();
    }
  }

  // Carrega os dados padrão do arquivo JSON (Requisito 10) com tratamento de erro
  private getMockData(): Observable<any> {
    return this.http.get<any>(this.mockDataPath).pipe(
      catchError(err => {
        console.warn('Erro ao carregar mock.json via HTTP, usando fallback robusto local', err);
        return of(this.defaultMockData);
      })
    );
  }

  // Retorna a lista de locais pré-definidos para o mapa
  async getMapLocations(): Promise<MapLocation[]> {
    try {
      const data = await firstValueFrom(this.getMockData());
      return data.locations || this.defaultMockData.locations;
    } catch (error) {
      return this.defaultMockData.locations;
    }
  }

  // Obtém todas as viagens (mescla com cache em memória para velocidade instantânea)
  async getTrips(): Promise<Trip[]> {
    if (this.tripsCache) {
      return this.tripsCache;
    }
    await this.ensureStorageReady();
    const storedTrips = await this._storage?.get('trips');
    
    if (!storedTrips || storedTrips.length === 0) {
      try {
        const data = await firstValueFrom(this.getMockData());
        const initialTrips = data.trips || this.defaultMockData.trips;
        await this._storage?.set('trips', initialTrips);
        this.tripsCache = initialTrips;
        return initialTrips;
      } catch (error) {
        this.tripsCache = this.defaultMockData.trips;
        return this.defaultMockData.trips;
      }
    }
    this.tripsCache = storedTrips;
    return storedTrips;
  }

  // Obtém uma viagem específica pelo ID
  async getTripById(id: string): Promise<Trip | undefined> {
    const trips = await this.getTrips();
    return trips.find(t => t.id === id);
  }

  // Adiciona ou atualiza uma viagem no Storage
  async saveTrip(trip: Trip): Promise<Trip[]> {
    await this.ensureStorageReady();
    const trips = await this.getTrips();
    const updatedTrips = [trip, ...trips.filter(t => t.id !== trip.id)];
    await this._storage?.set('trips', updatedTrips);
    this.tripsCache = updatedTrips;
    return updatedTrips;
  }

  // Obtém todas as despesas (utiliza cache para melhor performance)
  async getExpenses(): Promise<Expense[]> {
    if (this.expensesCache) {
      return this.expensesCache;
    }
    await this.ensureStorageReady();
    const storedExpenses = await this._storage?.get('expenses');
    
    if (!storedExpenses || storedExpenses.length === 0) {
      try {
        const data = await firstValueFrom(this.getMockData());
        const initialExpenses = data.expenses || this.defaultMockData.expenses;
        await this._storage?.set('expenses', initialExpenses);
        this.expensesCache = initialExpenses;
        return initialExpenses;
      } catch (error) {
        this.expensesCache = this.defaultMockData.expenses;
        return this.defaultMockData.expenses;
      }
    }
    this.expensesCache = storedExpenses;
    return storedExpenses;
  }

  // Salva uma despesa no Storage
  async saveExpense(expense: Expense): Promise<Expense[]> {
    await this.ensureStorageReady();
    const expenses = await this.getExpenses();
    const updatedExpenses = [expense, ...expenses.filter(e => e.id !== expense.id)];
    await this._storage?.set('expenses', updatedExpenses);
    this.expensesCache = updatedExpenses;
    
    // Atualiza também o total gasto na viagem à qual esta despesa pertence
    if (expense.tripId) {
      await this.updateTripExpenses(expense.tripId, expense.amount);
    } else {
      await this.updateTripExpenses("1", expense.amount); // Fallback para viagem 1
    }
    
    return updatedExpenses;
  }

  // Adiciona o valor gasto a uma viagem específica
  private async updateTripExpenses(tripId: string, amount: number) {
    const trips = await this.getTrips();
    const matchedTrip = trips.find(t => t.id === tripId);
    if (matchedTrip) {
      matchedTrip.totalSpent += amount;
      await this._storage?.set('trips', trips);
      this.tripsCache = trips;
    }
  }

  // Obtém todos os registros de locais visitados (persiste fotos, comentários, etc.)
  async getVisitedLocations(): Promise<VisitedLocation[]> {
    if (this.visitedCache) {
      return this.visitedCache;
    }
    await this.ensureStorageReady();
    const stored = await this._storage?.get('visited_locations');
    if (!stored || stored.length === 0) {
      const initialVisited = [
        {
          id: "v1",
          name: "Santuário de Santa Luzia",
          hasRecord: true,
          rating: 5,
          comment: "Vista inacreditável sobre o rio Lima e o oceano. Uma das basílicas mais belas de Portugal!",
          tripId: "1"
        },
        {
          id: "v2",
          name: "Ponte de Lima",
          hasRecord: true,
          rating: 4,
          comment: "A vila mais antiga de Portugal, a ponte romana é espetacular. Comida maravilhosa!",
          tripId: "1"
        },
        {
          id: "v3",
          name: "Praia da Rocha",
          hasRecord: true,
          rating: 5,
          comment: "Falésias de cor dourada e areal incrível. Recomendo imenso caminhar no passadiço ao pôr do sol!",
          tripId: "3"
        },
        {
          id: "v4",
          name: "Farol do Cabo de São Vicente",
          hasRecord: true,
          rating: 5,
          comment: "O fim do mundo do Algarve. Pôr do sol mágico e um vento revigorante!",
          tripId: "3"
        }
      ];
      await this._storage?.set('visited_locations', initialVisited);
      this.visitedCache = initialVisited;
      return initialVisited;
    }
    this.visitedCache = stored;
    return stored;
  }

  // Salva o feedback/registro de visita de um determinado local no mapa
  async saveVisitedLocation(visited: VisitedLocation): Promise<VisitedLocation[]> {
    await this.ensureStorageReady();
    const visitedList = await this.getVisitedLocations();
    const updatedList = [
      ...visitedList.filter(loc => loc.name !== visited.name),
      visited
    ];
    await this._storage?.set('visited_locations', updatedList);
    this.visitedCache = updatedList;
    
    // Incrementa também o número de locais visitados na viagem ativa para atualizar a UI
    const trips = await this.getTrips();
    const tripId = visited.tripId || "1";
    const matchedTrip = trips.find(t => t.id === tripId);
    if (matchedTrip && !visitedList.some(loc => loc.name === visited.name && loc.hasRecord)) {
      matchedTrip.locations += 1;
      await this._storage?.set('trips', trips);
      this.tripsCache = trips;
    }
    
    return updatedList;
  }

  // Métodos do Guard para controlar a navegação baseada no Perfil
  async hasVisitedPerfil(): Promise<boolean> {
    await this.ensureStorageReady();
    const visited = await this._storage?.get('visited_perfil');
    return !!visited || this.hasVisitedPerfilFlag;
  }

  async setVisitedPerfil(value: boolean): Promise<void> {
    await this.ensureStorageReady();
    await this._storage?.set('visited_perfil', value);
    this.hasVisitedPerfilFlag = value;
  }
}
