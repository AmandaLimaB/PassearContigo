import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FinancasPageRoutingModule } from './financas-routing.module';
import { FinancasPage } from './financas.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FinancasPageRoutingModule
  ],
  declarations: [FinancasPage]
})
export class FinancasPageModule {}
