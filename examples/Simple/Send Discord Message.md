# 💬 Send Discord Message
```canvasblocksettings
{
	"type": "simple",
	"allowedVariables": ["discord_token"]
}
```

```pycanvasblock
data = None
dataType = None
fileName = None
  
import asyncio
import os
import io
  
match parameter_data["type"]:
	case "file":
		name, ext = os.path.splitext(parameter_data["file"])
		fileName = os.path.basename(name) + ext

		if ext in [".txt", ".md", ".json"]:
			with open(get_parameter_file_path(), "r", encoding="utf-8") as file:
				data = file.read()

			dataType = "text"
		else:
			data = get_parameter_file("rb")
			dataType = "file"

	case "link":
		data = parameter_data["url"]
		dataType = "text"

	case "text":
		data = parameter_data["text"]
		dataType = "text"
  
if fileName == None:
	fileName = "message.txt"
  
if dataType == "text" and len(data) > 2000:
	data = io.StringIO(data)
	dataType = "file"
  
install_dependency("py-cord", "discord")
import discord
  
# Get the bot's token
TOKEN = injected_variables["discord_token"]

if len(arrow_parameters) == 0:
	notice("No channel ID provided")
	exit()

CHANNEL_ID = int(arrow_parameters[0]["text"])
  
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
		# Send a message to the user
		match dataType:
			case "text":
				await channel.send(data)
			case "file":
				file = discord.File(data, fileName)
				await channel.send(file=file)

		# Close the bot after sending the message
	else:
		notice("Channel not found")
		
	await bot.close()


async def main():
    async with bot:
        await bot.start(TOKEN)

# Run the bot
loop = asyncio.get_event_loop()
loop.run_until_complete(main())
```
