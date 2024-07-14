import CanvasBlocksPlugin from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";

export interface CanvasBlocksPluginSettings
{
	dataFolder: string;
	workflowScriptFolder: string;
	pythonPath: string;
	variables: [string, string][];
}

export const DEFAULT_SETTINGS: CanvasBlocksPluginSettings = {
	dataFolder: "",
	workflowScriptFolder: "",
	pythonPath: "",
	variables: []
};

export class CanvasBlocksPluginSettingTab extends PluginSettingTab {
	plugin: CanvasBlocksPlugin;

	constructor(app: App, plugin: CanvasBlocksPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

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


		new Setting(containerEl)
			.setName("Add variable")
			.addButton((button) => {
				button
					.setButtonText("Add variable")
					.onClick(async () => {
						this.plugin.settings.variables.push(["", ""]);
						await this.plugin.saveSettings();
						this.display();
				});
		});

		// Sort by key but put empty keys at the end
		this.plugin.settings.variables.sort((a, b) => {
			if (a[0] === "") return 1;
			if (b[0] === "") return -1;
			return a[0].localeCompare(b[0]);
		});

		// Display variables
		this.plugin.settings.variables.forEach((variable, index) => {

			const key = variable[0];
			const value = variable[1];

			new Setting(containerEl)
				.addText((variableKeyText) => {
					variableKeyText
						.setPlaceholder("Variable name")
						.setValue(key)
						.onChange(async (value) => {
							this.plugin.settings.variables[index][0] = value;
							await this.plugin.saveSettings();
						})
				})
				.addText((variableValueText) => {
					variableValueText
						.setPlaceholder("Value")
						.setValue(value)
						.onChange(async (value) => {
							this.plugin.settings.variables[index][1] = value;
							await this.plugin.saveSettings();
						});		
				})

				.addExtraButton((removeVariableButton) => {
					removeVariableButton
						.setIcon("cross")
						.onClick(async () => {
							this.plugin.settings.variables.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						});
				});

		});
	
	}
}