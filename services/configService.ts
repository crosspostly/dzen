/**
 * Config Service - Управление конфигурациями проектов
 * На каждый канал - своя config.json
 */

import fs from 'fs';
import path from 'path';

export interface AudienceProfile {
  age_range: string;              // '50-65'
  primary_emotions: string[];     // ['justice', 'family', 'anger']
  values: string[];               // ['добро побеждает зло']
  forbidden_topics: string[];     // ['политика', 'war']
}

export interface ContentRules {
  min_chars: number;              // 10000
  max_chars: number;              // 15000
  required_triggers: string[];    // ['квартира', 'деньги']
  avoid_phrases: string[];        // ['как иванов', 'GPT']
  tone: 'confession' | 'drama' | 'success' | 'revenge';
}

export interface PublishingConfig {
  enabled: boolean;
  schedule: string;               // cron format
  max_per_day: number;
  draft_mode: boolean;
  auto_publish: boolean;
}

export interface ProjectConfig {
  channel_id: string;
  channel_name: string;
  channel_url: string;
  
  audience: AudienceProfile;
  content_rules: ContentRules;
  publishing: PublishingConfig;
  
  examples_count: number;         // сколько примеров вшивать в промпт
  gemini_model?: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  temperature?: number;
}

export class ConfigService {
  private projectsPath = process.env.PROJECTS_PATH || './projects';

  /**
   * Лоадит конфиг проекта
   */
  loadConfig(projectId: string): ProjectConfig {
    const configPath = path.join(this.projectsPath, projectId, 'config.json');
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Конфиг не найден: ${configPath}`);
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content) as ProjectConfig;
      
      // Валидация
      this.validateConfig(config);
      
      return config;
    } catch (error) {
      throw new Error(`Ошибка при чтении конфига: ${error}`);
    }
  }

  /**
   * Валидирует конфигурацию
   */
  validateConfig(config: Partial<ProjectConfig>): boolean {
    const required = [
      'channel_id', 'channel_name', 'channel_url',
      'audience', 'content_rules', 'publishing',
    ];

    for (const field of required) {
      if (!config[field as keyof ProjectConfig]) {
        throw new Error(`Обязательное поле не заполнено: ${field}`);
      }
    }

    // Валидация content_rules
    const content = config.content_rules as ContentRules;
    if (!content.min_chars || !content.max_chars) {
      throw new Error('Обязательные поля min_chars/max_chars');
    }
    if (content.min_chars >= content.max_chars) {
      throw new Error('min_chars должен быть меньше max_chars');
    }

    return true;
  }

  /**
   * Листит все проекты
   */
  listProjects(): string[] {
    if (!fs.existsSync(this.projectsPath)) {
      return [];
    }

    return fs.readdirSync(this.projectsPath)
      .filter(dir => {
        const fullPath = path.join(this.projectsPath, dir);
        const stat = fs.statSync(fullPath);
        return stat.isDirectory() && fs.existsSync(path.join(fullPath, 'config.json'));
      });
  }

  /**
   * Получает путь к директории проекта
   */
  getProjectPath(projectId: string): string {
    return path.join(this.projectsPath, projectId);
  }

  /**
   * Получает путь к выходному тексту
   */
  getGeneratedPath(projectId: string): string {
    return path.join(this.getProjectPath(projectId), 'generated');
  }

  /**
   * Получает путь к примерам
   */
  getExamplesPath(projectId: string): string {
    return path.join(this.getProjectPath(projectId), 'examples');
  }

  /**
   * Основная конфиг темплейт (для копирования)
   */
  getDefaultConfig(): ProjectConfig {
    return {
      channel_id: 'channel-1',
      channel_name: 'Название канала',
      channel_url: 'https://zen.yandex.ru/...',
      
      audience: {
        age_range: '50-65',
        primary_emotions: ['justice', 'family', 'indignation'],
        values: [
          'добро побеждает зло',
          'сраведливость',
          'семейные ценности',
        ],
        forbidden_topics: ['politics', 'war', 'explicit'],
      },
      
      content_rules: {
        min_chars: 10000,
        max_chars: 15000,
        required_triggers: [
          'квартира',
          'деньги',
          'семья',
          'наследство',
        ],
        avoid_phrases: [
          'как известно',
          'GPT',
          'ChatGPT',
          'нейросеть',
        ],
        tone: 'confession',
      },
      
      publishing: {
        enabled: true,
        schedule: '0 10 * * 1,3,5',  // Пн, Оср, Пт в 10:00
        max_per_day: 1,
        draft_mode: true,
        auto_publish: false,
      },
      
      examples_count: 3,
      gemini_model: 'gemini-2.5-pro',
      temperature: 0.95,
    };
  }

  /**
   * Сохраняет конфигурацию
   */
  saveConfig(projectId: string, config: ProjectConfig): void {
    const projectPath = this.getProjectPath(projectId);
    const configPath = path.join(projectPath, 'config.json');

    // Создаем директориюю, если не существует
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}

export const configService = new ConfigService();
