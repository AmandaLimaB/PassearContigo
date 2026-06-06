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
  // Salva o listener do acelerômetro
  private accelListenerHandle: PluginListenerHandle | null = null;
  
  // Evita spam de avisos
  private lastToastTime = 0;

  constructor(private toastController: ToastController) { }

  async ngOnInit() {
    // Liga o sensor de movimento
    await this.startAccelerometerListening();
  }

  async ngOnDestroy() {
    // Desliga o sensor ao sair
    if (this.accelListenerHandle) {
      await this.accelListenerHandle.remove();
    }
  }

  // Monitora o acelerômetro
  private async startAccelerometerListening() {
    try {
      this.accelListenerHandle = await Motion.addListener('accel', async (event) => {
        const x = event.accelerationIncludingGravity.x;
        const y = event.accelerationIncludingGravity.y;
        
        // Tela deitada
        if (Math.abs(x) > Math.abs(y) + 2.5) {
          await this.handleOrientationChange('landscape');
        } 
        // Tela em pé
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

  // Mostra um aviso rápido
  private async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top', // Exibe em cima
      color: 'primary',
      cssClass: 'accelerometer-toast'
    });
    await toast.present();
  }
}
