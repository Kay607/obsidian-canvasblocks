import CanvasBlocksPlugin from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";

export class CanvasBlocksPluginSettingTab extends PluginSettingTab {
	plugin: CanvasBlocksPlugin;

	constructor(app: App, plugin: CanvasBlocksPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Plugin data location")
			.setDesc("Where the plugin will save data")
			.addText((text) =>
			text
				.setPlaceholder("/")
				.setValue(this.plugin.settings.dataFolder)
				.onChange(async (value) => {
					this.plugin.settings.dataFolder = value;
						await this.plugin.saveSettings();
					})
				);

		new Setting(containerEl)
			.setName("Workflow script folder")
			.setDesc("Set the location for workflow scripts to be searched for")
			.addText((text) =>
			text
				.setPlaceholder("/")
				.setValue(this.plugin.settings.workflowScriptFolder)
				.onChange(async (value) => {
					this.plugin.settings.workflowScriptFolder = value;
					await this.plugin.saveSettings();
			})
		);


		new Setting(containerEl)
			.setName("Python path")
			.setDesc("Override default python install")
			.addText((text) =>
			text
				.setPlaceholder("python")
				.setValue(this.plugin.settings.pythonPath)
				.onChange(async (value) => {
					this.plugin.settings.pythonPath = value;
					await this.plugin.saveSettings();
			})
		);
	
	}
}