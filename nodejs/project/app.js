const path = require("path");
const express = require("express");
const args = process.argv.slice(2);
const fs = require("fs");
const fsp = require("fs/promises");

const TelegramBot = require("node-telegram-bot-api");

let CONFIG = {
	PORT: 4001,
	TOKEN: "",
	WORKFLOWS_DIRECTORY: path.join(__dirname, "workflows"),
	TEMP_DIRECTORY: path.join(__dirname, "temp"),
	INPUT_DIRECTORY: path.join(__dirname, "temp"),
	OUTPUT_DIRECTORY: path.join(__dirname, "output"),
	WEB_DIRECTORY: path.join(__dirname, "website"),
	API_URL: "http://127.0.0.1:8188",
	ADMIN: null,
	EXPRESS: express(),
	TG: null,
	READY: false,
	SEED_CHANGE: 1,
	MODELS: {},
	PROMPT: {
		MODEL: {},
		NODES: {},
	},
	WATCHER: {},
	EASY: {}, // easy mode state per user: { last, width, height, busy }
};

const deleteContentsInsideDirectory = async (dirPath) => {
	try {
		const files = await fsp.readdir(dirPath);
		await Promise.all(
			files.map(async (file) => {
				const filePath = path.join(dirPath, file);
				const stats = await fsp.stat(filePath);
				if (stats.isDirectory()) {
					await deleteContentsInsideDirectory(filePath);
					await fsp.rmdir(filePath);
				} else {
					await fsp.unlink(filePath);
				}
			})
		);

		console.log(`Successfully deleted contents inside ${dirPath}`);
	} catch (error) {
		console.error(`Error deleting contents inside ${dirPath}:`, error);
		throw error;
	}
};

function readJsonFile(filePath) {
	try {
		const data = fs.readFileSync(filePath, "utf8");
		const jsonData = JSON.parse(data);
		return jsonData;
	} catch (err) {
		console.error(`Error reading or parsing file: ${err}`);
		return null;
	}
}

function addDirectories() {
	CONFIG.WORKFLOWS_DIRECTORY = path.join(CONFIG.MAIN_DIRECTORY, "workflows");
	CONFIG.TEMP_DIRECTORY = path.join(CONFIG.MAIN_DIRECTORY, "temp");
	CONFIG.OUTPUT_DIRECTORY = path.join(CONFIG.MAIN_DIRECTORY, "output");
	TG_CONFIG = readJsonFile(path.join(CONFIG.MAIN_DIRECTORY, "telegram.json"));
	CONFIG.TOKEN = TG_CONFIG.BOT_TOKEN;
	CONFIG.API_URL = TG_CONFIG.COMFY_URL;
	// Allowlist: only these Telegram user ids may use the bot (fail closed if empty or missing)
	CONFIG.ALLOWED_USER_IDS = (TG_CONFIG.ALLOWED_USER_IDS || []).map(String);
	CONFIG.EASY_SETTINGS = loadEasySettings(TG_CONFIG);
}

// Easy-mode settings from telegram.json; built-in defaults apply when a key is absent.
// The default prefix and negative are tuned for Pony-style SDXL models.
function loadEasySettings(cfg) {
	cfg = cfg || {};
	const has = (k) => Object.prototype.hasOwnProperty.call(cfg, k) && cfg[k] !== null;
	const steps = parseInt(cfg.EASY_STEPS, 10);
	const index = parseInt(cfg.EASY_WORKFLOW_INDEX, 10);
	return {
		enabled: !(cfg.EASY_MODE === false || String(cfg.EASY_MODE).toLowerCase() === "false"),
		workflowIndex: Number.isInteger(index) && index >= 0 ? index : 0,
		prefix: has("EASY_PROMPT_PREFIX") ? String(cfg.EASY_PROMPT_PREFIX) : "score_9, score_8_up, score_7_up, ",
		negative: has("EASY_NEGATIVE") ? String(cfg.EASY_NEGATIVE) : "score_4, score_5, score_6, blurry, lowres, bad anatomy, extra limbs, deformed hands, text, watermark, signature",
		steps: Number.isInteger(steps) && steps > 0 ? steps : 25,
	};
}

function easySettings() {
	if (!CONFIG.EASY_SETTINGS) CONFIG.EASY_SETTINGS = loadEasySettings(TG_CONFIG);
	return CONFIG.EASY_SETTINGS;
}

