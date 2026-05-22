import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { firstValueFrom, Observable } from 'rxjs';

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
}

// Interface que define o formato de um Local Visitado/Mapa
export interface VisitedLocation {
  id: string;
  name: string;
  hasRecord: boolean;
  rating?: number;
  comment?: string;
  photoUrl?: string;
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

  // Carrega os dados padrão do arquivo JSON (Requisito 10)
  private getMockData(): Observable<any> {
    return this.http.get<any>(this.mockDataPath);
  }

  // Retorna a lista de locais pré-definidos para o mapa
  async getMapLocations(): Promise<MapLocation[]> {
    try {
      const data = await firstValueFrom(this.getMockData());
      return data.locations || [];
    } catch (error) {
      console.error('Erro ao ler locais do JSON', error);
      return [];
    }
  }

  // Obtém todas as viagens (mescla o mock estático do JSON com o Storage persistente)
  async getTrips(): Promise<Trip[]> {
    await this.ensureStorageReady();
    const storedTrips = await this._storage?.get('trips') || [];
    
    // Se não houver nada no storage, carregamos as viagens iniciais do JSON e salvamos
    if (storedTrips.length === 0) {
      try {
        const data = await firstValueFrom(this.getMockData());
        const initialTrips = data.trips || [];
        await this._storage?.set('trips', initialTrips);
        return initialTrips;
      } catch (error) {
        console.error('Erro ao buscar viagens do JSON', error);
        return [];
      }
    }
    return storedTrips;
  }

  // Adiciona ou atualiza uma viagem no Storage
  async saveTrip(trip: Trip): Promise<Trip[]> {
    await this.ensureStorageReady();
    const trips = await this.getTrips();
    
    // Filtra para evitar duplicados e adiciona a nova
    const updatedTrips = [trip, ...trips.filter(t => t.id !== trip.id)];
    await this._storage?.set('trips', updatedTrips);
    return updatedTrips;
  }

  // Obtém todas as despesas (mescla o mock do JSON com o Storage persistente)
  async getExpenses(): Promise<Expense[]> {
    await this.ensureStorageReady();
    const storedExpenses = await this._storage?.get('expenses') || [];
    
    if (storedExpenses.length === 0) {
      try {
        const data = await firstValueFrom(this.getMockData());
        const initialExpenses = data.expenses || [];
        await this._storage?.set('expenses', initialExpenses);
        return initialExpenses;
      } catch (error) {
        console.error('Erro ao buscar despesas do JSON', error);
        return [];
      }
    }
    return storedExpenses;
  }

  // Salva uma despesa no Storage
  async saveExpense(expense: Expense): Promise<Expense[]> {
    await this.ensureStorageReady();
    const expenses = await this.getExpenses();
    const updatedExpenses = [expense, ...expenses.filter(e => e.id !== expense.id)];
    await this._storage?.set('expenses', updatedExpenses);
    
    // Atualiza também o total gasto na viagem ativa (simulado na primeira viagem da lista)
    await this.updateActiveTripExpenses(expense.amount);
    
    return updatedExpenses;
  }

  // Adiciona o valor gasto na viagem atual
  private async updateActiveTripExpenses(amount: number) {
    const trips = await this.getTrips();
    if (trips.length > 0) {
      // Adiciona o gasto à primeira viagem como simulação da viagem ativa
      trips[0].totalSpent += amount;
      await this._storage?.set('trips', trips);
    }
  }

  // Obtém todos os registros de locais visitados (persiste fotos, comentários, etc.)
  async getVisitedLocations(): Promise<VisitedLocation[]> {
    await this.ensureStorageReady();
    return await this._storage?.get('visited_locations') || [];
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
    
    // Incrementa também o número de locais visitados na viagem ativa para atualizar a UI
    const trips = await this.getTrips();
    if (trips.length > 0 && !visitedList.some(loc => loc.name === visited.name && loc.hasRecord)) {
      trips[0].locations += 1;
      await this._storage?.set('trips', trips);
    }
    
    return updatedList;
  }
}
