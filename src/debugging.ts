
import * as vscode from "vscode";
import { FileAccessor } from "./mockRuntime";

export const future1 = vscode.window.createTextEditorDecorationType({
	// borderWidth: '1px',
	// borderStyle: 'solid',
	// overviewRulerColor: 'blue',
	// overviewRulerLane: vscode.OverviewRulerLane.Right,
	backgroundColor: { id: 'list.focusBackground' },
			// 'red',
	after: {
		// contentText: 'next',
		contentText: ' ↓',
		fontWeight: '8px',
		color: { id: 'editorCodeLens.foreground' },
		// color: { id: 'debugView.valueChangedHighlight' },
		// color: { id: 'peekViewResult.matchHighlightBackground' },
		// contentIconPath: '$(debug-step-into)',
	},
	// light: {
	// 	// this color will be used in light color themes
	// 	borderColor: 'darkblue'
	// },
	// dark: {
	// 	// this color will be used in dark color themes
	// 	borderColor: 'lightblue'
	// }
});

export const sibling1 = vscode.window.createTextEditorDecorationType({
	// borderWidth: '1px',
	// borderStyle: 'solid',
	// overviewRulerColor: 'blue',
	// overviewRulerLane: vscode.OverviewRulerLane.Right,
	backgroundColor: { id: 'list.activeSelectionBackground' },
			// 'red',
	// { id: 'list.filterMatchBackground' }
	// { id: 'list.dropBackground' }
	after: {
		contentText: ' →',
		// contentText: 'sibling',
		fontWeight: '8px',
		color: { id: 'editorCodeLens.foreground' },
		// color: { id: 'debugView.valueChangedHighlight' },
		// color: { id: 'peekViewResult.matchHighlightBackground' },
		// contentIconPath: 'debug-step-over',
	},
	// light: {
	// 	// this color will be used in light color themes
	// 	borderColor: 'darkblue'
	// },
	// dark: {
	// 	// this color will be used in dark color themes
	// 	borderColor: 'lightblue'
	// }
});

export const past1 = vscode.window.createTextEditorDecorationType({
	// borderWidth: '1px',
	// borderStyle: 'solid',
	// overviewRulerColor: 'blue',
	// overviewRulerLane: vscode.OverviewRulerLane.Right,
	backgroundColor: { id: 'listFilterWidget.background' },
			// 'red',
	after: {
		// contentText: 'prev',
		contentText: ' ↑',
		fontWeight: '8px',
		color: { id: 'editorCodeLens.foreground' },
		// color: { id: 'debugView.valueChangedHighlight' },
		// color: { id: 'peekViewResult.matchHighlightBackground' },
		// contentIconPath: 'debug-step-out',
	},
	// light: {
	// 	// this color will be used in light color themes
	// 	borderColor: 'darkblue'
	// },
	// dark: {
	// 	// this color will be used in dark color themes
	// 	borderColor: 'lightblue'
	// }
});


export function highlightPrevNext(editor: vscode.TextEditor, rawData: any, instruction: number) {
  let decorated: number[] = [];

  // next line
  let node = rawData.nodes[instruction + 1];
  if (instruction < rawData.last && node) {
    let line = editor.document.lineAt(node.id.line-1);
    let dec = {
      range: line.range,
      hoverMessage: "next"
    };
    editor.setDecorations(future1, [dec]);
    decorated.push(node.id.line);
  } else {
    editor.setDecorations(future1, []);
  }

  node = rawData.nodes[instruction - 1];
  if (instruction > 1 && node && decorated.indexOf(node.id.line) === -1) {
    let line = editor.document.lineAt(node.id.line-1);
    let dec = {
      range: line.range,
      hoverMessage: "prev"
    };
    editor.setDecorations(past1, [dec]);
  } else {
    editor.setDecorations(past1, []);
  }

  let next_sibling = rawData.edges[instruction].next_sibling;
  node = rawData.nodes[next_sibling];
  if (instruction < rawData.last && node && decorated.indexOf(node.id.line) === -1) {
    let line = editor.document.lineAt(node.id.line-1);
    let dec = {
      range: line.range,
      hoverMessage: "next sibling"
    };
    editor.setDecorations(sibling1, [dec]);
  } else {
    editor.setDecorations(sibling1, []);
  }
}