// Silently drop anything not from an allowlisted user in a private chat
function isAllowed(msg) {
	try {
		const ok = !!(msg && msg.from && msg.chat && msg.chat.type === "private" &&
			(CONFIG.ALLOWED_USER_IDS || []).includes(String(msg.from.id)) &&
			String(msg.chat.id) === String(msg.from.id));
		if (!ok) console.log("[COMFY_TG] dropped update from id", msg && msg.from && msg.from.id, "chat type", msg && msg.chat && msg.chat.type);
		return ok;
	} catch (e) { return false; }
}

args.forEach((arg) => {
	const [key, value] = arg.split("=");
	if (key === "--mode") {
		CONFIG.MODE = parseInt(value);
	} else if (key === "--admin") {
		CONFIG.ADMIN = `${value}@c.us`;
	} else if (key === "--api") {
		CONFIG.API_URL = value;
	} else if (key === "--pd") {
		CONFIG.MAIN_DIRECTORY = value;
		addDirectories();
	} else if (key === "--ci") {
		CONFIG.INPUT_DIRECTORY = value;
	}
});

function createDirectories(config) {
	for (let key in config) {
		if (key.endsWith("_DIRECTORY")) {
			const dir = config[key];
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
				console.log(`Directory created: ${dir}`);
			} else {
				console.log(`Directory already exists: ${dir}`);
			}
		}
	}
}

function botMediaMessage(message, caption, path) {
	try {
		path = fs.readFileSync(path)
		CONFIG.TG.sendPhoto(message.chat.id, path, {
			caption: caption,
			reply_parameters: { message_id: message.message_id },
		});
	} catch (error) {
		console.log("Media File Read Error")
	}
}

function botTextMessagReply(message, text) {
	CONFIG.TG.sendMessage(message.chat.id, text, message.message_id ? {
		reply_parameters: { message_id: message.message_id },
	} : {});
}

function allCommands() {
	let rules = "";
	rules += "Write /wfs to get a numbered list of uploaded workflows.\n\n";
	rules += "Write /wf id to select the workflow.\n\n";
	rules += "Write /wns to get numbered list of selected workflow nodes.\n\n";
	rules += "Write /wn id to get numbered list of inputs available.\n\n";
	rules += "Write /s node_id input_id value to set value for input selected.\n\n";
	rules += "Write /sce enable auto ksampler seed change.\n\n";
	rules += "Write /scd disable auto ksampler seed change.\n\n";
	rules += "Write /r to reset all to default settings.\n\n";
	rules += "Write /q to queue.\n\n";
	rules += "Write /i to interrupt queue.\n\n";
	return rules;
}

function readModels(folderPath) {
	return fs.readdirSync(folderPath);
}

function formatModelObject(models) {
	return Object.entries(models)
		.map(([key, value]) => `${key} | ${value}`)
		.join("\n");
}

function containsIndex(arr, index) {
	return index >= 0 && index < arr.length && arr[index] !== undefined;
}

function containsValue(arr, value) {
	return arr.includes(value);
}

function containsValueAtIndex(arr, index, value) {
	return index >= 0 && index < arr.length && arr[index] === value;
}

function readJSONFile(file) {
	try {
		let file_path = path.join(CONFIG.WORKFLOWS_DIRECTORY, file);
		const data = fs.readFileSync(file_path, "utf8");
		const jsonData = JSON.parse(data);
		return jsonData;
	} catch (err) {
		console.error("Error reading file:", err);
		return null;
	}
}

function extractTitleFromModel(data) {
	const titles = {};
	if (data) {
		for (const key in data) {
			if (data.hasOwnProperty(key)) {
				titles[key] = data[key]._meta.title;
			}
		}
	}
	return titles;
}

function formatOutput(titles) {
	let output = "ID | Node Name\n";
	for (const key in titles) {
		if (titles.hasOwnProperty(key)) {
			output += `${key} | ${titles[key]}\n`;
		}
	}
	return output;
}

function formatInputsIgnoreArray(number, data) {
	const inputs = data[number].inputs;
	let formattedInputs = `ID | Input Name | Input Value\n`;
	let counter = 0;
	for (const inputName in inputs) {
		if (inputs.hasOwnProperty(inputName) && !Array.isArray(inputs[inputName])) {
			formattedInputs += `${counter++} | ${inputName} | ${inputs[inputName]}\n`;
		}
	}
	return formattedInputs.trim();
}

