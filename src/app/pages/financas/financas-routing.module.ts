import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FinancasPage } from './financas.page';

const routes: Routes = [
  {
    path: '',
    component: FinancasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FinancasPageRoutingModule {}
