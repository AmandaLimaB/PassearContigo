import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService, Trip } from '../../services/data.service';

@Component({
  selector: 'app-my-trips',
  templateUrl: './my-trips.page.html',
  styleUrls: ['./my-trips.page.scss'],
})
export class MyTripsPage implements OnInit {
  // Lista de viagens passadas e atual da usuária
  tripsList: Trip[] = [];

  constructor(
    private dataService: DataService,
    private router: Router
  ) { }

  ngOnInit() {
  }

  // Carrega as informações dinamicamente a cada entrada na página (Requisito 9 e 15)
  async ionViewWillEnter() {
    this.tripsList = await this.dataService.getTrips();
  }

  // Navega de volta ao mapa, passando o ID da viagem como parâmetro de rota (Requisito 4 e 5)
  goToMapForTrip(tripId: string) {
    this.router.navigate(['/tabs/map'], {
      queryParams: { tripId: tripId }
    });
  }

  // Gera um array auxiliar para renderizar as estrelas da nota de viagem
  getStarsArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i);
  }
}
