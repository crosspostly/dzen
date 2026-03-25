import { execSync } from 'child_process';
import * as path from 'path';

/**
 * 🔐 GitSyncService
 * 
 * Дублирует логику сохранения в GitHub из production workflow
 * Обеспечивает надежный commit и push с автоматическими ретраями и ребейзом.
 */
export class GitSyncService {
  private maxRetries: number = 3;
  private retryDelay: number = 2000;

  /**
   * 📤 Синхронизация локальных изменений с GitHub
   * @param message Сообщение коммита
   * @param paths Массив путей для добавления (default: articles/ public/)
   */
  async sync(message: string, paths: string[] = ['articles/', 'public/']): Promise<boolean> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔐 GIT SYNC: Начало синхронизации с GitHub`);
    console.log(`${'='.repeat(60)}`);

    try {
      // 1. Настройка пользователя (если не настроен)
      this.ensureGitConfig();

      // 🔍 DEBUG: Проверим, что видит Git
      console.log(`\n🔍 Git Status (Before Add):`);
      try {
        const status = execSync('git status --short', { encoding: 'utf8' });
        console.log(status || '   (Пусто)');
      } catch (e) {}

      // 2. Сначала ДОБАВЛЯЕМ и КОММИТИМ локально (это делает ребейз проще)
      console.log(`\n📝 Adding files: ${paths.join(', ')}...`);
      for (const p of paths) {
        try {
          // 🔥 FORCE ADD: Игнорируем .gitignore для гарантии сохранения статей
          execSync(`git add --force ${p}`, { stdio: 'inherit' });
        } catch (e) {
          console.log(`   ⚠️  Could not add ${p}: ${(e as Error).message}`);
        }
      }

      // Проверка изменений в индексе
      try {
        execSync('git diff --cached --quiet');
        console.log('   ⚠️  Нет новых изменений в индексе после git add');
        
        // Попробуем еще раз через статус
        const status = execSync('git status --short', { encoding: 'utf8' });
        if (!status.includes('A  ') && !status.includes('M  ')) {
          console.log('   🛑 Изменения действительно отсутствуют. Пропускаем пуш.');
          return true;
        }
      } catch (e) {
        // Есть изменения для коммита
      }

      console.log(`   💾 Committing: "${message}"`);
      execSync(`git commit -m "${message}"`, { stdio: 'inherit' });

      // 3. Теперь цикл Pull --rebase + Push
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          console.log(`\n🔄 Попытка отправки ${attempt}/${this.maxRetries}...`);
          
          console.log(`   📡 Pulling with rebase from origin main...`);
          execSync('git pull --rebase origin main', { stdio: 'inherit' });

          console.log(`   🚀 Pushing to origin main...`);
          execSync('git push origin main', { stdio: 'inherit' });

          console.log(`\n✅ СИНХРОНИЗАЦИЯ УСПЕШНА!`);
          return true;

        } catch (error) {
          console.error(`   ❌ Ошибка на попытке ${attempt}:`, (error as Error).message);
          
          // Если ребейз зафейлился, нужно его прервать
          try {
            const status = execSync('git status', { encoding: 'utf8' });
            if (status.includes('rebase in progress')) {
              console.log(`   ⚠️  Rebase in progress, aborting...`);
              execSync('git rebase --abort', { stdio: 'pipe' });
            }
          } catch (e) {}

          if (attempt === this.maxRetries) {
            console.error(`\n💥 Все попытки пуша исчерпаны.`);
            return false;
          }

          console.log(`   ⏳ Ожидание ${this.retryDelay}ms перед следующей попыткой...`);
          await new Promise(r => setTimeout(r, this.retryDelay));
        }
      }
    } catch (globalError) {
      console.error(`\n❌ Критическая ошибка GitSyncService:`, (globalError as Error).message);
      return false;
    }

    return false;
  }

  /**
   * Проверка и установка базовых настроек git
   */
  private ensureGitConfig(): void {
    try {
      execSync('git config --get user.email', { stdio: 'pipe' });
    } catch (e) {
      console.log(`   🔧 Настройка локального пользователя Git...`);
      execSync('git config --local user.email "github-actions[bot]@users.noreply.github.com"');
      execSync('git config --local user.name "github-actions[bot]"');
    }
  }
}
