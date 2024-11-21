const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  InteractionType,
} = require("discord.js");
const path = require("path");
const fs = require("fs");

module.exports = async (client, interaction) => {
  const mongoose = require("mongoose");
  const ms = require("ms");

  const loadHandlers = (directory) => {
    const handlers = {};
    const files = fs.readdirSync(directory, { withFileTypes: true });

    files.forEach((file) => {
      const fullPath = path.join(directory, file.name);
      if (file.isDirectory()) {
        const nestedHandlers = loadHandlers(fullPath);
        for (const key in nestedHandlers) {
          handlers[key] = nestedHandlers[key];
        }
      } else if (file.name.endsWith('.js')) {
        const handler = require(fullPath);
        handlers[path.parse(file.name).name] = handler;
      }
    });

    return handlers;
  };

  const buttonHandlers = loadHandlers(path.join(__dirname, "../../Handlers/Buttons"));
  const modalHandlers = loadHandlers(path.join(__dirname, "../../Handlers/Modals"));

  if (interaction.isButton()) {
    const handler = buttonHandlers[interaction.customId];
    if (handler) {
      handler(client, interaction);
    }
  }

  if (interaction.isModalSubmit()) {
    const handler = modalHandlers[interaction.customId];
    if (handler) {
      handler(client, interaction);
    }
  }

  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    let err = 0;

    if (command.requiredPerms) {
      command.requiredPerms.forEach(async (perm) => {
        if (!interaction.member.permissions.has(perm)) {
          err = 1;
          interaction.reply({
            content: `You need the following permission to run this: ${"`" + perm + "`"}`,
            ephemeral: true,
          });
        }
      });
    }

    if (command.botRequiredPerms) {
      command.botRequiredPerms.forEach(async (perm) => {
        if (!interaction.guild.me.permissions.has(perm)) {
          err = 1;
          interaction.reply({
            content: `I need the following permission to run this: ${"`" + perm + "`"}`,
            ephemeral: true,
          });
        }
      });
    }
    if (err) return;

    await command.execute(interaction);
  }
};
