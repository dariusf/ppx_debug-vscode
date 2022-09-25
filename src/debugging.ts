
import * as vscode from "vscode";
import { FileAccessor } from "./mockRuntime";

export const future1 = vscode.window.createTextEditorDecorationType({
	backgroundColor: { id: 'list.focusBackground' },
	after: {
		contentText: ' ↓',
		fontWeight: '8px',
		color: { id: 'editorCodeLens.foreground' },
	},
});

export const sibling1 = vscode.window.createTextEditorDecorationType({
	backgroundColor: { id: 'list.activeSelectionBackground' },
	after: {
		contentText: ' →',
		fontWeight: '8px',
		color: { id: 'editorCodeLens.foreground' },
	},
});

export const past1 = vscode.window.createTextEditorDecorationType({
	backgroundColor: { id: 'listFilterWidget.background' },
	after: {
		contentText: ' ↑',
		fontWeight: '8px',
		color: { id: 'editorCodeLens.foreground' },
	},
});

function rangeOfLoc(loc) {
	const [[sl, sc], [el, ec]] = loc;
		return new vscode.Range(new vscode.Position(sl-1,sc), new vscode.Position(el-1,ec));
}

export function highlightPrevNext(editor: vscode.TextEditor, rawData: any, instruction: number) {
  let decorated: number[] = [];

  // next line
  let node = rawData.nodes[instruction + 1];
  if (instruction < rawData.last && node) {
    let dec = {
      range: rangeOfLoc(node.id.loc),
    };
    editor.setDecorations(future1, [dec]);
    decorated.push(node.id.line);
  } else {
    editor.setDecorations(future1, []);
  }

  node = rawData.nodes[instruction - 1];
	let notAlreadyDecorated = true; // TODO
  if (instruction > 1 && node && notAlreadyDecorated) {
    let dec = {
      range: rangeOfLoc(node.id.loc),
    };
    editor.setDecorations(past1, [dec]);
  } else {
    editor.setDecorations(past1, []);
  }

  let next_sibling = rawData.edges[instruction].next_sibling;
  node = rawData.nodes[next_sibling];
	notAlreadyDecorated = true; // TODO
  if (instruction < rawData.last && node && notAlreadyDecorated) {
    let dec = {
      range: rangeOfLoc(node.id.loc),
    };
    editor.setDecorations(sibling1, [dec]);
  } else {
    editor.setDecorations(sibling1, []);
  }
}

// custom debugging ui

export const decorStart = vscode.window.createTextEditorDecorationType({
	after: {
		contentText: '<<<',
		fontWeight: '8px',
		color: { id: 'editorCodeLens.foreground' },
	},
});

export const decorEnd = vscode.window.createTextEditorDecorationType({
	after: {
		contentText: '>>>',
		fontWeight: '8px',
		color: { id: 'editorCodeLens.foreground' },
	},
});

let instruction = 0;
let rawData;
let prevFile;

export async function loadRawData(fa: FileAccessor, workspace: string, file: string) {
		prevFile = file;
    rawData = JSON.parse(
      new TextDecoder().decode(
        await fa.readFile(
					workspace + file
        )
      )
    );
  instruction = 1;
}

export async function reloadRawData(fa: FileAccessor, workspace: string) {
    rawData = JSON.parse(
      new TextDecoder().decode(await fa.readFile(workspace + prevFile)));
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
      command: 'extension.ppx-debug.nextInstruction',
      title: 'Next',
    }
    let prev: vscode.Command = {
      command: 'extension.ppx-debug.prevInstruction',
      title: 'Prev',
    }

		return [
			new vscode.CodeLens(pos, prev),
			new vscode.CodeLens(pos, next),
		];
  }
}

export let codelens = new MyCodeLensProvider();

class MyHoverProvider implements vscode.HoverProvider {
	
