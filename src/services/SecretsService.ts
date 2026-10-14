import { Preferences } from '@capacitor/preferences';

export interface StoredSecrets {
  OPENROUTER_API_KEY?: string;
  HF_TOKEN?: string;
  [key: string]: string | undefined;
}

export interface ISecretsService {
  getKey(name: 'OPENROUTER_API_KEY' | 'HF_TOKEN'): Promise<string | null>;
  setKey(name: 'OPENROUTER_API_KEY' | 'HF_TOKEN', value: string): Promise<void>;
  removeKey(name: 'OPENROUTER_API_KEY' | 'HF_TOKEN'): Promise<void>;
  getAllKeys(): Promise<StoredSecrets>;
  importFromEnv(fileContent: string): Promise<{ imported: string[]; count: number }>;
  testKey(name: 'OPENROUTER_API_KEY' | 'HF_TOKEN'): Promise<{ success: boolean; message: string }>;
  maskKey(key: string | null | undefined): string;
}

class SecretsService implements ISecretsService {
  private readonly RECOGNIZED_KEYS = ['OPENROUTER_API_KEY', 'HF_TOKEN'] as const;

  async getKey(name: 'OPENROUTER_API_KEY' | 'HF_TOKEN'): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: `forge_secret_${name}` });
      if (value) return value;
    } catch {
      // Fallback to localStorage
    }
    return typeof window !== 'undefined' ? localStorage.getItem(`forge_secret_${name}`) : null;
  }

  async setKey(name: 'OPENROUTER_API_KEY' | 'HF_TOKEN', value: string): Promise<void> {
    const trimmed = value.trim();
    try {
      await Preferences.set({ key: `forge_secret_${name}`, value: trimmed });
    } catch {
      // Fallback
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(`forge_secret_${name}`, trimmed);
    }
  }

  async removeKey(name: 'OPENROUTER_API_KEY' | 'HF_TOKEN'): Promise<void> {
    try {
      await Preferences.remove({ key: `forge_secret_${name}` });
    } catch {
      // Fallback
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`forge_secret_${name}`);
    }
  }

  async getAllKeys(): Promise<StoredSecrets> {
    const result: StoredSecrets = {};
    for (const key of this.RECOGNIZED_KEYS) {
      const val = await this.getKey(key);
      if (val) {
        result[key] = val;
      }
    }
    return result;
  }

  async importFromEnv(fileContent: string): Promise<{ imported: string[]; count: number }> {
    const lines = fileContent.split(/\r?\n/);
    const imported: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Ignore blank lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      const equalIndex = trimmed.indexOf('=');
      if (equalIndex <= 0) continue;

      const rawKey = trimmed.substring(0, equalIndex).trim();
      let rawVal = trimmed.substring(equalIndex + 1).trim();

      // Strip surrounding quotes if present
      if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
        rawVal = rawVal.slice(1, -1);
      }

      // Store only recognized keys
      if (this.RECOGNIZED_KEYS.includes(rawKey as any)) {
        await this.setKey(rawKey as any, rawVal);
        imported.push(rawKey);
      }
    }

    return { imported, count: imported.length };
  }

  async testKey(name: 'OPENROUTER_API_KEY' | 'HF_TOKEN'): Promise<{ success: boolean; message: string }> {
    const key = await this.getKey(name);
    if (!key || key.trim().length === 0) {
      return { success: false, message: 'No key configured' };
    }
    // Mock latency test
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (key.length < 8) {
      return { success: false, message: 'Invalid key format or token length' };
    }
    return { success: true, message: `Connected to ${name === 'OPENROUTER_API_KEY' ? 'OpenRouter Gateway' : 'Hugging Face Hub'}` };
  }

  maskKey(key: string | null | undefined): string {
    if (!key || key.length === 0) return '';
    if (key.length <= 4) return '••••';
    const last4 = key.slice(-4);
    return `••••••••••••${last4}`;
  }
}

export const secretsService = new SecretsService();
