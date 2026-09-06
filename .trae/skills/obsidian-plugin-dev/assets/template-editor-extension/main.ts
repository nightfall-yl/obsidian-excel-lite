import { App, Plugin, PluginSettingTab, Setting, SettingGroup } from 'obsidian';
import { createHighlightExtension } from './extension';

interface {{PLUGIN_CLASS}}Settings {
	highlightEnabled: boolean;
	highlightColor: string;
}

const DEFAULT_SETTINGS: {{PLUGIN_CLASS}}Settings = {
	highlightEnabled: true,
	highlightColor: '#ffeb3b',
};

export default class {{PLUGIN_CLASS}} extends Plugin {
	settings: {{PLUGIN_CLASS}}Settings;

	async onload() {
		await this.loadSettings();

		this.registerEditorExtension(createHighlightExtension(() => this.settings));

		this.addCommand({
			id: 'toggle-highlight',
			name: 'Toggle highlight',
			callback: async () => {
				this.settings.highlightEnabled = !this.settings.highlightEnabled;
				await this.saveSettings();
				this.app.workspace.updateOptions();
			},
		});

		this.addSettingTab(new {{PLUGIN_CLASS}}SettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class {{PLUGIN_CLASS}}SettingTab extends PluginSettingTab {
	plugin: {{PLUGIN_CLASS}};

	constructor(app: App, plugin: {{PLUGIN_CLASS}}) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new SettingGroup(containerEl)
			.setHeading('Highlight')
			.addSetting((setting) =>
				setting
					.setName('Enable highlight')
					.setDesc('Toggle the editor highlight extension.')
					.addToggle((toggle) =>
						toggle
							.setValue(this.plugin.settings.highlightEnabled)
							.onChange(async (value) => {
								this.plugin.settings.highlightEnabled = value;
								await this.plugin.saveSettings();
								this.plugin.app.workspace.updateOptions();
							})
					)
			)
			.addSetting((setting) =>
				setting
					.setName('Highlight color')
					.setDesc('Choose the highlight color.')
					.addColorPicker((color) =>
						color
							.setValue(this.plugin.settings.highlightColor)
							.onChange(async (value) => {
								this.plugin.settings.highlightColor = value;
								await this.plugin.saveSettings();
								this.plugin.app.workspace.updateOptions();
							})
					)
			);
	}
}