function containsSettings(number, setting_number, data) {
	if (data[number] && data[number].inputs) {
		const inputs = data[number].inputs;
		let counter = 0;
		for (const inputName in inputs) {
			if (inputs.hasOwnProperty(inputName) && !Array.isArray(inputs[inputName])) {
				if (counter == setting_number) {
					break;
				}
				counter++;
			}
		}
		return counter == setting_number;
	}
}

function getSettingName(number, setting_number, data) {
	if (data[number] && data[number].inputs) {
		const inputs = data[number].inputs;
		let counter = 0;
		let name = "";
		for (const inputName in inputs) {
			if (inputs.hasOwnProperty(inputName) && !Array.isArray(inputs[inputName])) {
				if (counter == setting_number) {
					name = inputName;
					break;
				}
				counter++;
			}
		}
		return name;
	}
}

function editInputs(jsonObj, title, inputName, value) {
	for (let key in jsonObj) {
		if (jsonObj[key]._meta && jsonObj[key]._meta.title === title) {
			if (jsonObj[key].inputs) {
				jsonObj[key].inputs[inputName] = value;
			} else {
				jsonObj[key].inputs = { [inputName]: value };
			}
			return;
		}
	}
}

function getNodeID(jsonObj, title) {
	let id = -1;
	for (let key in jsonObj) {
		if (jsonObj[key]._meta && jsonObj[key]._meta.title === title) {
			id = key;
			break;
		}
	}
	return id;
}

function editJSON(number, inputName, inputValue, data) {
	if (data[number] && data[number].inputs) {
		const existingValue = data[number].inputs[inputName];
		if (existingValue !== undefined) {
			const existingValueType = typeof existingValue;
			let convertedValue;
			if (existingValueType === "number" && Number.isInteger(existingValue)) {
				convertedValue = parseInt(inputValue);
			} else if (existingValueType === "number" && !Number.isInteger(existingValue)) {
				convertedValue = parseFloat(inputValue);
			} else if (existingValueType === "boolean") {
				convertedValue = inputValue.toLowerCase() === "true";
			} else {
				convertedValue = inputValue;
			}
			data[number].inputs[inputName] = convertedValue;
			return data;
		} else {
			console.log("Invalid input name.");
			return null;
		}
	} else {
		console.log("Invalid number.");
		return null;
	}
}

async function sendResultToUser(message, images) {
	if (images.length > 0) {
		images.forEach(async (image) => {
			// Fetch the image over the local ComfyUI API instead of reading the filesystem
			try {
				const q = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || "", type: image.type || "output" });
				const r = await fetch(`${CONFIG.API_URL}/view?${q}`);
				const buf = Buffer.from(await r.arrayBuffer());
				const opts = { caption: message._caption || "Here is your image" }; // easy mode captions the image with the idea
				if (message.message_id) opts.reply_parameters = { message_id: message.message_id };
				await CONFIG.TG.sendPhoto(message.chat.id, buf, opts, { filename: image.filename, contentType: "image/png" });
				console.log("[COMFY_TG] image sent", image.filename);
			} catch (e) { console.log("[COMFY_TG] send image failed", e && e.message); }
		});
	}
}

async function watch(message, data) {
	try {
		let user = message.from.id + "";

		if (!CONFIG.WATCHER[user]) {
			CONFIG.WATCHER[user] = {
				count: 0,
			};
		}

		let id = data.prompt_id;
		let res = await fetch(`${CONFIG.API_URL}/history/${id}`).then((response) =>
			response.json()
		);

		if (res && res[id]) {
			if (message._done) message._done(); // easy mode: render finished, release the busy guard
			let status = res[id].status;
			if (status.completed && status.status_str === "success") {
				let nodeid = getNodeID(CONFIG.PROMPT.NODES[user], "TG_ImageSaver");
				// Fall back to the first stock SaveImage node when no TG_ImageSaver is present
				if (nodeid == -1) {
					for (const k in CONFIG.PROMPT.NODES[user]) {
						if (CONFIG.PROMPT.NODES[user][k].class_type === "SaveImage") { nodeid = k; break; }
					}
				}
				if (nodeid != -1) {
					let images = (res[id].outputs[nodeid] || {}).images || [];
					sendResultToUser(message, images);
				}
			} else {
				botTextMessagReply(message, "Workflow failed/interrupted to generate result. Please try again!");
			}
		} else {
			setTimeout(watch, 1000, message, data);
		}
	} catch (error) {
		if (message._done) message._done();
		botTextMessagReply(message, "Workflow failed/interrupted to generate result. Please try again!");
	}
}

