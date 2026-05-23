import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-viagem-detalhe',
  templateUrl: './viagem-detalhe.page.html',
  styleUrls: ['./viagem-detalhe.page.scss'],
  standalone: false,
})
export class ViagemDetalhePage implements OnInit {
  tripId: string | null = null;

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.tripId = this.route.snapshot.paramMap.get('id');
  }
}
