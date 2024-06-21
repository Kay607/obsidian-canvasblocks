import { ItemView, TAbstractFile, WorkspaceLeaf } from "obsidian";
import { CanvasData, CanvasFileData, CanvasGroupData, CanvasTextData } from "obsidian/canvas";

// any is ignored as the Obsidian Canvas does not have these types

export interface CanvasView extends ItemView {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas?: any;
}

export interface CanvasLeaf extends WorkspaceLeaf {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	removeEdge: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	addEdge: any;
    ty: number;
    tx: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	selection: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	nodes: { [id: string]: any };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	edges: { [id: string]: any };
	data: CanvasData;
	view: CanvasView;

    // eslint-disable-next-line no-unused-vars
	createTextNode(node: TextNodeTemplate): CanvasTextData;
    // eslint-disable-next-line no-unused-vars
	createFileNode(node: FileNodeTemplate): CanvasFileData;
    // eslint-disable-next-line no-unused-vars
	createGroupNode(node: GroupNodeTemplate): CanvasGroupData;
    requestSave(): undefined;
}

export interface ExtendedEdge {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	to: any;
	lastTo: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	from: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	update: any;

}