// ================================== EASY MODE =====================================
// Plain text (anything not starting with "/") is used as the prompt.
// The easy-mode workflow must have nodes 3 (positive CLIPTextEncode), 4 (negative CLIPTextEncode),
// 5 (EmptyLatentImage) and 6 (KSampler).
// Prefix, negative, steps, workflow index and the on/off switch come from easySettings().
const EASY_SIZES = { tall: [832, 1216], wide: [1216, 832] };

function easyHelp() {
	return "Just type what you want to see, e.g. a diver over a coral reef with clownfish. The picture comes back in about a minute.\n" +
		"/again: same idea, new variation.\n" +
		"/wide or /tall: landscape or portrait for the next pictures (portrait is the default).\n" +
		"/stop: cancel the picture that is being made.\n" +
		"Power commands (/wf, /s, /q) still work; /c lists them.";
}

function easyState(user) {
	if (!CONFIG.EASY[user]) CONFIG.EASY[user] = { last: null, width: EASY_SIZES.tall[0], height: EASY_SIZES.tall[1], busy: false };
	return CONFIG.EASY[user];
}

function easyHasNodes(nodes) {
	return !!(nodes && nodes["3"] && nodes["4"] && nodes["5"] && nodes["6"] &&
		nodes["3"].class_type === "CLIPTextEncode" && nodes["4"].class_type === "CLIPTextEncode" &&
		nodes["5"].class_type === "EmptyLatentImage" && nodes["6"].class_type === "KSampler");
}

async function comfyBusy() {
	try {
		const q = await fetch(CONFIG.API_URL + "/queue").then((r) => r.json());
		return ((q.queue_running || []).length + (q.queue_pending || []).length) > 0;
	} catch (e) { return false; }
}

async function easyRender(message, idea) {
	if (!isAllowed(message)) return; // allowlist in front of easy mode too
	if (!easySettings().enabled) return;
	const user = message.from.id + "";
	const st = easyState(user);
	idea = String(idea || "").trim();
	if (!idea) { botTextMessagReply(message, "Type an idea first, e.g. a turtle swimming over a reef."); return; }
	if (st.busy || await comfyBusy()) {
		botTextMessagReply(message, "Still making the last picture. Wait for it to land, or send /stop to cancel it.");
		return;
	}
	st.busy = true;
	const release = () => { st.busy = false; clearTimeout(st.timer); };
	st.timer = setTimeout(release, 5 * 60 * 1000); // safety: never stay stuck
	try {
		// auto-select the easy-mode workflow if nothing usable is selected
		if (!CONFIG.PROMPT.MODEL[user] || !easyHasNodes(CONFIG.PROMPT.NODES[user])) {
			CONFIG.MODELS[user] = readModels(CONFIG.WORKFLOWS_DIRECTORY);
			CONFIG.PROMPT.MODEL[user] = CONFIG.MODELS[user][easySettings().workflowIndex];
			CONFIG.PROMPT.NODES[user] = readJSONFile(CONFIG.PROMPT.MODEL[user]);
		}
		const nodes = CONFIG.PROMPT.NODES[user];
		if (!easyHasNodes(nodes)) throw new Error("easy-mode workflow does not have the expected node layout");
		const es = easySettings();
		// skip the prefix when the idea already starts with its first tag
		const firstTag = es.prefix.split(",")[0].trim().toLowerCase();
		const pos = (!firstTag || idea.toLowerCase().startsWith(firstTag)) ? idea : es.prefix + idea;
		nodes["3"].inputs.text = pos;
		nodes["4"].inputs.text = es.negative;
		nodes["5"].inputs.width = st.width;
		nodes["5"].inputs.height = st.height;
		nodes["5"].inputs.batch_size = 1;
		nodes["6"].inputs.seed = Math.floor(Math.random() * 1e15);
		nodes["6"].inputs.steps = es.steps;
		st.last = idea;
		const r = await fetch(CONFIG.API_URL + "/prompt", {
			method: "POST", headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ prompt: nodes }),
		});
		const data = await r.json();
		if (!data || !data.prompt_id) throw new Error("ComfyUI did not accept the prompt: " + JSON.stringify(data).slice(0, 300));
		botTextMessagReply(message, "Making it\u2026 about a minute.");
		if (!message._caption) message._caption = idea.length > 900 ? idea.slice(0, 900) + "\u2026" : idea;
		message._done = release;
		watch(message, data);
	} catch (e) {
		release();
		console.log("[COMFY_TG] easy render failed", e && e.message);
		botTextMessagReply(message, "Sorry, that one failed to start. Try again in a moment.");
	}
}

