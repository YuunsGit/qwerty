import {
  CommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import puppeteer from "puppeteer";

export const tcdd = {
  data: new SlashCommandBuilder()
    .setName("tcdd")
    .setDescription("Tren gelir hoş gelir")
    .addStringOption((option) =>
      option
        .setName("nereden")
        .setDescription("Nereden biniyorsun?")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("nereye")
        .setDescription("Nereye gidiyorsun?")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("tarih")
        .setDescription("Hangi tarihte gidiyorsun?")
        .setRequired(true),
    ),
  async execute(interaction: CommandInteraction) {
    await interaction.reply("t-tamam! senin için bakıyorum ^-^");
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();

      await page.setUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36",
      );
      await page.goto(
        "https://ebilet.tcddtasimacilik.gov.tr/view/eybis/tnmGenel/tcddWebContent.jsf",
      );
      await page.setViewport({ width: 1280, height: 1024 });

      await page.type(
        "#nereden",
        (interaction.options as any).getString("nereden"),
      );
      await page.waitForSelector("xpath=//html/body/ul[1]", {
        visible: true,
      });
      const firstResWhere = await page.$eval(
        "xpath=//html/body/ul[1]/li[1]/a",
        (element: any) => element.textContent,
      );
      await page.click("#nereden", { count: 3 });
      await page.type("#nereden", firstResWhere);

      await page.type(
        "#nereye",
        (interaction.options as any).getString("nereye"),
      );
      await page.waitForSelector("xpath=//html/body/ul[2]", {
        visible: true,
      });
      const firstResTo = await page.$eval(
        "xpath=//html/body/ul[2]/li[1]/a",
        (element: any) => element.textContent,
      );
      await page.click("#nereye", { count: 3 });
      await page.type("#nereye", firstResTo);

      await page.click("#trCalGid_input", { count: 3 });
      await page.type(
        "#trCalGid_input",
        (interaction.options as any).getString("tarih"),
      );
      await page.click(".ui-datepicker-close");

      await Promise.all([
        await page.$eval("#btnSeferSorgula", (element: any) => element.click()),
        await page.waitForNavigation(),
      ]);

      const table = await page.waitForSelector(
        "xpath=//html/body/div[3]/div[2]/div/div/div/div/form/div[1]/div/div[1]/div/div/div/div[1]/div/div/div/table/tbody",
        { timeout: 5000 },
      );
      const rows = await table?.$$("tr");
      const serviceCount = rows?.length || 0;

      const services = [];
      for (let i = 0; i < serviceCount; i++) {
        const row = await page.waitForSelector(
          `xpath=//html/body/div[3]/div[2]/div/div/div/div/form/div[1]/div/div[1]/div/div/div/div[1]/div/div/div/table/tbody/tr[${i + 1}]/td[7]`,
        );
        const isDisabled = await page.$eval(
          "input",
          (button) => button.disabled,
        );
        if (isDisabled) continue;

        const startSelector = await page.waitForSelector(
          `xpath=//html/body/div[3]/div[2]/div/div/div/div/form/div[1]/div/div[1]/div/div/div/div[1]/div/div/div/table/tbody/tr[${i + 1}]/td[1]/span`,
        );
        const start = await startSelector?.evaluate((el) => el.textContent);

        const endSelector = await page.waitForSelector(
          `xpath=//html/body/div[3]/div[2]/div/div/div/div/form/div[1]/div/div[1]/div/div/div/div[1]/div/div/div/table/tbody/tr[${i + 1}]/td[3]/span`,
        );
        const end = await endSelector?.evaluate((el) => el.textContent);

        const timeSelector = await page.waitForSelector(
          `xpath=//html/body/div[3]/div[2]/div/div/div/div/form/div[1]/div/div[1]/div/div/div/div[1]/div/div/div/table/tbody/tr[${i + 1}]/td[2]/label[2]`,
        );
        const time = await timeSelector?.evaluate((el) => el.textContent);

        const seatsSelector = await page.waitForSelector(
          `xpath=//html/body/div[3]/div[2]/div/div/div/div/form/div[1]/div/div[1]/div/div/div/div[1]/div/div/div/table/tbody/tr[${i + 1}]/td[5]/div/label`,
        );
        const seats = await seatsSelector?.evaluate((el) => el.textContent);

        if (seats?.includes("Engelli")) continue;

        const priceSelector = await page.waitForSelector(
          `xpath=//html/body/div[3]/div[2]/div/div/div/div/form/div[1]/div/div[1]/div/div/div/div[1]/div/div/div/table/tbody/tr[${i + 1}]/td[6]/label`,
        );
        const price = await priceSelector?.evaluate((el) => el.textContent);

        services.push({
          start,
          end,
          time: time?.replace(":", " "),
          seats: (seats?.match(/\(([^()]+)\)\s*$/)?.[1] || "").trim(),
          price: price?.replace(" ", ""),
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x0a68786)
        .setTitle(`${firstResWhere} - ${firstResTo} arası seferler`)
        .setDescription(
          services.length
            ? `senin için ${(interaction.options as any).getString("tarih") || "söylediğin"} tarihinde tam ${services.length} sefer buldum! UwU`
            : "hiç sefer bulamadım T-T",
        )
        .setThumbnail(
          "https://ebilet.tcddtasimacilik.gov.tr/image/mandalina/tcddPopup.png",
        )
        .addFields(
          services.map((service) => ({
            name: `${service.start} - ${service.end}`,
            value: `🕐 ${service.time} - 💺 ${service.seats} - 💰 ${service.price}`,
          })),
        )
        .setTimestamp()
        .setFooter({
          text: "bunları TCDD'nin sitesinden çektim UwU",
        });

      await interaction.editReply({ content: "", embeds: [embed] });

      await page.deleteCookie();
      await browser.close();
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "bu kriterlere uygun sefer yok T-T",
      });
    }
  },
};
