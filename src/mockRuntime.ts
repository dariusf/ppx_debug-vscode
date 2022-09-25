/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { EventEmitter } from 'events';
import * as vscode from "vscode";
import * as debugging from "./debugging";

export interface FileAccessor {
	isWindows: boolean;
	readFile(path: string): Promise<Uint8Array>;
	writeFile(path: string, contents: Uint8Array): Promise<void>;
}

export interface IRuntimeBreakpoint {
	id: number;
	line: number;
	verified: boolean;
}

interface IRuntimeStepInTargets {
	id: number;
	label: string;
}

interface IRuntimeStackFrame {
	index: number;
	name: string;
	file: string;
	line: number;
	column?: number;
	instruction?: number;
}

interface IRuntimeStack {
	count: number;
	frames: IRuntimeStackFrame[];
}

interface RuntimeDisassembledInstruction {
	address: number;
	instruction: string;
	line?: number;
}

export type IRuntimeVariableType = number | boolean | string | RuntimeVariable[];

export class RuntimeVariable {
	private _memory?: Uint8Array;

	public reference?: number;

	public get value() {
		return this._value;
	}

	public set value(value: IRuntimeVariableType) {
		this._value = value;
		this._memory = undefined;
	}

	public get memory() {
		if (this._memory === undefined && typeof this._value === 'string') {
			this._memory = new TextEncoder().encode(this._value);
		}
		return this._memory;
	}

	constructor(public readonly name: string, private _value: IRuntimeVariableType) {}

	public setMemory(data: Uint8Array, offset = 0) {
		const memory = this.memory;
		if (!memory) {
			return;
		}

		memory.set(data, offset);
		this._memory = memory;
		this._value = new TextDecoder().decode(memory);
	}
}

interface Word {
	name: string;
	line: number;
	index: number;
}