function easySetSize(message, which) {
	const st = easyState(message.from.id + "");
	[st.width, st.height] = EASY_SIZES[which];
	botTextMessagReply(message, which === "wide"
		? "Wide (landscape) from now on. Type an idea, or /again."
		: "Tall (portrait) from now on. Type an idea, or /again.");
}

function setCommand(message, origin) {
	if (!isAllowed(message)) return; // defence in depth: re-check the allowlist

	try {

		const text = message.text;

		console.log("From:", (message.from.username || message.from.first_name || "User") ,"Command:", text, "Type:", origin)

		let sliced = text.split(" ");
		let command = sliced[0].replace(/@\w+$/, ""); // accept /cmd@botname

		let user = message.from.id + "";

		// EASY_MODE off: /start shows the classic command list and the easy commands are not recognised
		if (!easySettings().enabled) {
			if (command === "/start") command = "/c";
			else if (["/help", "/again", "/wide", "/tall", "/stop"].includes(command)) command = "";
		}

		switch (command) {
			case "/c":
				botTextMessagReply(message, allCommands());
				break;
			// easy mode commands
			case "/start":
			case "/help":
				botTextMessagReply(message, easyHelp());
				break;
			case "/again": {
				const st = easyState(user);
				if (!st.last) botTextMessagReply(message, "Nothing to repeat yet. Type an idea first.");
				else easyRender(message, st.last);
				break;
			}
			case "/wide":
				easySetSize(message, "wide");
				break;
			case "/tall":
				easySetSize(message, "tall");
				break;
			case "/wfs":
				CONFIG.MODELS[user] = readModels(CONFIG.WORKFLOWS_DIRECTORY);
				let models = formatModelObject(CONFIG.MODELS[user]);
				botTextMessagReply(
					message,
					"Here are your workflows:\n\n" +
					"ID | Model Name\n\n" +
					models +
					"\n\nTo select workflow write /wf id"
				);
				break;
			case "/wf":
				if (!CONFIG.MODELS[user]) {
					CONFIG.MODELS[user] = readModels(CONFIG.WORKFLOWS_DIRECTORY);
				}
				let index = parseInt(sliced[1]);
				if (!containsIndex(CONFIG.MODELS[user], index)) {
					botTextMessagReply(message, "Workflows does not exists!");
				} else {
					CONFIG.PROMPT.MODEL[user] = CONFIG.MODELS[user][index];
					if (!CONFIG.PROMPT.NODES[user]) {
						CONFIG.PROMPT.NODES[user] = readJSONFile(CONFIG.PROMPT.MODEL[user]);
					}
					botTextMessagReply(
						message,
						`Workflow ${CONFIG.PROMPT.MODEL[user]} selected!`+
						"\n\nTo get the detail of all nodes write /wns"
					);
				}
				break;
			case "/wns":
				if (!CONFIG.MODELS[user]) {
					botTextMessagReply(message, "Workflow not selected!");
				} else {
					CONFIG.PROMPT.NODES[user] = readJSONFile(CONFIG.PROMPT.MODEL[user]);
					let nodes = formatOutput(
						extractTitleFromModel(CONFIG.PROMPT.NODES[user])
					);
					botTextMessagReply(
						message,
						"Here are your workflow nodes:\n\n" +
						nodes +
						"\n\nTo get the datail of a particular node write /wn node_id"
					);
				}
				break;
			case "/wn":
				if (!CONFIG.MODELS[user]) {
					botTextMessagReply(message, "Workflow not selected!");
				} else {
					if (!CONFIG.PROMPT.NODES[user]) {
						CONFIG.PROMPT.NODES[user] = readJSONFile(CONFIG.PROMPT.MODEL[user]);
					}
					let index = sliced[1];
					if (!containsValue(Object.keys(CONFIG.PROMPT.NODES[user]), index)) {
						botTextMessagReply(message, "Node does not exists!");
					} else {
						let nodes = formatInputsIgnoreArray(index, CONFIG.PROMPT.NODES[user]);
						botTextMessagReply(
							message,
							"Here are your node inputs:\n\n" +
							nodes +
							"\n\nTo edit a particular input write /s wns_id wn_id value"
						);
					}
				}
				break;
			case "/sce":
				CONFIG.SEED_CHANGE = 1;
				botTextMessagReply(message, `Seed Change: Enabled`);
				break;
			case "/scd":
				CONFIG.SEED_CHANGE = 0;
				botTextMessagReply(message, `Seed Change: Disabled`);
				break;
			case "/s":
				if (!CONFIG.MODELS[user]) {
					botTextMessagReply(message, "Workflow not selected!");
				} else {
					if (!CONFIG.PROMPT.NODES[user]) {
						CONFIG.PROMPT.NODES[user] = readJSONFile(CONFIG.PROMPT.MODEL[user]);
					}

					let node_number = sliced[1];
					let setting_number = sliced[2];
					let value = sliced[3];

					if (sliced.length > 4) {
						for (let index = 4; index < sliced.length; index++) {
							const element = sliced[index];
							value += " " + element;
						}
					}

					if (!containsValue(Object.keys(CONFIG.PROMPT.NODES[user]), node_number)) {
						botTextMessagReply(message, "Node does not exists.");
					} else if (!containsSettings(node_number, setting_number, CONFIG.PROMPT.NODES[user])) {
						botTextMessagReply(message, "Node setting does not exists.");
					} else {
						let setting_name = getSettingName(
							node_number,
							setting_number,
							CONFIG.PROMPT.NODES[user]
						);
						if (origin == "text") {
							editJSON(node_number, setting_name, value, CONFIG.PROMPT.NODES[user]);
						}
						else if (origin == "photo") {
							if (message.image) {
								editJSON(node_number, setting_name, message.image, CONFIG.PROMPT.NODES[user]);
							} else {
								botTextMessagReply(message, "Error with the uploded image try again!.");
							}
						}
						let nodes = formatInputsIgnoreArray(
							node_number,
							CONFIG.PROMPT.NODES[user]
						);
						botTextMessagReply(message, "Node setting changed.\n\n" + nodes);
					}
				}
				break;
			case "/r":
				CONFIG.MODELS[user] = null;
				CONFIG.PROMPT.MODEL[user] = null;
				CONFIG.PROMPT.NODES[user] = null;
				botTextMessagReply(message, "Reset Done.\n");
				break;
			case "/q":
				try {
					if (CONFIG.SEED_CHANGE) {
						editInputs(CONFIG.PROMPT.NODES[user], "KSampler", "seed", Date.now());
						editInputs(CONFIG.PROMPT.NODES[user], "RandomNoise", "noise_seed", Date.now());
					}
					editInputs(
						CONFIG.PROMPT.NODES[user],
						"TG_ImageSaver",
						"Path",
						path.join(CONFIG.OUTPUT_DIRECTORY, user)
					);
					let requestOptions = {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({ prompt: CONFIG.PROMPT.NODES[user] })
					};
					fetch(CONFIG.API_URL + "/prompt", requestOptions)
						.then((response) => response.json())
						.then((data) => {
							botTextMessagReply(message, "Promt Submitted.\n");
							watch(message, data);
						})
						.catch((error) => console.error("Error:", error));

				} catch (error) {
					console.log()
					console.log(error)
				}
				break;
			case "/stop": // easy alias for /i
			case "/i":
				fetch(CONFIG.API_URL + "/interrupt", {
					method: "POST",
				})
					.then((data) => {
						botTextMessagReply(message, "Promt Interrupted.\n\n");
					})
					.catch((error) => console.error("Error:", error));
				break;
			default:
				// plain text (no leading "/") is an easy-mode prompt
				if (easySettings().enabled && origin == "text" && !text.trim().startsWith("/")) {
					easyRender(message, text);
					break;
				}
				if (typeof mode !== "undefined" && mode == 2) {
					botTextMessagReply(message, `Invalid command. Message /c`);
				}
				break;
		}
	} catch (error) {
		console.log(error)
	}
}