	provideHover(document, position, token) {
		
		const range = document.getWordRangeAtPosition(position);
		const word = document.getText(range);

		let s : any = null;

		if (!rawData) {
			return;
		}

		if (rawData.nodes[instruction].content) {
			s = new vscode.MarkdownString(rawData.nodes[instruction].content);
		} else if (rawData.nodes[instruction].args) {
			if (rawData.nodes[instruction].args[word]) {
				s = new vscode.MarkdownString(rawData.nodes[instruction].args[word]);
			}
		}

		if (s) {
			s.supportHtml = true;
			s.isTrusted = true;
			return new vscode.Hover(s);
		}
  }
}

export let hover = new MyHoverProvider();

let cumulativeHints = false;
let storedHints = {};

function storeHint([pos, text]: [vscode.Position, string]) {
	let id = `${pos.line},${pos.character}`;
	storedHints[id] = [pos, text];
}
function getStoredHints(): [vscode.Position, string][] {
	return Object.values(storedHints);
}
function deleteStoredHints() {
	storedHints = {};
}
function computeHints(document: vscode.TextDocument) {
	const span = rangeOfLoc(rawData.nodes[instruction].id.loc);

	let allHints;

	if (!rawData.nodes[instruction].args) {
		allHints = [[span.end, ` =${instruction}=> ${rawData.nodes[instruction].content}`]];
	} else {

		const text = document.getText(span);

		let args = rawData.nodes[instruction].args;
		
		allHints = Object.keys(args).flatMap(arg => {
			if (arg.startsWith('_')) {
				return [];
			}
			
			const matches = text.matchAll(new RegExp('(?<!\\.)\\b' + arg + '\\b', 'g'));
			let res: [vscode.Position, string][] = [];
			for (const match of matches) {
				if (match.index === undefined) {
					console.log('no match?', match);
					continue;
				}
				let pos = document.positionAt(document.offsetAt(span.start) + match.index + arg.length);
				res.push([pos, ' = ' + args[arg]]);

				// show only the first match, it's less likely to be shadowed
				break;
			}
			
			return res;
		});

		allHints.push([span.end, ` =${instruction}=> ${args['_res']}`]);
	}
	
	if (!cumulativeHints) {
		deleteStoredHints();
	}

	let hs = [...allHints];
	hs.forEach(h => {
		storeHint(h);
	});
}

class MyInlayHintsProvider implements vscode.InlayHintsProvider {

	public emitter = new vscode.EventEmitter<void>();
	public get onDidChangeInlayHints(): vscode.Event<void> {
		return this.emitter.event;
	}

	provideInlayHints(document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken): vscode.ProviderResult<vscode.InlayHint[]> {
		return getStoredHints().map(([p, h]) => new vscode.InlayHint(p, h));

	}
}

export let inlayHints = new MyInlayHintsProvider();

class MyInlineValuesProvider implements vscode.InlineValuesProvider {