// custom debugging ui

export const currentDec = vscode.window.createTextEditorDecorationType({
	// borderWidth: '1px',
	// borderStyle: 'solid',
	// overviewRulerColor: 'blue',
	// overviewRulerLane: vscode.OverviewRulerLane.Right,
	// backgroundColor: { id: 'listFilterWidget.background' },
	// backgroundColor: { id: 'listFilterWidget.background' },
	backgroundColor: { id: 'list.focusBackground' },
			// 'red',
	after: {
		// contentText: 'prev',
		// contentText: ' ←a',
		// contentText: ' <--',
		contentText: '  <--',
		fontWeight: '8px',
		color: { id: 'editorCodeLens.foreground' },
		// color: { id: 'debugView.valueChangedHighlight' },
		// color: { id: 'peekViewResult.matchHighlightBackground' },
		// contentIconPath: 'debug-step-out',
	},
	// light: {
	// 	// this color will be used in light color themes
	// 	borderColor: 'darkblue'
	// },
	// dark: {
	// 	// this color will be used in dark color themes
	// 	borderColor: 'lightblue'
	// }
});

let instruction = 0;
let rawData;

export async function loadRawData(fa: FileAccessor, workspace: string, file: string) {
    rawData = JSON.parse(
      new TextDecoder().decode(
        await fa.readFile(
          // "/Users/darius/ocaml/vscode-mock-debug/debug.json"
					workspace + file
					// "debug.json"
        )
        // await this.fileAccessor.readFile("linear.json")
      )
    );
  instruction = 1;
}

class MyCodeLensProvider implements vscode.CodeLensProvider {
	public onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
	public get onDidChangeCodeLenses(): vscode.Event<void> {
		return this.onDidChangeCodeLensesEmitter.event;
	}

  async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
		
		let line = rawData.nodes[instruction].id.line-1;
    let pos = new vscode.Range(line, 0, line, 0)

    let next: vscode.Command = {
      command: 'extension.mock-debug.nextInstruction',
      title: 'Next',
    }
    let prev: vscode.Command = {
      command: 'extension.mock-debug.prevInstruction',
      title: 'Prev',
    }

		return [
			new vscode.CodeLens(pos, prev),
			new vscode.CodeLens(pos, next),
		];
  }
}

export let codelens = new MyCodeLensProvider();

function highlightCurrent(editor: vscode.TextEditor) {
  let decorated: number[] = [];

  let node = rawData.nodes[instruction];
  if (node) {
    let line = editor.document.lineAt(node.id.line-1);
    let dec = {
      range: line.range,
      hoverMessage: "next"
    };
    editor.setDecorations(currentDec, [dec]);
    decorated.push(node.id.line);
  } else {
    editor.setDecorations(currentDec, []);
  }
}

function moveCursor(editor: vscode.TextEditor, pos: number) {
	const position = editor.selection.active;
	var newPosition = position.with(pos);
	var newSelection = new vscode.Selection(newPosition, newPosition);
	editor.selection = newSelection;
}

async function scrollToCursor(editor: vscode.TextEditor) {
	const currentLineNumber = editor.selection.start.line;
	await vscode.commands.executeCommand('revealLine', {
		lineNumber: currentLineNumber,
		at: 'center',
	});
}

export async function updateView(editor: vscode.TextEditor) {
	codelens.onDidChangeCodeLensesEmitter.fire();
	highlightCurrent(editor);
	moveCursor(editor, rawData.nodes[instruction].id.line - 1);
	await scrollToCursor(editor);
}

export function nextInstruction() {
	let editor = vscode.window.activeTextEditor;
	if (!editor || instruction >= rawData.last) {
		return;
	}
  instruction++;
	updateView(editor);
}

export function prevInstruction() {
	let editor = vscode.window.activeTextEditor;
	if (!editor || instruction <= 1) {
		return;
	}
  instruction--;
	updateView(editor);
}

export function goToInstruction() {
	let i = 0;
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	instruction = i;
	updateView(editor);
}
