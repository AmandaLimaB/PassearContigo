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
      // Adiciona o ouvinte para o evento 'accel' (Acelerômetro) através do Capacitor Motion
      this.accelListenerHandle = await Motion.addListener('accel', async (event) => {
        // Obtermos os eixos X (lateral) e Y (vertical) incluindo a gravidade da Terra
        const x = event.accelerationIncludingGravity.x;
        const y = event.accelerationIncludingGravity.y;
        
        // Lógica programática para validar a orientação física do dispositivo móvel:
        // Se a aceleração no eixo X for maior que no eixo Y de forma expressiva,
        // significa que o dispositivo foi rotacionado fisicamente de lado (Landscape)
        if (Math.abs(x) > Math.abs(y) + 2.5) {
          // O sensor detectou rotação física na horizontal (Landscape)
          await this.handleDeviceLandscapeDetection();
        }
      });
      
      console.log('Monitoramento do acelerômetro ativado programaticamente com sucesso!');
    } catch (err) {
      // Fallback gracioso para testes no navegador que não possui giroscópio físico
      console.warn('O acelerômetro não está disponível no navegador web (Sensor simulado programaticamente)', err);
    }
  }

  // Lógica acionada quando o sensor detecta inclinação Landscape
  private async handleDeviceLandscapeDetection() {
    try {
      // Bloqueia a orientação de tela em Portrait (Retrato) programaticamente via código
      await ScreenOrientation.lock({ orientation: 'portrait' });
      
      // Apresenta aviso sutil na tela do dispositivo alertando sobre a ação do acelerômetro
      const now = Date.now();
      if (now - this.lastToastTime > 5000) { // Throttle de 5 segundos para evitar spam de Toasts
        this.lastToastTime = now;
        this.presentToast('O Acelerômetro detectou inclinação lateral! Tela bloqueada programaticamente em Retrato.');
      }
    } catch (err) {
      console.warn('Erro ao forçar orientação via ScreenOrientation (simulado em navegador web)');
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
