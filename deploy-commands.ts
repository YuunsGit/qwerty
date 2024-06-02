import { REST, Routes } from "discord.js";
import { tcdd } from "./commands/tcdd";

const rest = new REST().setToken(process.env.DISCORD_TOKEN || "");

(async () => {
  try {
    console.log(`Started refreshing application (/) commands.`);

    const data = await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID || "",
        process.env.GUILD_ID || "",
      ),
      {
        body: [tcdd.data.toJSON()],
      },
    );

    console.log(
      `Successfully reloaded ${(data as any).length} application (/) commands.`,
    );
  } catch (error) {
    console.error(error);
  }
})();
