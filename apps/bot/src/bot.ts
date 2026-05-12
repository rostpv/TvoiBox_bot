import { Bot } from "grammy";

export function createBot(token: string) {
  const bot = new Bot(token);

  bot.command("start", async (context) => {
    await context.reply(
      "Каркас бота готов. Полноценные сценарии будут подключаться по этапам разработки.",
    );
  });

  return bot;
}
