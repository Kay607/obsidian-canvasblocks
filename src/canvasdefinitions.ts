import { ItemView, TAbstractFile, WorkspaceLeaf } from "obsidian";
import { CanvasData, CanvasFileData, CanvasGroupData, CanvasTextData } from "obsidian/canvas";

export interface CanvasView extends ItemView {
    canvas?: any;
}

export interface CanvasLeaf extends WorkspaceLeaf {
	rebuildView(): any;
}

export interface NodeTemplate {
	pos: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
    save: boolean;
    focus: boolean;
}

export interface TextNodeTemplate extends NodeTemplate {
    text: string;
}

export interface FileNodeTemplate extends NodeTemplate {
    file: TAbstractFile | null;
}

export interface GroupNodeTemplate extends NodeTemplate {
    label: string;
}

export interface ExtendedCanvas {
	removeEdge: any;
	addEdge: any;
    ty: number;
    tx: number;
	selection: any;
	nodes: { [id: string]: any };
	edges: { [id: string]: any };
	data: CanvasData;
	view: CanvasView;

	createTextNode(node: TextNodeTemplate): CanvasTextData;
	createFileNode(node: FileNodeTemplate): CanvasFileData;
	createGroupNode(node: GroupNodeTemplate): CanvasGroupData;
    requestSave(): undefined;
}

export interface ExtendedEdge {
	to: any;
	lastTo: string;
	from: any;
	update: any;

}