//==================================== TG ======================================================

if (CONFIG.TOKEN != "bot_token") {
	try {
		console.log("[COMFY_TG]: Telegram bot is live!");
		CONFIG.READY = true;
		CONFIG.TG = new TelegramBot(CONFIG.TOKEN, { polling: true });
		// short command menu for easy mode
		if (easySettings().enabled) CONFIG.TG.setMyCommands([
			{ command: "help", description: "How to use: just type an idea" },
			{ command: "again", description: "Same idea, new variation" },
			{ command: "wide", description: "Landscape pictures (1216x832)" },
			{ command: "tall", description: "Portrait pictures (832x1216, default)" },
			{ command: "stop", description: "Cancel the picture being made" },
		]).then(() => console.log("[COMFY_TG] command menu set")).catch((e) => console.log("[COMFY_TG] setMyCommands failed", e && e.message));
		CONFIG.TG.on("photo", async (msg) => {
			if (!isAllowed(msg)) return; // check before downloading anything
			try {
				if (msg.photo && msg.photo.length > 0) {
					let photoId = msg.photo[msg.photo.length - 1].file_id
					let command = msg.caption
					let photoPath = await CONFIG.TG.downloadFile(photoId, CONFIG.INPUT_DIRECTORY)
					msg.text = command
					msg.image = path.basename(photoPath)
					setCommand(msg, "photo");
				}
			} catch (error) {
				console.log(error)
			}
		});
		CONFIG.TG.on("text", (msg) => {
			if (!isAllowed(msg)) return;
			setCommand(msg, "text");
		});
	} catch (error) {
		CONFIG.READY = false;
	}
}

