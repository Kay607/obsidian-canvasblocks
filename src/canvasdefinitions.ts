import { ItemView, TAbstractFile, WorkspaceLeaf } from "obsidian";
import { CanvasData, CanvasFileData, CanvasGroupData, CanvasTextData } from "obsidian/canvas";
import { Position } from "./main";

// any is ignored as the Obsidian Canvas does not have these types

export interface CanvasView extends ItemView {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	menu: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas?: any;
	_loaded: boolean;

	// Added by the plugin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
    originalAddEdge: undefined|((...args: any[]) => any);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
    originalAddNode: undefined|((...args: any[]) => any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
    originalRemoveNode: undefined|((...args: any[]) => any);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
    originalHandleSelectionDrag: undefined|((...args: any[]) => any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
	originalMenuRender: undefined|((...args: any[]) => any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
    originalHandlePaste: undefined|((...args: any[]) => any);
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
	config: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	updateSelection: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	menu: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	addNode: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	removeEdge: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	removeNode: any;
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
    handleSelectionDrag(event: PointerEvent, t: any, dragNode: any): void;

	// eslint-disable-next-line no-unused-vars
    handlePaste(event: ClipboardEvent): void;
}

export interface ExtendedEdge {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	to: any;
	lastTo: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	from: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	update: any;


	// Added by the plugin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
    originalEdgeUpdate: undefined|((...args: any[]) => any);
}

export interface ExtendedNode {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file: any;
	id: string;
	
	x: number;
	y: number;
	
	width: number;
	height: number;
	
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
	moveAndResize: any;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
	moveTo(position: Position): unknown;
    
	destroy(): undefined;
	detach(): undefined;

	// Added by the plugin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-unused-vars
    originalMoveAndResize: undefined|((...args: any[]) => any);
	skipAddNode: boolean|undefined;

	preventRecursion: boolean;
}