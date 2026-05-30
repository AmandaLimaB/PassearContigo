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
  // Variável que controla qual formulário aparece na tela ('login' ou 'cadastro')
  modo: 'login' | 'cadastro' = 'login';

  // Campos partilhados / Login
  emailInput: string = '';
  senhaInput: string = '';

  // Campos exclusivos do Cadastro
  nomeInput: string = '';
  imagemBase64: string = '';
  

  constructor(private sqlite: SqliteService, private router: Router, private alertController: AlertController) {}

  ngOnInit() {}

  // Função para alternar entre as telas
  mudarModo(novoModo: 'login' | 'cadastro') {
    this.modo = novoModo;
    // Limpa os campos ao alternar para evitar confusão
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
      cssClass: 'alerta-customizado' // Opcional: para estilizar via CSS depois
    });

    await alert.present();
  }

  // Lógica de Login
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

  // Lógica de Cadastro
  async efetuarCadastro() {
    if (!this.nomeInput || !this.emailInput || !this.senhaInput) {
      await this.exibirAlerta('Aviso', 'Por favor, preencha todos os dados!');
      return;
    }

    try {
      // 1. Verificar se o utilizador já existe antes de tentar cadastrar
      const usuarioExiste = await this.sqlite.verificarUsuarioExistente(this.emailInput);
      if (usuarioExiste) {
        await this.exibirAlerta('Aviso', 'Este e-mail já está registado!');
        return;
      }

      // 2. Tentar cadastrar a pessoa na base de dados
      await this.sqlite.cadastrarPessoa(
        this.nomeInput,
        this.emailInput,
        this.senhaInput,
        this.imagemBase64
      );
      
      await this.exibirAlerta('Conta criada com sucesso!', 'Faça login agora.');
      this.mudarModo('login'); // Alterna automaticamente para o formulário de login
    } catch (erro: any) {
      console.error('Erro detalhado no fluxo de registo:', erro);
      const msg = erro?.message || (typeof erro === 'string' ? erro : JSON.stringify(erro)) || 'Erro desconhecido';
      await this.exibirAlerta('Erro ao cadastrar.', `Ocorreu um erro ao processar o seu registo. Detalhes: ${msg}`);
    }
  }

  // Processar foto de perfil
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