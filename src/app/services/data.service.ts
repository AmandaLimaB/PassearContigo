import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { firstValueFrom, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SqliteService } from './sqlite.service';

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  locations: number;
  totalSpent: number;
  rating: number;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  location: string;
  date: string;
  tripId?: string;
}

export interface VisitedLocation {
  id: string;
  name: string;
  hasRecord: boolean;
  rating?: number;
  comment?: string;
  photoUrl?: string;
  tripId?: string;
}

export interface MapLocation {
  name: string;
  lat: number;
  lng: number;
}

const DEFAULT_LOCAIS = [
  { id: 'v1', nome: 'Santuário de Santa Luzia', name: 'Santuário de Santa Luzia', hasRecord: true, rating: 5, avaliacao: 5, nota: 5, comentario: 'Vista inacreditável sobre o rio Lima e o oceano. Uma das basílicas mais belas de Portugal!', comment: 'Vista inacreditável sobre o rio Lima e o oceano. Uma das basílicas mais belas de Portugal!', descricao: 'Vista inacreditável sobre o rio Lima e o oceano. Uma das basílicas mais belas de Portugal!', viagem_id: 1, tripId: 1, foto_url: '', photoUrl: '' },
  { id: 'v2', nome: 'Ponte de Lima', name: 'Ponte de Lima', hasRecord: true, rating: 4, avaliacao: 4, nota: 4, comentario: 'A vila mais antiga de Portugal, a ponte romana é espetacular. Comida maravilhosa!', comment: 'A vila mais antiga de Portugal, a ponte romana é espetacular. Comida maravilhosa!', descricao: 'A vila mais antiga de Portugal, a ponte romana é espetacular. Comida maravilhosa!', viagem_id: 1, tripId: 1, foto_url: '', photoUrl: '' },
  { id: 'v3', nome: 'Praia da Rocha', name: 'Praia da Rocha', hasRecord: true, rating: 5, avaliacao: 5, nota: 5, comentario: 'Falésias de cor dourada e areal incrível. Recomendo imenso caminhar no passadiço ao pôr do sol!', comment: 'Falésias de cor dourada e areal incrível. Recomendo imenso caminhar no passadiço ao pôr do sol!', descricao: 'Falésias de cor dourada e areal incrível. Recomendo imenso caminhar no passadiço ao pôr do sol!', viagem_id: 3, tripId: 3, foto_url: '', photoUrl: '' },
  { id: 'v4', nome: 'Farol do Cabo de São Vicente', name: 'Farol do Cabo de São Vicente', hasRecord: true, rating: 5, avaliacao: 5, nota: 5, comentario: 'O fim do mundo do Algarve. Pôr do sol mágico e um vento revigorante!', comment: 'O fim do mundo do Algarve. Pôr do sol mágico e um vento revigorante!', descricao: 'O fim do mundo do Algarve. Pôr do sol mágico e um vento revigorante!', viagem_id: 3, tripId: 3, foto_url: '', photoUrl: '' }
];

