const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Whitelist = require('../../Schema/whitelist.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Manage whitelist')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to whitelist')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to whitelist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from whitelist')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove from whitelist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all whitelisted users')),

    async execute(interaction) {
        if (!config.adminIds.includes(interaction.user.id) && interaction.user.id !== '479889258623139851') {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add': {
                const user = interaction.options.getUser('user');
                const existing = await Whitelist.findOne({ userID: user.id });

                if (existing) {
                    return interaction.reply({ content: 'User is already whitelisted!', ephemeral: true });
                }

                const whitelist = new Whitelist({
                    userID: user.id,
                    addedBy: interaction.user.id,
                    addedAt: new Date()
                });

                await whitelist.save();
                
                const embed = new EmbedBuilder()
                    .setColor('#303136')
                    .setDescription(`✅ Added ${user} to whitelist`);
                
                return interaction.reply({ embeds: [embed] });
            }

            case 'remove': {
                const user = interaction.options.getUser('user');
                const removed = await Whitelist.findOneAndDelete({ userID: user.id });

                if (!removed) {
                    return interaction.reply({ content: 'User is not whitelisted!', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor('#303136')
                    .setDescription(`❌ Removed ${user} from whitelist`);

                return interaction.reply({ embeds: [embed] });
            }

            case 'list': {
                const whitelisted = await Whitelist.find();
                
                const embed = new EmbedBuilder()
                    .setColor('#303136')
                    .setTitle('Whitelisted Users')
                    .setDescription(whitelisted.length > 0 
                        ? whitelisted.map(w => `<@${w.userID}>`).join('\n')
                        : 'No users whitelisted');

                return interaction.reply({ embeds: [embed] });
            }
        }
    }
};