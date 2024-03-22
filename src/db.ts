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
    const id = await this.files.add({ name: "Untitled", content: "# Untitled" });
    return id;
  }

  async updateFileContent(id: number, content: string) {
    await this.files.update(id, { content });
  }

  async getFirstFile() {
    return await this.files.get(1);
  }
}

export const db = new AppDB();
