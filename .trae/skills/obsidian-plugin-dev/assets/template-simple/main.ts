import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, SettingGroup } from 'obsidian';

interface {{PLUGIN_CLASS}}Settings {
	exampleSetting: string;
	enableFeature: boolean;
}

const DEFAULT_SETTINGS: {{PLUGIN_CLASS}}Settings = {
	exampleSetting: 'default',
	enableFeature: true,
};

export default class {{PLUGIN_CLASS}} extends Plugin {
	settings: {{PLUGIN_CLASS}}Settings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('dice', '{{PLUGIN_NAME}}', (evt: MouseEvent) => {
			new Notice('{{PLUGIN_NAME}} activated!');
		});

		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('{{PLUGIN_NAME}}');

		this.addCommand({
			id: 'example-command',
			name: 'Example command',
			callback: () => {
				new Notice('Hello from {{PLUGIN_NAME}}!');
			},
		});

		this.addCommand({
			id: 'example-editor-command',
			name: 'Example editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				editor.replaceSelection(`**${selection}**`);
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
			.setHeading('General')
			.addSetting((setting) =>
				setting
					.setName('Example setting')
					.setDesc('Enter a value for this setting.')
					.addText((text) =>
						text
							.setPlaceholder('Enter value...')
							.setValue(this.plugin.settings.exampleSetting)
							.onChange(async (value) => {
								this.plugin.settings.exampleSetting = value;
								await this.plugin.saveSettings();
							})
					)
			)
			.addSetting((setting) =>
				setting
					.setName('Enable feature')
					.setDesc('Toggle this feature on or off.')
					.addToggle((toggle) =>
						toggle
							.setValue(this.plugin.settings.enableFeature)
							.onChange(async (value) => {
								this.plugin.settings.enableFeature = value;
								await this.plugin.saveSettings();
							})
					)
			);
	}
}