export function timeout(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * A Mock runtime with minimal debugger functionality.
 * MockRuntime is a hypothetical (aka "Mock") "execution engine with debugging support":
 * it takes a Markdown (*.md) file and "executes" it by "running" through the text lines
 * and searching for "command" patterns that trigger some debugger related functionality (e.g. exceptions).
 * When it finds a command it typically emits an event.
 * The runtime can not only run through the whole file but also executes one line at a time
 * and stops on lines for which a breakpoint has been registered. This functionality is the
 * core of the "debugging support".
 * Since the MockRuntime is completely independent from VS Code or the Debug Adapter Protocol,
 * it can be viewed as a simplified representation of a real "execution engine" (e.g. node.js)
 * or debugger (e.g. gdb).
 * When implementing your own debugger extension for VS Code, you probably don't need this
 * class because you can rely on some existing debugger or runtime.
 */
export class MockRuntime extends EventEmitter {

	// the initial (and one and only) file we are 'debugging'
	// private _sourceFile: string = '';
	// public get sourceFile() {
	// 	return this._sourceFile;
	// }

	// private variables = new Map<string, RuntimeVariable>();

	// the contents (= lines) of the one and only file
	// private sourceLines: string[] = [];
	// private instructions: Word[] = [];
	// private starts: number[] = [];
	// private ends: number[] = [];

	// This is the next line that will be 'executed'
	// private _currentLine = 0;
	// private get currentLine() {
	// 	return this._currentLine;
	// }
	// private set currentLine(x) {
	// 	this._currentLine = x;
	// 	this.instruction = this.starts[x];
	// }
	// private currentColumn: number | undefined;

	// This is the next instruction that will be 'executed'
	public instruction = 1;

	// maps from sourceFile to array of IRuntimeBreakpoint
	private breakPoints = new Map<string, IRuntimeBreakpoint[]>();

	// all instruction breakpoint addresses
	private instructionBreakpoints = new Set<number>();

	// since we want to send breakpoint events, we will assign an id to every event
	// so that the frontend can match events with breakpoints.
	private breakpointId = 1;

	private breakAddresses = new Map<string, string>();

  private workspace: string | null = null;

  private rawData: any;

	// private namedException: string | undefined;
	// private otherExceptions = false;


	constructor(private fileAccessor: FileAccessor) {
		super();
	}

	/**
	 * Start executing the given program.
	 */
	public async start(program: string, stopOnEntry: boolean, debug: boolean): Promise<void> {
    if (!vscode.workspace.workspaceFolders) {
      throw "no workspace open";
    }
    let uri = vscode.workspace.workspaceFolders[0].uri;
    this.workspace = uri.path + "/";

    this.rawData = JSON.parse(
      new TextDecoder().decode(
        await this.fileAccessor.readFile(
          this.workspace + "debugger.json"
        )
      )
    );

    if (debug) {
      await this.verifyBreakpoints(
        this.workspace + this.rawData.nodes[1].id.file
      );

      this.findNextStatement(false, "stopOnEntry");
    }
	}

	/**
	 * Continue execution to the end/beginning.
	 */
	public continue(reverse: boolean) {
		// reverse execution is handled here
    while (!this.executeLine(0, reverse)) {
      if (this.findNextStatement(reverse)) {
        break;
      }
    }
	}

	/**
	 * Step to the next/previous non empty line.
	 */
	public step(instruction: boolean, reverse: boolean) {
    // corresponds to step over

		// handles step back
    let sib: number;
    if (reverse) {
      sib = this.rawData.edges[this.instruction].prev_sibling;
      // this.instruction--;
    } else {
      sib = this.rawData.edges[this.instruction].next_sibling;
      // this.instruction++;
    }

    if (sib !== undefined) {
      this.instruction = sib;
    }
    this.sendEvent("stopOnStep");
		this.highlight();
	}

	public highlight() {
		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		};
		debugging.highlightPrevNext(editor, this.rawData, this.instruction);
	}

	public stepIn(targetId: number | undefined) {
    this.instruction++;
    this.sendEvent("stopOnStep");
		this.highlight();
	}

	public stepOut() {
		// handles step out

		if (this.instruction > 1) {
			// return;
			this.instruction--;
		}

    this.sendEvent("stopOnStep");
		this.highlight();
	}

	public getStepInTargets(frameId: number): IRuntimeStepInTargets[] {
    // TODO
    return [];
	}

	/**
	 * Returns a fake 'stacktrace' where every 'stackframe' is a word from the current line.
	 */
	public stack(startFrame: number, endFrame: number): IRuntimeStack {

    let frames = [
      {
        index: 0,
        name: this.rawData.nodes[this.instruction].name,
        file: this.workspace + this.rawData.nodes[this.instruction].id.file,
        line: this.rawData.nodes[this.instruction].id.line,
        column: 0,
      },
    ];

    return {
      frames,
      count: 1,
    };
	}

	public getBreakpoints(path: string, line: number): number[] {
		return [];
	}

	public async setBreakPoint(path: string, line: number): Promise<IRuntimeBreakpoint> {
		path = this.normalizePathAndCasing(path);

		const bp: IRuntimeBreakpoint = { verified: false, line, id: this.breakpointId++ };
		let bps = this.breakPoints.get(path);
		if (!bps) {
			bps = new Array<IRuntimeBreakpoint>();
			this.breakPoints.set(path, bps);
		}
		bps.push(bp);

		await this.verifyBreakpoints(path);

		return bp;
	}

	public clearBreakPoint(path: string, line: number): IRuntimeBreakpoint | undefined {
		const bps = this.breakPoints.get(this.normalizePathAndCasing(path));
		if (bps) {
			const index = bps.findIndex(bp => bp.line === line);
			if (index >= 0) {
				const bp = bps[index];
				bps.splice(index, 1);
				return bp;
			}
		}
		return undefined;
	}

	public clearBreakpoints(path: string): void {
		this.breakPoints.delete(this.normalizePathAndCasing(path));
	}

	public setDataBreakpoint(address: string, accessType: 'read' | 'write' | 'readWrite'): boolean {

		const x = accessType === 'readWrite' ? 'read write' : accessType;

		const t = this.breakAddresses.get(address);
		if (t) {
			if (t !== x) {
				this.breakAddresses.set(address, 'read write');
			}
		} else {
			this.breakAddresses.set(address, x);
		}
		return true;
	}

	public clearAllDataBreakpoints(): void {
		this.breakAddresses.clear();
	}

	public setExceptionsFilters(namedException: string | undefined, otherExceptions: boolean): void {
	}

	public setInstructionBreakpoint(address: number): boolean {
		this.instructionBreakpoints.add(address);
		return true;
	}

	public clearInstructionBreakpoints(): void {
		this.instructionBreakpoints.clear();
	}

	public async getGlobalVariables(cancellationToken?: () => boolean ): Promise<RuntimeVariable[]> {
    // none for now
    return [new RuntimeVariable("_id", this.instruction)];
	}

	public getLocalVariables(): RuntimeVariable[] {
		let args = this.rawData.nodes[this.instruction].args || {};
    return Object.keys(args).map((k) => new RuntimeVariable(k, args[k]));
	}

	public getLocalVariable(name: string): RuntimeVariable | undefined {
    return this.rawData.nodes[this.instruction].args[name];
	}

	public disassemble(address: number, instructionCount: number): RuntimeDisassembledInstruction[] {
		const instructions: RuntimeDisassembledInstruction[] = [];
		return instructions;
	}

	// private methods

	// @ts-ignore
	private getLine(line?: number): string {
    return "line";
	}

	// @ts-ignore
	private getWords(l: number, line: string): Word[] {
		// break line into words
		const WORD_REGEXP = /[a-z]+/ig;
		const words: Word[] = [];
		let match: RegExpExecArray | null;
		while (match = WORD_REGEXP.exec(line)) {
			words.push({ name: match[0], line: l, index: match.index });
		}
		return words;
	}

	/**
	 * return true on stop
	 */
	 private findNextStatement(reverse: boolean, stepEvent?: string): boolean {
    if (stepEvent) {
      this.sendEvent(stepEvent);
      return true;
    } else if (!reverse && this.instruction >= this.rawData.last) {
			this.sendEvent("stopOnStep");
			this.highlight();
      return true;
    } else if (reverse && this.instruction <= 1) {
			this.sendEvent("stopOnStep");
			this.highlight();
      return true;
    }
    return false;
	}

	private executeLine(ln: number, reverse: boolean): boolean {

    // first "execute" the instructions associated with this line and potentially hit instruction breakpoints
    while (
      reverse ? this.instruction > 1 : this.instruction <= this.rawData.last
    ) {
      reverse ? this.instruction-- : this.instruction++;
      // TODO stop on every line for now
      let file = this.workspace + this.rawData.nodes[this.instruction].id.file;
      let bp =
        (this.breakPoints.get(file) || []).filter((bp) => {
          let ids_at_line = this.rawData.breakpoints[bp.line] || [];
          return ids_at_line.indexOf(this.instruction) >= 0;
        }).length > 0;
      if (bp) {
        this.sendEvent("stopOnInstructionBreakpoint");
        return true;
      }
    }

		// nothing interesting found -> continue
		return false;
	}

	private async verifyBreakpoints(path: string): Promise<void> {

    const bps = this.breakPoints.get(path);
    if (bps) {
      bps.forEach((bp) => {
        if (!bp.verified && this.rawData && this.rawData.breakpoints[bp.line]) {
          bp.verified = true;
          this.sendEvent("breakpointValidated", bp);
        }
      });
    }

	}

	private sendEvent(event: string, ... args: any[]): void {
		setTimeout(() => {
			this.emit(event, ...args);
		}, 0);
	}

	private normalizePathAndCasing(path: string) {
		if (this.fileAccessor.isWindows) {
			return path.replace(/\//g, '\\').toLowerCase();
		} else {
			return path.replace(/\\/g, '/');
		}
	}
}
