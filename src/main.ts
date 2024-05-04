import { Plugin } from "obsidian";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface MyPluginSettings {}

const DEFAULT_SETTINGS: MyPluginSettings = {};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
