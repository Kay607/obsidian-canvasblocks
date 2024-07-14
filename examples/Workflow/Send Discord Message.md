# 💬 Send Discord Message
```canvasblocksettings
{
	"type": "workflow",
	"ioConnections": {
		"Data": {
			"direction": "input",
			"type": "file"
		},
		"Channel ID": {
			"direction": "input",
			"type": "integer"
		}
	},
	"allowedVariables": ["discord_token"]
}
```

```pycanvasblock
data = None
data_type = None
file_name = None
  
import asyncio
import os
import io
  
parameter_data = in_data["Data"]

match parameter_data["type"]:
	case "file":
		name, ext = os.path.splitext(parameter_data["file"])
		file_name = os.path.basename(name) + ext

		file_path = os.path.join(vault_path, parameter_data["file"])
		if ext in [".txt", ".md", ".json"]:
			with open(file_path, "r", encoding="utf-8") as file:
				data = file.read()

			data_type = "text"
		else:
			data = io.FileIO(file_path, "r")
			data_type = "file"

	case "link":
		data = parameter_data["url"]
		data_type = "text"

	case "text":
		data = parameter_data["text"]
		data_type = "text"
  
if file_name == None:
	file_name = "message.txt"
  
if data_type == "text" and len(data) > 2000:
	data = io.StringIO(data)
	data_type = "file"
  
install_dependency("py-cord", "discord")
import discord
  
# Get the bot's token
TOKEN = injected_variables["discord_token"]

CHANNEL_ID = in_data["Channel ID"]
  
# Define intents
intents = discord.Intents.all()
  
# Create a bot instance with intents
bot = discord.Client(intents=intents)
  
# Event to execute when the bot is ready
@bot.event
async def on_ready():
	# Fetch the user
	channel = bot.get_channel(CHANNEL_ID)

	if not channel:
		channel = bot.get_user(CHANNEL_ID)
  
	if channel:
		# Send a message to the channel
		match data_type:
			case "text":
				await channel.send(data)
			case "file":
				file = discord.File(data, file_name)
				await channel.send(file=file)

	else:
		notice("Channel not found")
		
	# Close the bot after sending the message
	await bot.close()

async def main():
    async with bot:
        await bot.start(TOKEN)

# Run the bot
loop = asyncio.get_event_loop()
loop.run_until_complete(main())
```
