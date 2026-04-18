require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

// ================= COMMANDS =================
const commands = [
  new SlashCommandBuilder()
    .setName('postcontract')
    .setDescription('Post a custom flight contract')

    .addStringOption(option =>
      option.setName('type')
        .setDescription('Passenger / VIP / Charter / Emergency')
        .setRequired(true))

    .addStringOption(option =>
      option.setName('route')
        .setDescription('Example: MDPC → LCPH')
        .setRequired(true))

    .addStringOption(option =>
      option.setName('aircraft')
        .setDescription('Example: B777-300ER')
        .setRequired(true))

    .addStringOption(option =>
      option.setName('description')
        .setDescription('Flight description')
        .setRequired(true))

    .addIntegerOption(option =>
      option.setName('reward')
        .setDescription('Reward amount (no $)')
        .setRequired(true))

    .addRoleOption(option =>
      option.setName('pingrole')
        .setDescription('Role to ping (optional)')
        .setRequired(false))

    .addIntegerOption(option =>
      option.setName('allowedroles')
        .setDescription('Required level (display only)')
        .setRequired(false))

    .toJSON()
];

// ================= TOKEN =================
if (!process.env.TOKEN) {
  console.error("❌ TOKEN is missing in .env or Railway variables");
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// ================= IDS =================
const CLIENT_ID = '1492387132180926626';
const GUILD_ID = '1491959579385528500';

// ================= DEPLOY =================
(async () => {
  try {
    console.log('🚀 Registering slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('✅ Commands registered successfully!');
  } catch (error) {
    console.error('❌ Deploy error:', error);
  }
})();

