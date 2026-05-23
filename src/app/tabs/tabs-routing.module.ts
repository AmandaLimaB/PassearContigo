import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TabsPage } from './tabs.page';

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
        loadChildren: () => import('../pages/viagens/viagens.module').then(m => m.ViagensPageModule)
      },
      {
        path: 'financas',
        loadChildren: () => import('../pages/financas/financas.module').then(m => m.FinancasPageModule)
      },
      {
        path: 'perfil',
        loadChildren: () => import('../pages/perfil/perfil.module').then(m => m.PerfilPageModule)
      },
      {
        path: 'viagem-detalhe/:id',
        loadChildren: () => import('../pages/viagem-detalhe/viagem-detalhe.module').then(m => m.ViagemDetalhePageModule)
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
