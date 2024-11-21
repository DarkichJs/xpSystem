const { Collection, joinVoiceChannel, ChannelType } = require('discord.js');
const mongoose = require('mongoose');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const os = require("os");
const chalk = require("chalk");
const osu = require('node-os-utils');
const fetch = require('node-fetch');
const User = require('../../Schema/user.js'); 

module.exports = async (client, message) => {
    if (message.author.bot) return; 

    let user = await User.findOne({ userID: message.author.id });

    if (!user) {
        user = new User({
            userID: message.author.id,
            messages: 1,
            status: false
        });
    } else {
        user.messages += 1;
    }

    try {
        await user.save();
    } catch (error) {
        console.error(chalk.red('Error:'), error);
    }
};
