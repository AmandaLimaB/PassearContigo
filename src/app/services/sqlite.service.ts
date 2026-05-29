import { Injectable } from '@angular/core';
import { CapacitorSQLite } from 'capacitor-sqlite';
import { BehaviorSubject, Observable } from 'rxjs'; // <-- IMPORTANTE para gerir o estado assíncrono

@Injectable({
  providedIn: 'root'
})
export class SqliteService {
  private sqliteConnection: any;
  private db: any;
  
  // Subject que avisa a aplicação quando a ligação ao banco de dados está aberta
  private bancoProntoSubject = new BehaviorSubject<boolean>(false);
  public bancoPronto$: Observable<boolean> = this.bancoProntoSubject.asObservable();
  
  constructor() {
    this.sqliteConnection = CapacitorSQLite;
    // Dispara a inicialização automática ao carregar a app
    this.inicializarBancoDeDados();
  }

  async inicializarBancoDeDados(): Promise<void> {
    try {
      this.db = await this.sqliteConnection.createConnection({
        database: 'passear_contigo_db',
        encrypted: false,
        mode: 'no-encryption',
        version: 1
      });

      await this.db.open();

      // Ativar suporte a Chaves Estrangeiras
      await this.db.execute({ statements: `PRAGMA foreign_keys = ON;` });

      // 1. TABELA PESSOA
      const tabelaPessoa = `
        CREATE TABLE IF NOT EXISTS pessoas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          senha TEXT NOT NULL,
          imagem_base64 TEXT
        );
      `;

      // 2. TABELA VIAGENS
      const tabelaViagens = `
        CREATE TABLE IF NOT EXISTS viagens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          local TEXT NOT NULL,
          data_ida TEXT NOT NULL,
          data_volta TEXT NOT NULL,
          avaliacao INTEGER CHECK(avaliacao >= 1 AND avaliacao <= 5),
          pessoa_id INTEGER NOT NULL,
          FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
        );
      `;

      // 3. TABELA GASTOS
      const tabelaGastos = `
        CREATE TABLE IF NOT EXISTS gastos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data TEXT NOT NULL,
          nome_gasto TEXT NOT NULL,
          descricao TEXT,
          viagem_id INTEGER NOT NULL,
          FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE CASCADE
        );
      `;

      // 4. TABELA LOCAIS
      const tabelaLocais = `
        CREATE TABLE IF NOT EXISTS locais (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          descricao TEXT,
          nota INTEGER CHECK(nota >= 1 AND nota <= 5),
          viagem_id INTEGER NOT NULL,
          FOREIGN KEY (viagem_id) REFERENCES viagens(id) ON DELETE CASCADE
        );
      `;

      // Executar a criação de todas as tabelas
      await this.db.execute({ statements: tabelaPessoa });
      await this.db.execute({ statements: tabelaViagens });
      await this.db.execute({ statements: tabelaGastos });
      await this.db.execute({ statements: tabelaLocais });

      console.log('Todas as tabelas do projeto foram criadas com sucesso!');
      
      // AVISAR A APLICAÇÃO QUE O BANCO ESTÁ PRONTO PARA RECEBER CADASTROS
      this.bancoProntoSubject.next(true);

    } catch (erro) {
      console.error('Erro ao inicializar o banco de dados:', erro);
      this.bancoProntoSubject.next(false);
    }
  }

  // =========================================================================
  // FUNÇÕES DE INSERÇÃO (CORRIGIDAS PARA A NOVA API DO CAPACITOR)
  // =========================================================================

  async cadastrarPessoa(nome: string, email: string, senha: string, imagemBase64: string): Promise<void> {
    const sql = `INSERT INTO pessoas (nome, email, senha, imagem_base64) VALUES (?, ?, ?, ?);`;
    // Ajustado para passar a estrutura de parâmetros corretos à API estável
    await this.db.run({ statement: sql, values: [nome, email, senha, imagemBase64] });
    console.log('Utilizador cadastrado com sucesso no SQLite!');
  }

