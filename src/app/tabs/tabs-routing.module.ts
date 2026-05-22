import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TabsPage } from './tabs.page';

// Definição das rotas filhas para cada aba da aplicação (Requisito 3 e 4)
const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'map',
        loadChildren: () => import('../pages/map/map.module').then(m => m.MapPageModule)
      },
      {
        path: 'my-trips',
        loadChildren: () => import('../pages/my-trips/my-trips.module').then(m => m.MyTripsPageModule)
      },
      {
        path: 'finances',
        loadChildren: () => import('../pages/finances/finances.module').then(m => m.FinancesPageModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('../pages/profile/profile.module').then(m => m.ProfilePageModule)
      },
      {
        path: '',
        redirectTo: 'map',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule {}
