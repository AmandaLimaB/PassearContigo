import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Motion } from '@capacitor/motion';
import { ScreenOrientation } from '@capacitor/screen-orientation';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private platform: Platform) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(async () => {
      try {
        await ScreenOrientation.lock({ orientation: 'portrait' });
        console.log('Orientação padrão bloqueada para portrait.');
      } catch (err) {
        console.warn('ScreenOrientation não suportado neste ambiente', err);
      }

      try {
        await Motion.addListener('accel', (event) => {
          // Se inclinar lateralmente
          if (Math.abs(event.acceleration.x) > 7) {
            console.log('Dispositivo inclinado (Landscape detectado)! Mantendo em Portrait.');
            ScreenOrientation.lock({ orientation: 'portrait' }).catch(e => console.warn(e));
          }
        });
      } catch (err) {
        console.warn('Motion API não suportada neste ambiente', err);
      }
    });
  }
}
