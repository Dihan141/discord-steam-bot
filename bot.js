require('dotenv').config()
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const path = require('path')
const fs = require('fs')
const mongoose = require('mongoose')
const express = require('express')
const app = express()

const PORT = process.env.PORT || 5000

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });


client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    // Register commands here or use a slash command manager
});

client.commands = new Collection()

const foldersPath = path.join(__dirname, 'commands')
const commandFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith('.js'))

for(const file of commandFiles){
    const filePath = path.join(foldersPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}
});

//Connect to mongoDB
mongoose.connect(process.env.MONGO_URI).then(() => {
	console.log('Connected to mongoDB')
}).catch((err) => {
	console.log('Mongo Error: ', err)
})

// Log in to Discord
client.login(process.env.TOKEN);

app.listen(PORT, () => {
    console.log(`listening on ${PORT}`)
})