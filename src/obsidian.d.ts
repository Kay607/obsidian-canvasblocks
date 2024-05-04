import "obsidian";

declare module "obsidian" {
	interface Workspace {
		on(
			name: "canvas:node-menu",
			callback: (menu: Menu, node: unknown) => void,
			ctx?: unknown
		): EventRef;
	}

	interface ItemView {
		getViewData?: () => string;
		setViewData?: (data: string, clear: boolean) => void;
		requestSave?: () => void;
	}
}

declare module "obsidian/canvas" {
	interface CanvasState {
		viewState: {
			x: number;
			y: number;
			zoom: number;
		};
	}
}
