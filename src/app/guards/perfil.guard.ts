import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { DataService } from '../services/data.service';

@Injectable({
  providedIn: 'root'
})
export class PerfilGuard implements CanActivate {
  constructor(
    private dataService: DataService,
    private router: Router,
    private toastController: ToastController
  ) {}

  async canActivate(): Promise<boolean | UrlTree> {
    const hasVisited = await this.dataService.hasVisitedPerfil();
    if (hasVisited) {
      return true;
    } else {
      // Apresenta uma mensagem toast para explicar o porquê do bloqueio (Fator UX excelente)
      const toast = await this.toastController.create({
        message: 'Acesso bloqueado! É obrigatório visitar o Perfil antes de aceder às Finanças.',
        duration: 3000,
        color: 'warning',
        position: 'bottom',
        buttons: [{ text: 'OK', role: 'cancel' }]
      });
      await toast.present();
      
      // Redireciona o utilizador para a página de perfil
      return this.router.parseUrl('/tabs/perfil');
    }
  }
}
