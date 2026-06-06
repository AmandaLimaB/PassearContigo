import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { IonicModule } from '@ionic/angular'; 

// Import Ionic
import { IonicModule as IonicAngularModule } from '@ionic/angular'; 

import { CadastroPageRoutingModule } from './cadastro-routing.module';
import { CadastroPage } from './cadastro.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,        
    IonicAngularModule,  
    CadastroPageRoutingModule
  ],
  declarations: [CadastroPage]
})
export class CadastroPageModule {}