const DEFAULT_GASTOS = [
  { id: 1, categoria: 'Entradas/Cultura', category: 'Entradas/Cultura', nome_gasto: 'Entradas/Cultura', valor: 15.0, amount: 15.0, descricao: 'Santuário de Santa Luzia', local: 'Santuário de Santa Luzia', location: 'Santuário de Santa Luzia', data: '17 Mar 2026', date: '17 Mar 2026', viagem_id: 1, tripId: 1 },
  { id: 2, categoria: 'Alimentação', category: 'Alimentação', nome_gasto: 'Alimentação', valor: 45.5, amount: 45.5, descricao: 'Ponte de Lima', local: 'Ponte de Lima', location: 'Ponte de Lima', data: '16 Mar 2026', date: '16 Mar 2026', viagem_id: 1, tripId: 1 },
  { id: 3, categoria: 'Transporte', category: 'Transporte', nome_gasto: 'Transporte', valor: 12.0, amount: 12.0, descricao: 'Viana do Castelo', local: 'Viana do Castelo', location: 'Viana do Castelo', data: '15 Mar 2026', date: '15 Mar 2026', viagem_id: 1, tripId: 1 },
  { id: 4, categoria: 'Alojamento', category: 'Alojamento', nome_gasto: 'Alojamento', valor: 80.0, amount: 80.0, descricao: 'Braga', local: 'Braga', location: 'Braga', data: '14 Mar 2026', date: '14 Mar 2026', viagem_id: 1, tripId: 1 },
  { id: 5, categoria: 'Alimentação', category: 'Alimentação', nome_gasto: 'Alimentação', valor: 65.0, amount: 65.0, descricao: 'Albufeira', local: 'Albufeira', location: 'Albufeira', data: '18 Jan 2026', date: '18 Jan 2026', viagem_id: 3, tripId: 3 },
  { id: 6, categoria: 'Alojamento', category: 'Alojamento', nome_gasto: 'Alojamento', valor: 250.0, amount: 250.0, descricao: 'Praia da Rocha', local: 'Praia da Rocha', location: 'Praia da Rocha', data: '16 Jan 2026', date: '16 Jan 2026', viagem_id: 3, tripId: 3 },
  { id: 7, categoria: 'Transporte', category: 'Transporte', nome_gasto: 'Transporte', valor: 45.0, amount: 45.0, descricao: 'Faro', local: 'Faro', location: 'Faro', data: '15 Jan 2026', date: '15 Jan 2026', viagem_id: 3, tripId: 3 },
  { id: 8, categoria: 'Entradas/Cultura', category: 'Entradas/Cultura', nome_gasto: 'Entradas/Cultura', valor: 30.0, amount: 30.0, descricao: 'Farol do Cabo de São Vicente', local: 'Farol do Cabo de São Vicente', location: 'Farol do Cabo de São Vicente', data: '20 Jan 2026', date: '20 Jan 2026', viagem_id: 3, tripId: 3 }
];

const DEFAULT_VIAGENS = [
  { id: 1, nome: 'Norte de Portugal', data_inicio: '10 Mar 2026', data_fim: '17 Mar 2026', avaliacao: 5, pessoa_id: 1 },
  { id: 2, nome: 'Lisboa e Sintra', data_inicio: '01 Fev 2026', data_fim: '05 Fev 2026', avaliacao: 4, pessoa_id: 1 },
  { id: 3, nome: 'Algarve', data_inicio: '15 Jan 2026', data_fim: '22 Jan 2026', avaliacao: 5, pessoa_id: 1 }
];

