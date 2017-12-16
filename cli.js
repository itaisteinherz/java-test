#!/usr/bin/env node
"use strict";
const path = require("path");
const fs = require("fs");

const meow = require("meow");
const Listr = require("listr");
const execa = require("execa");
const tempy = require("tempy");
const pify = require("pify");
const diff = require("diff");
const chalk = require("chalk");

const FORMATTER_BIN_PATH = path.join(__dirname, "bin", "google-java-format-1.5-all-deps.jar");
const CHECKSTYLE_BIN_PATH = path.join(__dirname, "bin/checkstyle-8.5-all.jar");

const GOOGLE_CONFIG_PATH = path.join(__dirname, "checks", "google_checks.xml");
const SUN_CONFIG_PATH = path.join(__dirname, "checks", "sun_checks.xml");

const cli = meow(`
	Usage
	  $ java-test <file> [<tests> <tests_output>]

	Options
	  --fix      Automagically fix issues
	  --sun      Use the Sun CheckStyle config (Google's is used by default)

	Examples
	  $ java-test HelloWorld.java
	  $ java-test HelloWorld.java HelloWorldTests.java HelloWorldTests-output.java
`);

const fileToTest = resolvePathToFile(cli.input[0]);

const tempDir = tempy.directory();

const tasks = new Listr([
	{
		title: "Lint file with CheckStyle",
		task: async () => {
			const CONFIG_PATH = (cli.flags.s || cli.flags.sun) ? SUN_CONFIG_PATH : GOOGLE_CONFIG_PATH;

			const lintResult = await execa("java", ["-jar", CHECKSTYLE_BIN_PATH, "-c", CONFIG_PATH, fileToTest]);
			const lintOutput = lintResult.stdout;

			// TODO: Check if this is even necessary.
			if (/\[(WARN|ERROR)\]/g.test(lintOutput)) {
				throw new Error(lintOutput);
			}
		}
	},
	{
		title: "Format file with Google's source code formatter",
		enabled: () => cli.flags.fix === true,
		task: () => execa("java", ["-jar", FORMATTER_BIN_PATH, "-r", "-a", fileToTest])
	},
	{
		title: "Compile file and tests", // NOTE: Maybe the compilation of the file and the tests should be broken down to two seperate tasks instead of one.
		enabled: () => cli.input.length === 3,
		task: () => {
			const pathToTests = resolvePathToFile(cli.input[1]);

			const compileFileProcess = execa("javac", ["-d", tempDir, fileToTest]);
			const compileTestsProcess = execa("javac", ["-d", tempDir, pathToTests]);

			return Promise.all([compileFileProcess, compileTestsProcess]);
		}
	},
	{
		title: "Run tests and compare to given output",
		enabled: () => cli.input.length === 3,
		task: () => execa("java", ["-cp", tempDir, path.parse(cli.input[1]).name])
			.then(async result => {
				const pathToTestsOutput = resolvePathToFile(cli.input[2]);

				const output = result.stdout;
				const desiredOutput = await pify(fs.readFile)(pathToTestsOutput, {encoding: "utf8"});

				const outputDiff = diff.diffChars(desiredOutput, output);

				if (outputDiff.length > 1) {
					const differences = outputDiff
											.map(diffPart => {
												const color = diffPart.added ? "green" : (diffPart.removed ? "red" : "grey");
												return chalk[color](diffPart.value);
											})
											.join("");

					throw new Error(`Actual output is not identical to given output.\n\nDifferences:\n${differences}`);
				}
			})
	}
]);

tasks.run()
	.then(() => {
		console.log("\nAll tests ran successfully.");
	})
	.catch(err => {
		console.error(`\n${err}`);
	});

function resolvePathToFile(pathToFile) {
	return path.join(process.cwd(), pathToFile);
}
