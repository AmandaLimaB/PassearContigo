import { Component, OnInit } from '@angular/core';
import { DataService, Trip } from '../../services/data.service';

/**
 * Page component representing the My Trips list.
 * Displays all past and current trips loaded from local storage.
 * 
 * @author Antigravity
 */
@Component({
  selector: 'app-my-trips',
  templateUrl: './my-trips.page.html',
  styleUrls: ['./my-trips.page.scss'],
})
export class MyTripsPage implements OnInit {
  trips: Trip[] = [];

  constructor(private dataService: DataService) {}

  async ngOnInit() {
    await this.loadTrips();
  }

  async ionViewWillEnter() {
    await this.loadTrips();
  }

  /**
   * Fetches the current list of trips from DataService.
   */
  async loadTrips() {
    this.trips = await this.dataService.getTrips();
  }

  /**
   * Helper to generate dummy arrays for star rendering.
   */
  getStars(rating: number): number[] {
    return Array(rating);
  }

  getEmptyStars(rating: number): number[] {
    return Array(5 - rating);
  }
}