const DEFAULT_MAP_LOCATIONS: MapLocation[] = [
  { name: 'Santuário de Santa Luzia', lat: 41.6925, lng: -8.8303 },
  { name: 'Ponte de Lima', lat: 41.7676, lng: -8.5834 },
  { name: 'Castelo de Viana', lat: 41.6937, lng: -8.8347 },
  { name: 'Praia da Rocha', lat: 37.1189, lng: -8.5357 },
  { name: 'Farol do Cabo de São Vicente', lat: 37.0233, lng: -8.9964 }
];

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private _storage: Storage | null = null;
  private mockDataPath = 'assets/data/mock.json';
  private hasVisitedPerfilFlag = false;

  constructor(
    private http: HttpClient,
    private storage: Storage,
    private sqlite: SqliteService
  ) {
    this.init();
  }

  async init() {
    if (!this._storage) {
      this._storage = await this.storage.create();
    }
    this.ensureMockDataSeeded();
  }

  private ensureMockDataSeeded() {
    if (!localStorage.getItem('mock_viagens')) {
      localStorage.setItem('mock_viagens', JSON.stringify(DEFAULT_VIAGENS));
    }
    if (!localStorage.getItem('mock_locais')) {
      localStorage.setItem('mock_locais', JSON.stringify(DEFAULT_LOCAIS));
    }
    if (!localStorage.getItem('mock_gastos')) {
      localStorage.setItem('mock_gastos', JSON.stringify(DEFAULT_GASTOS));
    }
  }

  private getMockData(): Observable<any> {
    return this.http.get<any>(this.mockDataPath).pipe(
      catchError(() => of({ locations: DEFAULT_MAP_LOCATIONS }))
    );
  }

  async getMapLocations(): Promise<MapLocation[]> {
    try {
      const data = await firstValueFrom(this.getMockData());
      return data.locations || DEFAULT_MAP_LOCATIONS;
    } catch {
      return DEFAULT_MAP_LOCATIONS;
    }
  }

  // ===========================================================================
  // VIAGENS
  // ===========================================================================

  async getTrips(): Promise<any[]> {
    const dbInstance = (this.sqlite as any).db;
    if (dbInstance) {
      const usuarioId = localStorage.getItem('usuario_logado_id');
      const pessoaId = usuarioId ? parseInt(usuarioId, 10) : 1;
      const res = await dbInstance.query({
        statement: 'SELECT * FROM viagens WHERE pessoa_id = ? ORDER BY id DESC;',
        values: [pessoaId]
      });
      return res.values || [];
    }

    const viagens = JSON.parse(localStorage.getItem('mock_viagens') || '[]');
    return viagens;
  }

  async getTripsWithStats(): Promise<any[]> {
    const dbInstance = (this.sqlite as any).db;
    const trips = await this.getTrips();

    return Promise.all(trips.map(async (t: any) => {
      const tripId = t.id;

      if (dbInstance) {
        const locaisRes = await dbInstance.query({ statement: 'SELECT COUNT(*) as count FROM locais WHERE viagem_id = ?;', values: [tripId] });
        const gastosRes = await dbInstance.query({ statement: 'SELECT SUM(valor) as total FROM gastos WHERE viagem_id = ?;', values: [tripId] });
        return {
          id: t.id,
          nome: t.local || t.nome || '',
          data_inicio: t.data_ida || t.data_inicio || '',
          data_fim: t.data_volta || t.data_fim || '',
          avaliacao: t.avaliacao || 5,
          locais: locaisRes.values?.[0]?.count || 0,
          total_gasto: gastosRes.values?.[0]?.total || 0
        };
      } else {
        const tripIdStr = tripId.toString();
        const mockLocais = JSON.parse(localStorage.getItem('mock_locais') || '[]');
        const mockGastos = JSON.parse(localStorage.getItem('mock_gastos') || '[]');
        const locaisCount = mockLocais.filter((l: any) => l.viagem_id?.toString() === tripIdStr || l.tripId?.toString() === tripIdStr).length;
        const totalGasto = mockGastos.filter((g: any) => g.viagem_id?.toString() === tripIdStr || g.tripId?.toString() === tripIdStr)
          .reduce((sum: number, g: any) => sum + (g.valor || g.amount || 0), 0);
        return {
          id: t.id,
          nome: t.local || t.nome || '',
          data_inicio: t.data_ida || t.data_inicio || '',
          data_fim: t.data_volta || t.data_fim || '',
          avaliacao: t.avaliacao || 5,
          locais: locaisCount,
          total_gasto: totalGasto
        };
      }
    }));
  }

  async getActiveTripId(): Promise<number> {
    const loggedId = localStorage.getItem('usuario_logado_id');
    const pessoaId = loggedId ? parseInt(loggedId, 10) : 1;

    const dbInstance = (this.sqlite as any).db;
    if (dbInstance) {
      const res = await dbInstance.query({
        statement: 'SELECT id FROM viagens WHERE pessoa_id = ? ORDER BY id DESC LIMIT 1;',
        values: [pessoaId]
      });
      if (res.values && res.values.length > 0) return res.values[0].id;
      
      const dataInicio = new Date().toISOString().split('T')[0];
      await dbInstance.run({
        statement: 'INSERT INTO viagens (local, data_ida, data_volta, avaliacao, pessoa_id) VALUES (?, ?, ?, ?, ?);',
        values: ['Viagem Atual', dataInicio, 'A definir', 5, pessoaId]
      });
      
      const resNew = await dbInstance.query({
        statement: 'SELECT id FROM viagens WHERE pessoa_id = ? ORDER BY id DESC LIMIT 1;',
        values: [pessoaId]
      });
      return resNew.values[0].id;
    }
    
    const viagens = JSON.parse(localStorage.getItem('mock_viagens') || '[]');
    const userViagens = viagens.filter((v: any) => v.pessoa_id?.toString() === pessoaId.toString());
    
    if (userViagens.length > 0) {
      return userViagens[userViagens.length - 1].id;
    }
    
    const dataInicio = new Date().toISOString().split('T')[0];
    const newTrip = {
      id: Date.now(),
      nome: 'Viagem Atual',
      data_inicio: dataInicio,
      data_fim: 'A definir',
      avaliacao: 5,
      pessoa_id: pessoaId
    };
    viagens.push(newTrip);
    localStorage.setItem('mock_viagens', JSON.stringify(viagens));
    return newTrip.id;
  }

  // ===========================================================================
  // LOCAIS VISITADOS
  // ===========================================================================

  async getVisitedLocations(): Promise<VisitedLocation[]> {
    const mockLocais = JSON.parse(localStorage.getItem('mock_locais') || '[]');
    return mockLocais.map((l: any) => ({
      id: l.id?.toString() || '',
      name: l.nome || l.name || '',
      hasRecord: true,
      rating: l.rating || l.avaliacao || l.nota || 5,
      comment: l.comment || l.comentario || l.descricao || '',
      photoUrl: l.photoUrl || l.foto_url || '',
      tripId: l.tripId?.toString() || l.viagem_id?.toString() || '1'
    }));
  }

  async saveVisitedLocation(visited: VisitedLocation): Promise<void> {
    const activeTripId = await this.getActiveTripId();
    const rating = visited.rating || 5;
    const comment = visited.comment || '';
    const photoUrl = visited.photoUrl || '';

    const dbInstance = (this.sqlite as any).db;
    if (dbInstance) {
      const existing = await dbInstance.query({
        statement: 'SELECT id FROM locais WHERE nome = ? AND viagem_id = ?;',
        values: [visited.name, activeTripId]
      });
      if (existing.values && existing.values.length > 0) {
        await dbInstance.run({
          statement: 'UPDATE locais SET nota = ?, descricao = ?, foto_url = ? WHERE id = ?;',
          values: [rating, comment, photoUrl, existing.values[0].id]
        });
      } else {
        await this.sqlite.cadastrarLocal(visited.name, comment, rating, activeTripId, photoUrl);
      }
    }

    // Sempre persiste no localStorage para que todas as páginas leiam
    const locais = JSON.parse(localStorage.getItem('mock_locais') || '[]');
    const existingIdx = locais.findIndex((l: any) =>
      (l.nome === visited.name || l.name === visited.name) &&
      (l.viagem_id?.toString() === activeTripId.toString() || l.tripId?.toString() === activeTripId.toString())
    );

    const novoLocal = {
      id: existingIdx > -1 ? locais[existingIdx].id : Date.now(),
      nome: visited.name,
      name: visited.name,
      descricao: comment,
      comment: comment,
      comentario: comment,
      nota: rating,
      rating: rating,
      avaliacao: rating,
      viagem_id: activeTripId,
      tripId: activeTripId,
      foto_url: photoUrl,
      photoUrl: photoUrl,
      hasRecord: true
    };

    if (existingIdx > -1) {
      locais[existingIdx] = novoLocal;
    } else {
      locais.push(novoLocal);
    }
    localStorage.setItem('mock_locais', JSON.stringify(locais));
  }

  // ===========================================================================
  // DESPESAS
  // ===========================================================================

  async getExpenses(): Promise<any[]> {
    return JSON.parse(localStorage.getItem('mock_gastos') || '[]');
  }

  async saveExpense(expense: Expense): Promise<void> {
    const activeTripId = await this.getActiveTripId();

    const dbInstance = (this.sqlite as any).db;
    if (dbInstance) {
      await this.sqlite.cadastrarGasto(
        expense.date || new Date().toISOString().split('T')[0],
        expense.category,
        expense.amount,
        expense.location,
        activeTripId
      );
    }

    // Sempre persiste no localStorage
    const gastos = JSON.parse(localStorage.getItem('mock_gastos') || '[]');
    gastos.push({
      id: Date.now(),
      data: expense.date || new Date().toISOString().split('T')[0],
      date: expense.date || new Date().toISOString().split('T')[0],
      nome_gasto: expense.category,
      categoria: expense.category,
      category: expense.category,
      valor: expense.amount,
      amount: expense.amount,
      descricao: expense.location,
      local: expense.location,
      location: expense.location,
      viagem_id: activeTripId,
      tripId: activeTripId
    });
    localStorage.setItem('mock_gastos', JSON.stringify(gastos));
  }

  // ===========================================================================
  // GUARD DE PERFIL
  // ===========================================================================

  async hasVisitedPerfil(): Promise<boolean> {
    if (!this._storage) await this.init();
    const visited = await this._storage?.get('visited_perfil');
    return !!visited || this.hasVisitedPerfilFlag;
  }

  async setVisitedPerfil(value: boolean): Promise<void> {
    if (!this._storage) await this.init();
    await this._storage?.set('visited_perfil', value);
    this.hasVisitedPerfilFlag = value;
  }
}
