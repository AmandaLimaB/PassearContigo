import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from 'capacitor-sqlite';

@Injectable({
  providedIn: 'root'
})
export class SqliteService {
  private sqliteConnection: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;

  constructor() { }

  async inicializarBancoDeDados(): Promise<void> {
    try {
      this.db = await this.sqliteConnection.createConnection(
        'passear_contigo_db',
        false,
        'no-encryption',
        1,
        false
      );

      await this.db.open();

      // Ativar suporte a Chaves Estrangeiras (Regras de relacionamento)
      await this.db.execute(`PRAGMA foreign_keys = ON;`);

      // 1. TABELA PESSOA
      const tabelaPessoa = `
        CREATE TABLE IF NOT EXISTS pessoas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          senha TEXT NOT NULL,
          imagem_base64 TEXT           -- Guarda a foto da pessoa em formato texto
        );
      `;

      // 2. TABELA VIAGENS (Ligada a uma Única Pessoa)
      const tabelaViagens = `
        CREATE TABLE IF NOT EXISTS viagens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          local TEXT NOT NULL,
          data_ida TEXT NOT NULL,      -- SQLite guarda datas como TEXT (ex: '2026-06-15')
          data_volta TEXT NOT NULL,
          avaliacao INTEGER CHECK(avaliacao >= 1 AND avaliacao <= 5), -- REGRA: Apenas 1 a 5
          pessoa_id INTEGER NOT NULL,
          FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
        );
      `;

      // 3. TABELA GASTOS (Ligada a uma Única Viagem)
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

      // 4. TABELA LOCAIS (Ligada a uma Única Viagem)
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
      await this.db.execute(tabelaPessoa);
      await this.db.execute(tabelaViagens);
      await this.db.execute(tabelaGastos);
      await this.db.execute(tabelaLocais);

      console.log('Todas as tabelas do projeto foram criadas com sucesso!');
    } catch (erro) {
      console.error('Erro ao inicializar o banco de dados:', erro);
    }
  }

  // Inserir Pessoa
  async cadastrarPessoa(nome: string, email: string, senha: string, imagemBase64: string): Promise<void> {
    const sql = `INSERT INTO pessoas (nome, email, senha, imagem_base64) VALUES (?, ?, ?, ?);`;
    await this.db.run(sql, [nome, email, senha, imagemBase64]);
  }

  // Inserir Viagem (precisa passar o ID da pessoa dona da viagem)
  async cadastrarViagem(local: string, dataIda: string, dataVolta: string, avaliacao: number, pessoaId: number): Promise<void> {
    const sql = `INSERT INTO viagens (local, data_ida, data_volta, avaliacao, pessoa_id) VALUES (?, ?, ?, ?, ?);`;
    await this.db.run(sql, [local, dataIda, dataVolta, avaliacao, pessoaId]);
  }

  // Inserir Gasto (precisa passar o ID da viagem onde o gasto foi feito)
  async cadastrarGasto(data: string, nomeGasto: string, descricao: string, viagemId: number): Promise<void> {
    const sql = `INSERT INTO gastos (data, nome_gasto, descricao, viagem_id) VALUES (?, ?, ?, ?);`;
    await this.db.run(sql, [data, nomeGasto, descricao, viagemId]);
  }

  // Inserir Local Visitado (precisa passar o ID da viagem)
  async cadastrarLocal(nome: string, descricao: string, nota: number, viagemId: number): Promise<void> {
    const sql = `INSERT INTO locais (nome, descricao, nota, viagem_id) VALUES (?, ?, ?, ?);`;
    await this.db.run(sql, [nome, descricao, nota, viagemId]);
  }

  // Listar todas as Viagens de uma Pessoa específica
  async listarViagensDaPessoa(pessoaId: number): Promise<any[]> {
    const sql = `SELECT * FROM viagens WHERE pessoa_id = ? ORDER BY data_ida DESC;`;
    const resultado = await this.db.query(sql, [pessoaId]);
    return resultado.values ? resultado.values : [];
  }

  // Listar todos os Gastos de uma Viagem específica
  async listarGastosDaViagem(viagemId: number): Promise<any[]> {
    const sql = `SELECT * FROM gastos WHERE viagem_id = ? ORDER BY data DESC;`;
    const resultado = await this.db.query(sql, [viagemId]);
    return resultado.values ? resultado.values : [];
  }

  // Listar todos os Locais de uma Viagem específica
  async listarLocaisDaViagem(viagemId: number): Promise<any[]> {
    const sql = `SELECT * FROM locais WHERE viagem_id = ?;`;
    const resultado = await this.db.query(sql, [viagemId]);
    return resultado.values ? resultado.values : [];
  }

  // 1. Editar dados da Pessoa (Nome, Email, Senha ou Foto)
  async editarPessoa(id: number, nome: string, email: string, senha: string, imagemBase64: string): Promise<void> {
    const sql = `
      UPDATE pessoas 
      SET nome = ?, email = ?, senha = ?, imagem_base64 = ? 
      WHERE id = ?;
    `;
    await this.db.run(sql, [nome, email, senha, imagemBase64, id]);
    console.log(`Pessoa com ID ${id} atualizada com sucesso!`);
  }

  // 2. Editar dados de uma Viagem
  async editarViagem(id: number, local: string, dataIda: string, dataVolta: string, avaliacao: number): Promise<void> {
    const sql = `
      UPDATE viagens 
      SET local = ?, data_ida = ?, data_volta = ?, avaliacao = ? 
      WHERE id = ?;
    `;
    await this.db.run(sql, [local, dataIda, dataVolta, avaliacao, id]);
    console.log(`Viagem com ID ${id} atualizada com sucesso!`);
  }

  // 3. Editar um Gasto específico
  async editarGasto(id: number, data: string, nomeGasto: string, descricao: string): Promise<void> {
    const sql = `
      UPDATE gastos 
      SET data = ?, nome_gasto = ?, descricao = ? 
      WHERE id = ?;
    `;
    await this.db.run(sql, [data, nomeGasto, descricao, id]);
    console.log(`Gasto com ID ${id} atualizado com sucesso!`);
  }

  // 4. Editar um Local visitado
  async editarLocal(id: number, nome: string, descricao: string, nota: number): Promise<void> {
    const sql = `
      UPDATE locais 
      SET nome = ?, descricao = ?, nota = ? 
      WHERE id = ?;
    `;
    await this.db.run(sql, [nome, descricao, nota, id]);
    console.log(`Local com ID ${id} atualizado com sucesso!`);
  }
}