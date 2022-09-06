
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

function rangeOfLoc(loc) {
	const [[sl, sc], [el, ec]] = loc;
		return new vscode.Range(new vscode.Position(sl-1,sc), new vscode.Position(el-1,ec));
}

export function highlightPrevNext(editor: vscode.TextEditor, rawData: any, instruction: number) {
  let decorated: number[] = [];

  // next line
  let node = rawData.nodes[instruction + 1];
  if (instruction < rawData.last && node) {
    // let line = editor.document.lineAt(node.id.line-1);
    // let dec = {
    //   range: line.range,
    //   hoverMessage: "next"
    // };
    let dec = {
      range: rangeOfLoc(node.id.loc),
      // hoverMessage: "next"
    };
    editor.setDecorations(future1, [dec]);
    decorated.push(node.id.line);
  } else {
    editor.setDecorations(future1, []);
  }

  node = rawData.nodes[instruction - 1];
	// let notAlreadyDecorated = decorated.indexOf(node.id.line) === -1;
	let notAlreadyDecorated = true; // TODO
  if (instruction > 1 && node && notAlreadyDecorated) {
    // let line = editor.document.lineAt(node.id.line-1);
    let dec = {
      range: rangeOfLoc(node.id.loc),
      // hoverMessage: "prev"
    };
    editor.setDecorations(past1, [dec]);
  } else {
    editor.setDecorations(past1, []);
  }

  let next_sibling = rawData.edges[instruction].next_sibling;
  node = rawData.nodes[next_sibling];
	// notAlreadyDecorated = decorated.indexOf(node.id.line) === -1
	notAlreadyDecorated = true; // TODO
  if (instruction < rawData.last && node && notAlreadyDecorated) {
    // let line = editor.document.lineAt(node.id.line-1);
    let dec = {
      range: rangeOfLoc(node.id.loc),
      // hoverMessage: "next sibling"
    };
    editor.setDecorations(sibling1, [dec]);
  } else {
    editor.setDecorations(sibling1, []);
  }
}

// custom debugging ui

// let kind = '';
// if (rawData.nodes[instruction].content) {
// 	kind = ' (event)'
// } else if (rawData.nodes[instruction].args) {
// 	kind = ' (call)'
// }

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
		// contentText: '>>>',
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

export const currentDec1 = vscode.window.createTextEditorDecorationType({
	after: {
		contentText: '<<<',
		fontWeight: '8px',
		color: { id: 'editorCodeLens.foreground' },
	},
});

