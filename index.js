const fs = require("fs");
const { readdirSync } = require("fs");
let config = require("./config.json");
const mongoose = require("mongoose");
let mongoUrl = config.mongo;
let token = config.token;

const {
  Client,
  GatewayIntentBits,
  Collection,
  ChannelType,
} = require("discord.js");
let commands = [];
ascii = require("ascii-table");
const chalk = require("chalk");
let table_event = new ascii("Events");
table_event.setHeading("Name", "Load status");
let table_commands = new ascii("Commands");
table_commands.setHeading("Name", "Load status");
console.clear();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
});
mongoose.connect(mongoUrl);
mongoose.connection.on("connected", () => {
  console.log(
    chalk.green("・ Database:", chalk.red("Successfully connected to MongoDB"))
  );
});
client.commands = new Collection();
readdirSync("./Commands").forEach((folder) => {
  readdirSync(`./Commands/${folder}`).forEach((file) => {
    const command = require(`./Commands/${folder}/${file}`);
    if (!config.xpsystem) {
      // Skip registration of commands rank, profile, givexp
      if (["rank","profile","givexp"].includes(command.data.name)) return;
    }
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
    table_commands.addRow(file, "✅");
  });
});
module.exports = commands;

readdirSync("./Events").forEach((folder) => {
  readdirSync(`./Events/${folder}`).forEach((file) => {
    const event = require(`./Events/${folder}/${file}`);
    client.on(file.split(".")[0], event.bind(null, client));
    table_event.addRow(file, "✅");
  });
});
console.log(table_event.toString());
console.log(table_commands.toString());


client.login(token);
