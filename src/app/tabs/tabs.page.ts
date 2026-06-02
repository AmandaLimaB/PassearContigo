import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Motion } from '@capacitor/motion';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { PluginListenerHandle } from '@capacitor/core';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false,
})
export class TabsPage implements OnInit, OnDestroy {
  // Guardamos a referência do listener do acelerômetro para remover no OnDestroy
  private accelListenerHandle: PluginListenerHandle | null = null;
  
  // Throttle temporário para evitar disparar Toasts seguidos
  private lastToastTime = 0;

  constructor(private toastController: ToastController) { }

  async ngOnInit() {
    // Inicia a escuta ativa dos sensores de hardware do aparelho (Requisito 12)
    await this.startAccelerometerListening();
  }

  async ngOnDestroy() {
    // Limpa a escuta do hardware ao destruir o componente (Boas práticas de performance)
    if (this.accelListenerHandle) {
      await this.accelListenerHandle.remove();
    }
  }

  // Monitora os dados do Acelerômetro programaticamente em tempo real (Requisito 12)
  private async startAccelerometerListening() {
    try {
      this.accelListenerHandle = await Motion.addListener('accel', async (event) => {
        const x = event.accelerationIncludingGravity.x;
        const y = event.accelerationIncludingGravity.y;
        
        // Se a inclinação lateral for forte, muda para Landscape
        if (Math.abs(x) > Math.abs(y) + 2.5) {
          await this.handleOrientationChange('landscape');
        } 
        // Se a inclinação vertical for forte, volta para Portrait
        else if (Math.abs(y) > Math.abs(x) + 2.5) {
          await this.handleOrientationChange('portrait');
        }
      });
      
      console.log('Monitoramento do acelerômetro ativado programaticamente com sucesso!');
    } catch (err) {
      console.warn('O acelerômetro não está disponível no navegador web (Sensor simulado programaticamente)', err);
    }
  }

  private currentOrientation = 'portrait';

  private async handleOrientationChange(orientation: 'portrait' | 'landscape') {
    if (this.currentOrientation === orientation) return;
    
    try {
      this.currentOrientation = orientation;
      await ScreenOrientation.lock({ orientation });
      
      const now = Date.now();
      if (now - this.lastToastTime > 5000) {
        this.lastToastTime = now;
        const modo = orientation === 'landscape' ? 'Horizontal' : 'Vertical';
        this.presentToast(`Acelerômetro detectou movimento! Tela alterada para modo ${modo}.`);
      }
    } catch (err) {
      console.warn('Erro ao forçar orientação via ScreenOrientation', err);
    }
  }

  // Auxiliar para a exibição de avisos de toast
  private async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top', // Exibe no topo para não sobrepor o menu de abas inferior
      color: 'primary',
      cssClass: 'accelerometer-toast'
    });
    await toast.present();
  }
}
