import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { firstValueFrom } from 'rxjs';

export interface VisitedLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  hasRecord: boolean;
  rating?: number;
  comment?: string;
  photoUrl?: string;
  costAmount?: number;
  costCategory?: string;
}

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
}

/**
 * Service that manages the application state and data persistence.
 * Implements Ionic Storage for persistent local data and handles
 * reading initial setup from static JSON files.
 * 
 * @author Antigravity
 */
@Injectable({
  providedIn: 'root'
})
export class DataService {
  private _storage: Storage | null = null;
  private isInitialized = false;

  constructor(
    private http: HttpClient,
    private storage: Storage
  ) {
    this.init();
  }

  /**
   * Initializes the Ionic Storage system.
   * If storage is empty, it loads initial mock data from mock.json.
   */
  async init() {
    if (this.isInitialized) return;
    const storage = await this.storage.create();
    this._storage = storage;

    // Check if we already have data set in storage. If not, seed with mock data.
    const hasData = await this._storage.get('locations');
    if (!hasData) {
      try {
        const mockData = await firstValueFrom(this.http.get<{
          locations: VisitedLocation[];
          trips: Trip[];
          expenses: Expense[];
        }>('assets/data/mock.json'));

        if (mockData) {
          await this._storage.set('locations', mockData.locations);
          await this._storage.set('trips', mockData.trips);
          await this._storage.set('expenses', mockData.expenses);
        }
      } catch (error) {
        console.error('Error loading initial mock data:', error);
      }
    }
    this.isInitialized = true;
  }

  /**
   * Helper to ensure storage is ready before running any operations.
   */
  private async ensureReady() {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  /**
   * Retrieves all visited locations.
   */
  async getLocations(): Promise<VisitedLocation[]> {
    await this.ensureReady();
    return (await this._storage?.get('locations')) || [];
  }

  /**
   * Saves or updates the list of visited locations.
   */
  async saveLocations(locations: VisitedLocation[]): Promise<void> {
    await this.ensureReady();
    await this._storage?.set('locations', locations);
  }

  /**
   * Updates a single location with visit records (rating, comment, photo, cost).
   */
  async updateLocationRecord(
    locationName: string, 
    record: Partial<VisitedLocation>
  ): Promise<void> {
    const locations = await this.getLocations();
    const updated = locations.map(loc => {
      if (loc.name === locationName) {
        return {
          ...loc,
          ...record,
          hasRecord: true
        };
      }
      return loc;
    });
    await this.saveLocations(updated);
  }

  /**
   * Retrieves all trips.
   */
  async getTrips(): Promise<Trip[]> {
    await this.ensureReady();
    return (await this._storage?.get('trips')) || [];
  }

  /**
   * Saves the list of trips.
   */
  async saveTrips(trips: Trip[]): Promise<void> {
    await this.ensureReady();
    await this._storage?.set('trips', trips);
  }

  /**
   * Retrieves all expenses.
   */
  async getExpenses(): Promise<Expense[]> {
    await this.ensureReady();
    return (await this._storage?.get('expenses')) || [];
  }

  /**
   * Saves a new expense.
   */
  async addExpense(expense: Omit<Expense, 'id' | 'date'>): Promise<void> {
    await this.ensureReady();
    const expenses = await this.getExpenses();
    const newExpense: Expense = {
      ...expense,
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
    };
    expenses.unshift(newExpense); // Add at the beginning
    await this._storage?.set('expenses', expenses);

    // Update the total Spent in the active trip ("Norte de Portugal") for simulation
    const trips = await this.getTrips();
    const updatedTrips = trips.map(t => {
      if (t.id === '1') {
        return {
          ...t,
          totalSpent: t.totalSpent + expense.amount
        };
      }
      return t;
    });
    await this.saveTrips(updatedTrips);
  }
}
