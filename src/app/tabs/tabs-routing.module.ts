import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TabsPage } from './tabs.page';

import { PerfilGuard } from '../guards/perfil.guard';

// Definição das rotas filhas em português para suportar Angular Lazy Loading de cada módulo (Requisito 7)
const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'mapa',
        loadChildren: () => import('../pages/mapa/mapa.module').then(m => m.MapaPageModule)
      },
      {
        path: 'viagens',
        children: [
          {
            path: '',
            loadChildren: () => import('../pages/viagens/viagens.module').then(m => m.ViagensPageModule)
          },
          {
            path: 'viagem-detalhe/:id',
            loadChildren: () => import('../pages/viagem-detalhe/viagem-detalhe.module').then(m => m.ViagemDetalhePageModule)
          }
        ]
      },
      {
        path: 'financas',
        loadChildren: () => import('../pages/financas/financas.module').then(m => m.FinancasPageModule),
        canActivate: [PerfilGuard]
      },
      {
        path: 'perfil',
        loadChildren: () => import('../pages/perfil/perfil.module').then(m => m.PerfilPageModule)
      },
      {
        path: '',
        redirectTo: 'mapa',
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