	provideInlineValues(document: vscode.TextDocument, viewPort: vscode.Range, context: vscode.InlineValueContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.InlineValue[]> {
		return [
			new vscode.InlineValueEvaluatableExpression(new vscode.Range(new vscode.Position(30, 0), new vscode.Position(31, 0)), "EXPR"),
			new vscode.InlineValueText(new vscode.Range(new vscode.Position(32, 0), new vscode.Position(33, 0)), "TEXT"),
			new vscode.InlineValueVariableLookup(new vscode.Range(new vscode.Position(34, 0), new vscode.Position(35, 0)), "VAR")
		];
	}
}

export let inlineValues = new MyInlineValuesProvider();

function highlightCurrent(editor: vscode.TextEditor) {

  let node = rawData.nodes[instruction];
  if (node) {
		let span = rangeOfLoc(node.id.loc);
    let dec1 = {
      range: new vscode.Range(editor.document.positionAt(editor.document.offsetAt(span.start)-1), span.start)
    };
    let dec2 = {
      range: new vscode.Range(editor.document.positionAt(editor.document.offsetAt(span.end)-1), span.end)
    };
    editor.setDecorations(decorStart, [dec1]);
    editor.setDecorations(decorEnd, [dec2]);
  } else {
    editor.setDecorations(decorStart, []);
    editor.setDecorations(decorEnd, []);
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

async function getWorkspace() {
	let folders = vscode.workspace.workspaceFolders;
	if (!folders) {
		// await vscode.window.showInformationMessage("no workspace");
		// return;
		throw 'no workspace';
	}
	let uri = folders[0].uri;
	let workspace = uri.path + "/";
	return workspace;
}

export async function updateView(editor: vscode.TextEditor) {

	console.log(rawData.nodes[instruction]);
	
	// switch to file
	let file = rawData.nodes[instruction].id.file;
	let ws = await getWorkspace();

	if (!editor.document.fileName.startsWith(ws)) {
		throw 'file does not start with workspace?';
	}
	let rel_file = editor.document.fileName.substring(ws.length);

	if (rel_file !== file) {
		let doc = await vscode.workspace.openTextDocument(`${ws}/${file}`);
		await vscode.window.showTextDocument(doc);
	}

	// update current editor
	codelens.onDidChangeCodeLensesEmitter.fire();
	computeHints(editor.document);
	inlayHints.emitter.fire();

	highlightCurrent(editor);
	moveCursor(editor, rawData.nodes[instruction].id.loc[0][0] - 1);
	await scrollToCursor(editor);
}

export async function nextInstruction() {
	let editor = vscode.window.activeTextEditor;
	if (!editor || instruction >= rawData.last) {
		return;
	}
  instruction++;
	await updateView(editor);
}

export async function prevInstruction() {
	let editor = vscode.window.activeTextEditor;
	if (!editor || instruction <= 1) {
		return;
	}
  instruction--;
	await updateView(editor);
}

export async function goToInstruction() {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	let res = await vscode.window.showInputBox();
	if (!res) {
		return;
	}
	instruction = +res;
	await updateView(editor);
}

export async function runToHere() {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	let cursor = editor.document.offsetAt(editor.selection.start);
	let backup = instruction;
	for (instruction = Math.min(instruction + 1, rawData.last - 1); instruction < rawData.last; instruction++) {
		let range = rangeOfLoc(rawData.nodes[instruction].id.loc);
		let start = editor.document.offsetAt(range.start);
		let end = editor.document.offsetAt(range.end);

		if (cumulativeHints) {
			computeHints(editor.document);
		}

		if (start <= cursor && cursor <= end) {
			await updateView(editor);
			await vscode.window.showInformationMessage(`Ran forward to ${instruction}`);
			return;
		}
	}
	await vscode.window.showInformationMessage('The given point was not hit when running forward');
	instruction = backup;
	await updateView(editor);
}

export async function runBackwardsToHere() {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	let cursor = editor.document.offsetAt(editor.selection.start);
	let backup = instruction;
	for (instruction = Math.max(instruction - 1, 1); instruction > 1; instruction--) {
		let range = rangeOfLoc(rawData.nodes[instruction].id.loc);
		let start = editor.document.offsetAt(range.start);
		let end = editor.document.offsetAt(range.end);

		if (cumulativeHints) {
			computeHints(editor.document);
		}

		if (start <= cursor && cursor <= end) {
			await updateView(editor);
			await vscode.window.showInformationMessage(`Ran backwards to ${instruction}`);
			return;
		}
	}
	await vscode.window.showInformationMessage('The given point was not hit when running backwards');
	instruction = backup;
	await updateView(editor);
}

export async function togglePersistence() {
	if (cumulativeHints) {
		deleteStoredHints();
	}
	cumulativeHints = !cumulativeHints;

	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	await updateView(editor);
	if (cumulativeHints) {
		await vscode.window.showInformationMessage('Trail will be shown');
	} else {
		await vscode.window.showInformationMessage('Trail hidden');
	}
}

export async function stop() {
	// nuke hints
	deleteStoredHints();
	cumulativeHints = false;

	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	// go back to the start...
	instruction = 1;
	await updateView(editor);

	// then hide the decoration
	editor.setDecorations(decorStart, []);
	editor.setDecorations(decorEnd, []);

	// the trace is actually still loaded; try to go to the next node
}
