import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import OpenAI from "openai";
import { tcdd } from "./commands/tcdd.ts";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

let threadId: string | undefined;
let thinking = false;
let timeout: Timer | undefined;

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.mentions.members?.first()?.id !== "857355170316943430") return;

    const messageContent = message.cleanContent.replace("@Qwerty", "").trim();
    if (messageContent.length > 140 || thinking) return;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      threadId = undefined;
    }, 300_000);

    message.channel.sendTyping();
    thinking = true;

    if (!threadId) threadId = (await openai.beta.threads.create({})).id;
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: messageContent.length > 0 ? messageContent : "Hey",
    });

    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id:
        process.env.ASSISTANT_ID ??
        (() => {
          throw new Error("ASSISTANT_ID is not set");
        })(),
    });

    if (run.status !== "completed") return;

    const messages = await openai.beta.threads.messages.list(run.thread_id);
    const answer = (
      messages.data[0].content[0] as OpenAI.Beta.Threads.TextContentBlock
    ).text.value;
    message.reply(answer).then(() => (thinking = false));
  } catch (error) {
    console.error(error);
  }
});

(client as any).commands = new Collection();
(client as any).commands.set(tcdd.data.name, tcdd);

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = (interaction.client as any).commands.get(
    interaction.commandName,
  );

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "olamaz! bir hata oluştu T-T",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "olamaz! bir hata oluştu T-T",
        ephemeral: true,
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

Bun.serve({
  port: 8000,
  fetch(_request) {
    return new Response("Hello");
  },
});
