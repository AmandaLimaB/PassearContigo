import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MyTripsPageRoutingModule } from './my-trips-routing.module';

import { MyTripsPage } from './my-trips.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MyTripsPageRoutingModule
  ],
  declarations: [MyTripsPage]
})
export class MyTripsPageModule {}
