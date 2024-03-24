import Dexie, { type Table } from "dexie";

export type File = {
  id?: number;
  name: string;
  content: string;
};

class AppDB extends Dexie {
  files!: Table<File, number>;

  constructor() {
    super("AppDB");
    this.version(1).stores({
      files: "++id, name, content",
    });
  }

  async createFile() {
    const id = await this.files.add({ name: "Untitled", content: "# New File" });
    return id;
  }

  async updateFileContent(id: number, content: string) {
    await this.files.update(id, { content });
  }

  async getFirstFile() {
    return await this.files.toCollection().first();
  }

  async getFile(id: number) {
    return await this.files.get(id);
  }

  async getAllFiles() {
    return await this.files.toArray();
  }

  async deleteFile(id: number) {
    await this.files.delete(id);
  }

  async updateFileName(id: number, name: string) {
    await this.files.update(id, { name });
  }
}

export const db = new AppDB();
