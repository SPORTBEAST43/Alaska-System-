const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// STORE CONTRACTS
const claimedContracts = new Map();

// READY
client.once('ready', () => {
  console.log(`✈️ Logged in as ${client.user.tag}`);
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async (interaction) => {

  // ================= CREATE CONTRACT =================
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'postcontract') {

      const type = interaction.options.getString('type');
      const route = interaction.options.getString('route');
      const aircraft = interaction.options.getString('aircraft');
      const description = interaction.options.getString('description');
      const reward = interaction.options.getInteger('reward');
      const role = interaction.options.getRole('pingrole');

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

      const msg = await interaction.reply({
        content: role ? `<@&${role.id}>` : null,
        allowedMentions: role ? { roles: [role.id] } : {},
        embeds: [embed],
        components: [row],
        fetchReply: true
      });

      // SAVE CONTRACT
      claimedContracts.set(contractId, {
        user: null,
        messageId: msg.id,
        channelId: msg.channel.id,
        type,
        route,
        aircraft,
        description,
        reward,
        roleId: role ? role.id : null
      });
    }
  }

  // ================= CLAIM BUTTON =================
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('claim_')) {

      const contractId = interaction.customId.split('_')[1];
      const contract = claimedContracts.get(contractId);

      if (!contract) {
        return interaction.reply({
          content: "❌ This contract no longer exists.",
          ephemeral: true
        });
      }

      // already claimed
      if (contract.user) {
        return interaction.reply({
          content: "❌ This contract has already been claimed.",
          ephemeral: true
        });
      }

      // lock contract
      contract.user = interaction.user.id;

      const channel = await client.channels.fetch(contract.channelId);
      const message = await channel.messages.fetch(contract.messageId);

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
        content: `✅ You claimed this contract!`,
        ephemeral: true
      });
    }
  }
});

// LOGIN
client.login("MTQ5MjM4NzEzMjE4MDkyNjYyNg.GZCfsf.RL68aWfHg5JH5Cq7DDl9WgZAz-EfEou1cneFDE");

