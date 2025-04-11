// build_idea.ts is executed by the build_idea plugin.
// You should probably put this outside of your syncing folder (or provide
// a VIBECODE_PATH to a place outside your syncing folder); Syncthing doesn't like
// rapidly changing files.
// This depends on ionutvmi.vscode-commands-executor vscode plugin to work;
// make sure you install that extension, along with Roo Code.

import path from 'path'; // Standard path module
import { spawn } from 'bun'; // Using Bun's spawn

const VIBECODE_PATH = process.env.VIBECODE_PATH || process.cwd();

/**
 * Reads an app specification text file, creates a directory, and triggers a new
 * Cline task in VS Code within that directory.
 * @param specFilePath Path to the specification file (.txt format expected).
 */
async function processAppIdea(specFilePath: string) {
    console.log(`Processing app idea specification from: ${specFilePath}`);

    let specContent: string;
    let projectDirPath: string;
    let absolutePath: string;
    let projectDirName: string;

    try {
        // --- Part 1: File Reading and Directory Creation ---

        // 1. Resolve path
        absolutePath = path.resolve(specFilePath);
        const specFile = Bun.file(absolutePath); // Use Bun.file

        // 2. Check file existence and read content
        if (!await specFile.exists()) {
            throw new Error(`Specification file not found: ${absolutePath}`);
        }
        specContent = await specFile.text(); // Read using Bun.file API
        console.log(`  - Read specification content.`);

        // 3. Determine project directory name and path
        projectDirName = path.basename(absolutePath, path.extname(absolutePath));
        // Use global process provided by Bun
        projectDirPath = path.join(VIBECODE_PATH, projectDirName);

        // 4. Create the project directory (using fs/promises via Node compatibility or explicit import if needed)
        // For simplicity and broad compatibility, we might still need fs/promises here,
        // as Bun doesn't have a direct equivalent for mkdir yet in the main 'Bun' object.
        // Let's try importing it dynamically or rely on Node compatibility layer.
        // We'll assume Bun's Node compatibility handles mkdir for now.
        // If this fails, we might need `import { mkdir } from 'node:fs/promises';`
        const fs = await import('node:fs/promises'); // Try importing Node's fs explicitly
        await fs.mkdir(projectDirPath, { recursive: true });
        console.log(`  - Created project directory: ${projectDirPath}`);

        // 4b. Copy the spec file content to PROMPT.txt in the new directory
        const promptFilePath = path.join(projectDirPath, 'PROMPT.txt');
        await Bun.write(promptFilePath, specContent);
        console.log(`  - Copied spec content to: ${promptFilePath}`);

        // --- Part 2: VS Code Command Execution (only if Part 1 succeeded) ---
        console.log(`\nExecuting VS Code command to open project and start Cline task...`);

        // 5. Construct the VS Code command URI
        const data = encodeURIComponent(JSON.stringify([{ id: "roo-cline.SidebarProvider.focus", }]));
        const openRooCommand = `vscode://ionutvmi.vscode-commands-executor/runCommands?data=${data}`;

        const promptData = {
            id: "roo-cline.newTask",
            args: {
                prompt: "Follow instructions in ./PROMPT.txt"
            }
        };
        const encodedData = encodeURIComponent(JSON.stringify([promptData]));
        const vsCodeCommandUri = `vscode://ionutvmi.vscode-commands-executor/runCommands?data=${encodedData}`;

        // 6. Execute the 'code' command to open the new directory
        console.log(`  - Opening directory in VS Code: ${projectDirPath}`);
        const openProc = spawn(['code', projectDirPath], {
             stdio: ['inherit', 'inherit', 'inherit'],
        });
        const openExitCode = await openProc.exited;
        if (openExitCode !== 0) {
             console.warn(`Warning: 'code ${projectDirPath}' command exited with code ${openExitCode}. VS Code might not have opened correctly.`);
        } else {
             console.log(`  - VS Code should be opening directory: ${projectDirPath}`);
        }

        // 7. Trigger the command URI using the OS's default handler for vscode://
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

        let commandExecutor: string;
        // Use global process provided by Bun
        switch (process.platform) {
            case 'darwin': commandExecutor = 'open'; break;
            case 'win32': commandExecutor = 'start'; break;
            default: commandExecutor = 'xdg-open'; break;
        }

        console.log(`  - URI: ${openRooCommand}`);
        const uriProcRoo = spawn([commandExecutor, openRooCommand], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        await uriProcRoo.exited;

        console.log(`  - Attempting to trigger command URI via '${commandExecutor}'...`);
        console.log(`  - URI: ${vsCodeCommandUri}`);
        const uriProc = spawn([commandExecutor, vsCodeCommandUri], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        const uriExitCode = await uriProc.exited;
        const errOutput = await new Response(uriProc.stderr).text();

        if (uriExitCode !== 0) {
            console.error(`Error: Failed to execute '${commandExecutor}' command for the VS Code URI.`);
            console.error(`Exit code: ${uriExitCode}`);
            if (errOutput) console.error(`Stderr: ${errOutput.trim()}`);
            console.error(`Please ensure VS Code is installed and the 'vscode://' protocol handler is working.`);
            console.error(`You might need to manually trigger the Cline task in the new window/directory: ${projectDirPath}`);
        } else {
            console.log(`  - Command URI triggered successfully via '${commandExecutor}'. Check VS Code.`);
        }

        console.log('\nScript finished successfully.');

    } catch (error: any) {
        console.error(`Error during processing: ${error.message}`);
        process.exit(1); // Use global process provided by Bun
    }
}

// --- Script Execution ---
// Use global process provided by Bun
if (!process.env.BUN_RUNTIME_VERSION) {
    console.warn("Warning: Script might not work as expected. Please run using 'bun run/build_idea.ts ...'");
}

// Use global process provided by Bun
if (process.argv.length < 3) {
    console.error('Usage: bun run/build_idea.ts <path_to_spec_file.txt>');
    process.exit(1); // Use global process provided by Bun
}

// Use global process provided by Bun
const specFilePathArg = process.argv[2];
processAppIdea(specFilePathArg);
