import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("system-prompt", {
		description: "Dump current Pi system prompt to a file",
		handler: async (args, ctx) => {
			const out = args.trim() || ".pi-system-prompt.md";
			const path = resolve(ctx.cwd, out);
			await writeFile(path, ctx.getSystemPrompt(), "utf8");
			ctx.ui.notify(`System prompt written to ${path}`, "info");
		},
	});
}
