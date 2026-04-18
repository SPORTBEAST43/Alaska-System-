require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const fs = require('fs');

// ================= SAFETY HANDLERS =================
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

// ================= TOKEN CHECK =================
if (!process.env.TOKEN) {
  console.error("❌ TOKEN is missing! Check Railway variables or .env");
  process.exit(1);
}

console.log("🔑 TOKEN LOADED:", process.env.TOKEN.slice(0, 10) + "...");

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ================= DATABASE =================
const DB_FILE = './contracts.json';

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return {};
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    console.error("❌ Failed to load DB:", err);
    return {};
  }
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Failed to save DB:", err);
  }
}

let claimedContracts = loadDB();

// ================= READY =================
client.once('clientReady', () => {
  console.log(`✈️ Logged in as ${client.user.tag}`);
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async (interaction) => {
  try {

    // ================= CREATE CONTRACT =================
    if (interaction.isChatInputCommand() && interaction.commandName === 'postcontract') {

      await interaction.deferReply(); // 🔥 prevents timeout crash

      const type = interaction.options.getString('type');
      const route = interaction.options.getString('route');
      const aircraft = interaction.options.getString('aircraft');
      const description = interaction.options.getString('description');
      const reward = interaction.options.getInteger('reward');
      const role = interaction.options.getRole('pingrole');

      if (!type || !route || !aircraft || !description || reward === null) {
        return interaction.editReply({
          content: "❌ Missing required fields."
        });
      }

      const contractId = Date.now().toString();

      const button = new ButtonBuilder()
        .setCustomId(`claim_${contractId}`)
        .setLabel('Claim Contract')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);

      const embed = new EmbedBuilder()
        .setTitle("📄 NEW FLIGHT CONTRACT")
        .setColor(0x1e90ff)
        .setDescription(
          `:baggage_claim: **Type:** ${type}\n` +
          `:map: **Route:** ${route.replace(/->|→/g, ' ➜ ')}\n` +
          `:airplane: **Aircraft:** ${aircraft}\n` +
          `:moneybag: **Reward:** ${reward}\n\n` +
          `${description}\n\n` +
          `:bar_chart: **Status:** Available\n` +
          `📌 **Contract ID:** ${contractId}`
        );

      const msg = await interaction.editReply({
        content: role ? `<@&${role.id}>` : undefined,
        allowedMentions: role ? { roles: [role.id] } : {},
        embeds: [embed],
        components: [row]
      });

      claimedContracts[contractId] = {
        user: null,
        messageId: msg.id,
        channelId: msg.channel.id,
        type,
        route,
        aircraft,
        description,
        reward,
        roleId: role ? role.id : null
      };

      saveDB(claimedContracts);
    }

    // ================= CLAIM BUTTON =================
    if (interaction.isButton() && interaction.customId.startsWith('claim_')) {

      const contractId = interaction.customId.split('_')[1];
      const contract = claimedContracts[contractId];

      if (!contract) {
        return interaction.reply({
          content: "❌ This contract no longer exists.",
          ephemeral: true
        });
      }

      if (contract.user) {
        return interaction.reply({
          content: "❌ This contract has already been claimed.",
          ephemeral: true
        });
      }

      // mark claimed
      contract.user = interaction.user.id;
      saveDB(claimedContracts);

      const channel = await client.channels.fetch(contract.channelId);

      let message;
      try {
        message = await channel.messages.fetch(contract.messageId);
      } catch {
        return interaction.reply({
          content: "❌ Contract message no longer exists.",
          ephemeral: true
        });
      }

      const updatedEmbed = new EmbedBuilder()
        .setTitle("📄 NEW FLIGHT CONTRACT")
        .setColor(0xff0000)
        .setDescription(
          `:baggage_claim: **Type:** ${contract.type}\n` +
          `:map: **Route:** ${contract.route.replace(/->|→/g, ' ➜ ')}\n` +
          `:airplane: **Aircraft:** ${contract.aircraft}\n` +
          `:moneybag: **Reward:** ${contract.reward}\n\n` +
          `${contract.description}\n\n` +
          `:bar_chart: **Status:** Claimed :white_check_mark:\n` +
          `:man_pilot: **Claimed by:** <@${interaction.user.id}>\n` +
          `📌 **Contract ID:** ${contractId}`
        );

      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`claimed_${contractId}`)
          .setLabel('Claimed')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      await message.edit({
        embeds: [updatedEmbed],
        components: [disabledRow]
      });

      await interaction.reply({
        content: "✅ You claimed this contract!",
        ephemeral: true
      });
    }

  } catch (err) {
    console.error("❌ Interaction Error:", err);

    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({
        content: "❌ Something went wrong.",
        ephemeral: true
      });
    }
  }
});

// ================= LOGIN =================
client.login(process.env.TOKEN);
