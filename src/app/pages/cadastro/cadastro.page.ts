import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SqliteService } from '../../services/sqlite.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.page.html',
  styleUrls: ['./cadastro.page.scss'],
})
export class CadastroPage implements OnInit {
  // Controla tela atual
  modo: 'login' | 'cadastro' = 'login';

  // Campos login
  emailInput: string = '';
  senhaInput: string = '';

  // Campos cadastro
  nomeInput: string = '';
  imagemBase64: string = '';
  

  constructor(private sqlite: SqliteService, private router: Router, private alertController: AlertController) {}

  ngOnInit() {}

  // Muda tela
  mudarModo(novoModo: 'login' | 'cadastro') {
    this.modo = novoModo;
    // Limpa campos
    this.emailInput = '';
    this.senhaInput = '';
    this.nomeInput = '';
    this.imagemBase64 = '';
  }

  async exibirAlerta(titulo: string, mensagem: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensagem,
      buttons: ['OK'],
      cssClass: 'alerta-customizado' // Estilo alerta
    });

    await alert.present();
  }

  // Faz login
  async efetuarLogin() {
    if (!this.emailInput || !this.senhaInput) {
      await this.exibirAlerta('Aviso', 'Por favor, preencha o e-mail e a senha!');
      return;
    }

    try {
      const utilizadores = await this.sqlite.listarUtilizadores();
      const usuarioValido = utilizadores.find(
        (u) => u.email === this.emailInput && u.senha === this.senhaInput
      );

      if (usuarioValido) {
        localStorage.setItem('usuario_logado_id', usuarioValido.id.toString());
        this.router.navigate(['/tabs/perfil']); 
      } else {
        await this.exibirAlerta('Aviso', 'Email ou senha incorretos.');
      }
    } catch (erro: any) {
      console.error('Erro detalhado no login:', erro);
      const msg = erro?.message || (typeof erro === 'string' ? erro : JSON.stringify(erro)) || 'Erro desconhecido';
      await this.exibirAlerta('Erro ao iniciar sessão.', `Ocorreu um erro ao aceder à base de dados. Detalhes: ${msg}`);
    }
  }

  // Faz cadastro
  async efetuarCadastro() {
    if (!this.nomeInput || !this.emailInput || !this.senhaInput) {
      await this.exibirAlerta('Aviso', 'Por favor, preencha todos os dados!');
      return;
    }

    try {
      // Checa se existe
      const usuarioExiste = await this.sqlite.verificarUsuarioExistente(this.emailInput);
      if (usuarioExiste) {
        await this.exibirAlerta('Aviso', 'Este e-mail já está registado!');
        return;
      }

      // Salva pessoa
      await this.sqlite.cadastrarPessoa(
        this.nomeInput,
        this.emailInput,
        this.senhaInput,
        this.imagemBase64
      );
      
      await this.exibirAlerta('Conta criada com sucesso!', 'Faça login agora.');
      this.mudarModo('login'); // Vai pro login
    } catch (erro: any) {
      console.error('Erro detalhado no fluxo de registo:', erro);
      const msg = erro?.message || (typeof erro === 'string' ? erro : JSON.stringify(erro)) || 'Erro desconhecido';
      await this.exibirAlerta('Erro ao cadastrar.', `Ocorreu um erro ao processar o seu registo. Detalhes: ${msg}`);
    }
  }

  // Pega foto
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagemBase64 = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
}