// =================================== EXPRESS ========================================

CONFIG.EXPRESS.use(express.static(CONFIG.WEB_DIRECTORY));
CONFIG.EXPRESS.use(express.json());

CONFIG.EXPRESS.get("/ready", (req, res) => {
	return res.json({ ready: CONFIG.READY });
});

CONFIG.EXPRESS.post("/workflows", async (req, res) => {
	try {
		const data = req.body;
		const filename = path.basename(String(data.name)); // strip directories to prevent path traversal
		const filePath = path.join(CONFIG.WORKFLOWS_DIRECTORY, filename);
		await fsp.mkdir(CONFIG.WORKFLOWS_DIRECTORY, { recursive: true });
		await fsp.writeFile(filePath, JSON.stringify(data.data, null, 2), "utf8");
		res
			.status(200)
			.json({ success: true, message: "Model data saved successfully" });
	} catch (error) {
		console.error("Error saving model data:", error);
		res
			.status(500)
			.json({ success: false, message: "Failed to save model data" });
	}
});

CONFIG.EXPRESS.get("/workflows", async (req, res) => {
	try {
		const files = await fsp.readdir(CONFIG.WORKFLOWS_DIRECTORY);
		const models = await Promise.all(
			files.map(async (file) => {
				const filePath = path.join(CONFIG.WORKFLOWS_DIRECTORY, file);
				const stats = await fsp.stat(filePath);
				return {
					name: file.split(".")[0],
					dateCreated: stats.mtime.toISOString(),
				};
			})
		);
		res.status(200).json(models);
	} catch (error) {
		console.error("Error retrieving models:", error);
		res
			.status(500)
			.json({ success: false, message: "Failed to retrieve models" });
	}
});

CONFIG.EXPRESS.delete("/workflows/:name", async (req, res) => {
	try {
		const { name } = req.params;
		const filePath = path.join(CONFIG.WORKFLOWS_DIRECTORY, path.basename(String(name)) + ".json"); // prevent path traversal
		await fsp.unlink(filePath);
		res
			.status(200)
			.json({ success: true, message: "Model deleted successfully" });
	} catch (error) {
		console.error("Error deleting model:", error);
		res.status(500).json({ success: false, message: "Failed to delete model" });
	}
});

CONFIG.EXPRESS.get("/", (req, res) => {
	return res.sendFile(path.join(__dirname, "website", "index.html"));
});

//==============================================INIT============================

let ON = true;

if (ON) {
	createDirectories(CONFIG);

	CONFIG.EXPRESS.listen(CONFIG.PORT, "127.0.0.1", () => { // dashboard is reachable from localhost only
		console.log(`Server running at http://localhost:${CONFIG.PORT}`);
	});
}