  async cadastrarViagem(local: string, dataIda: string, dataVolta: string, avaliacao: number, pessoaId: number): Promise<void> {
    const sql = `INSERT INTO viagens (local, data_ida, data_volta, avaliacao, pessoa_id) VALUES (?, ?, ?, ?, ?);`;
    await this.db.run({ statement: sql, values: [local, dataIda, dataVolta, avaliacao, pessoaId] });
  }

  async cadastrarGasto(data: string, nomeGasto: string, descricao: string, viagemId: number): Promise<void> {
    const sql = `INSERT INTO gastos (data, nome_gasto, descricao, viagem_id) VALUES (?, ?, ?, ?);`;
    await this.db.run({ statement: sql, values: [data, nomeGasto, descricao, viagemId] });
  }

  async cadastrarLocal(nome: string, descricao: string, nota: number, viagemId: number): Promise<void> {
    const sql = `INSERT INTO locais (nome, descricao, nota, viagem_id) VALUES (?, ?, ?, ?);`;
    await this.db.run({ statement: sql, values: [nome, descricao, nota, viagemId] });
  }

  // =========================================================================
  // FUNÇÕES DE CONSULTA (SELECT)
  // =========================================================================

  async listarUtilizadores(): Promise<any[]> {
    if (!this.db) return [];
    const sql = `SELECT * FROM pessoas;`;
    const resultado = await this.db.query({ statement: sql });
    return resultado.values ? resultado.values : [];
  }

  async listarViagensDaPessoa(pessoaId: number): Promise<any[]> {
    const sql = `SELECT * FROM viagens WHERE pessoa_id = ? ORDER BY data_ida DESC;`;
    const resultado = await this.db.query({ statement: sql, values: [pessoaId] });
    return resultado.values ? resultado.values : [];
  }

  async listarGastosDaViagem(viagemId: number): Promise<any[]> {
    const sql = `SELECT * FROM gastos WHERE viagem_id = ? ORDER BY data DESC;`;
    const resultado = await this.db.query({ statement: sql, values: [viagemId] });
    return resultado.values ? resultado.values : [];
  }

  async listarLocaisDaViagem(viagemId: number): Promise<any[]> {
    const sql = `SELECT * FROM locais WHERE viagem_id = ?;`;
    const resultado = await this.db.query({ statement: sql, values: [viagemId] });
    return resultado.values ? resultado.values : [];
  }

  // =========================================================================
  // FUNÇÕES DE EDIÇÃO (UPDATE)
  // =========================================================================

  async editarPessoa(id: number, nome: string, email: string, senha: string, imagemBase64: string): Promise<void> {
    const sql = `
      UPDATE pessoas 
      SET nome = ?, email = ?, senha = ?, imagem_base64 = ? 
      WHERE id = ?;
    `;
    await this.db.run({ statement: sql, values: [nome, email, senha, imagemBase64, id] });
    console.log(`Pessoa com ID ${id} atualizada com sucesso!`);
  }

  async editarViagem(id: number, local: string, dataIda: string, dataVolta: string, avaliacao: number): Promise<void> {
    const sql = `
      UPDATE viagens 
      SET local = ?, data_ida = ?, data_volta = ?, avaliacao = ? 
      WHERE id = ?;
    `;
    await this.db.run({ statement: sql, values: [local, dataIda, dataVolta, avaliacao, id] });
  }

  async editarGasto(id: number, data: string, nomeGasto: string, descricao: string): Promise<void> {
    const sql = `
      UPDATE gastos 
      SET data = ?, nome_gasto = ?, descricao = ? 
      WHERE id = ?;
    `;
    await this.db.run({ statement: sql, values: [data, nomeGasto, descricao, id] });
  }

  async editarLocal(id: number, nome: string, descricao: string, nota: number): Promise<void> {
    const sql = `
      UPDATE locais 
      SET nome = ?, descricao = ?, nota = ? 
      WHERE id = ?;
    `;
    await this.db.run({ statement: sql, values: [nome, descricao, nota, id] });
  }
}