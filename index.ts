import { Client, Events, GatewayIntentBits } from "discord.js";
import OpenAI from "openai";

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
  if (message.mentions.members?.first()?.id !== "857355170316943430") return;

  const messageContent = message.cleanContent.replace("@Qwerty", "").trim();
  if (messageContent.length > 80 && !thinking) return;

  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    threadId = undefined;
  }, 300_000);

  message.channel.sendTyping().then(() => (thinking = true));
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
});

client.login(process.env.DISCORD_TOKEN);