export const currentDec2 = vscode.window.createTextEditorDecorationType({
	after: {
		contentText: '>>>',
		fontWeight: '8px',
		color: { id: 'editorCodeLens.foreground' },
	},
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

class MyHoverProvider implements vscode.HoverProvider {
	
	provideHover(document, position, token) {
		// console.log('hello');
		
		const range = document.getWordRangeAtPosition(position);
		const word = document.getText(range);
		// console.log('word', rawData, instruction);
		// console.log(rawData.nodes[instruction]);

		let s : any = null;

		if (!rawData) {
			return;
		}

		if (rawData.nodes[instruction].content) {
			// console.log(rawData.nodes[instruction].content);
			s = new vscode.MarkdownString(rawData.nodes[instruction].content);
		} else if (rawData.nodes[instruction].args) {
			if (rawData.nodes[instruction].args[word]) {
				// console.log(rawData.nodes[instruction].args[word]);
				s = new vscode.MarkdownString(rawData.nodes[instruction].args[word]);
			}
		}
		// console.log('done');

		if (s) {
			s.supportHtml = true;
			s.isTrusted = true;
			return new vscode.Hover(s);
		}
  }
}

export let hover = new MyHoverProvider();

class MyInlayHintsProvider implements vscode.InlayHintsProvider {

	public emitter = new vscode.EventEmitter<void>();
	public get onDidChangeInlayHints(): vscode.Event<void> {
		return this.emitter.event;
	}
	// ?: vscode.Event<void> | undefined;

	provideInlayHints(document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken): vscode.ProviderResult<vscode.InlayHint[]> {
		// throw new Error("Method not implemented.");
		// console.log('INLAY HINTS');

		const span = rangeOfLoc(rawData.nodes[instruction].id.loc);

		if (!rawData.nodes[instruction].args) {
			return [new vscode.InlayHint(span.end, ' => ' + rawData.nodes[instruction].content, vscode.InlayHintKind.Type)];
		}

		const text = document.getText(span);

		// console.log(text);

		let args = rawData.nodes[instruction].args;
		// console.log('args', args);
		
		let hints = Object.keys(args).flatMap(arg => {
			if (arg.startsWith('_')) {
				return [];
			}
			// console.log('survived', arg);
			
			// console.log('arg', arg);
			const matches = text.matchAll(new RegExp('(?<!\\.)\\b' + arg + '\\b', 'g'));
			// console.log(matches);
			let res: vscode.InlayHint[] = [];
			for (const match of matches) {
				// console.log(match);
				// console.log(match.index)
				if (match.index === undefined) {
					console.log('no match?', match);
					continue;
				}
				res.push(new vscode.InlayHint(document.positionAt(document.offsetAt(span.start) + match.index + arg.length), ' = ' + args[arg], vscode.InlayHintKind.Type));

				// console.log('got', arg, args[arg], document.positionAt(document.offsetAt(span.start) + match.index + arg.length));
				
				// show only the first match, it's less likely to be shadowed
				break;
			}
			// console.log('res', res);
			
			return res;
			// return [new vscode.InlayHint(new vscode.Position(20, 0), "INLAY HINT TYPE", vscode.InlayHintKind.Type)];
		});

		hints.push(new vscode.InlayHint(span.end, ' => ' + args['_res'], vscode.InlayHintKind.Type));

		// console.log('ok', hints.length);

		return hints;

		// const matches = string.matchAll(regexp);
		// for (const match of matches) {
		// 	console.log(match);
		// 	console.log(match.index)
		// }

		// return [
		// 	new vscode.InlayHint(new vscode.Position(20, 0), "INLAY HINT TYPE", vscode.InlayHintKind.Type),
		// 	new vscode.InlayHint(new vscode.Position(10, 0), "INLAY HINT PARAM", vscode.InlayHintKind.Parameter)
		// ];
	}
	// resolveInlayHint?(hint: vscode.InlayHint, token: vscode.CancellationToken): vscode.ProviderResult<vscode.InlayHint> {
	// 	throw new Error("Method not implemented.");
	// }
}

export let inlayHints = new MyInlayHintsProvider();

class MyInlineValuesProvider implements vscode.InlineValuesProvider {

	// onDidChangeInlineValues?: vscode.Event<void> | undefined;
	provideInlineValues(document: vscode.TextDocument, viewPort: vscode.Range, context: vscode.InlineValueContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.InlineValue[]> {
		console.log('INLINE VALUES');
		
		return [

			new vscode.InlineValueEvaluatableExpression(new vscode.Range(new vscode.Position(30, 0), new vscode.Position(31, 0)), "EXPR"),

			new vscode.InlineValueText(new vscode.Range(new vscode.Position(32, 0), new vscode.Position(33, 0)), "TEXT"),

			new vscode.InlineValueVariableLookup(new vscode.Range(new vscode.Position(34, 0), new vscode.Position(35, 0)), "VAR")
		];
	}
}

export let inlineValues = new MyInlineValuesProvider();

function highlightCurrent(editor: vscode.TextEditor) {
  // let decorated: number[] = [];

  let node = rawData.nodes[instruction];
  if (node) {
    // let line = editor.document.lineAt(node.id.line-1);
    // let dec = {
    //   range: rangeOfLoc(node.id.loc),
    //   // hoverMessage: "next"
    // };
    // editor.setDecorations(currentDec, [dec]);

		let span = rangeOfLoc(node.id.loc);

    // let dec1 = {
    //   range: new vscode.Range(span.start, editor.document.positionAt(editor.document.offsetAt(span.start)+1))
    // };
    // let dec2 = {
    //   range: new vscode.Range(editor.document.positionAt(editor.document.offsetAt(span.end)-1), span.end)
    // };
    // editor.setDecorations(currentDec, [dec1, dec2]);
    // decorated.push(node.id.line);

    let dec1 = {
      range: new vscode.Range(editor.document.positionAt(editor.document.offsetAt(span.start)-1), span.start)
    };
    let dec2 = {
      range: new vscode.Range(editor.document.positionAt(editor.document.offsetAt(span.end)-1), span.end)
    };
    editor.setDecorations(currentDec1, [dec1]);
    editor.setDecorations(currentDec2, [dec2]);
  } else {
    // editor.setDecorations(currentDec, []);
    editor.setDecorations(currentDec1, []);
    editor.setDecorations(currentDec2, []);
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
	inlayHints.emitter.fire();
	highlightCurrent(editor);
	// moveCursor(editor, rawData.nodes[instruction].id.line - 1);
	moveCursor(editor, rawData.nodes[instruction].id.loc[0][0] - 1);
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
	updateView(editor);
}
