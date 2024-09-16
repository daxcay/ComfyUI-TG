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
	CONFIG.TG.sendMessage(message.chat.id, text, {
		reply_parameters: { message_id: message.message_id },
	});
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
			let file_path = path.join(image.subfolder, image.filename);
			botMediaMessage(message, "Here is your image", file_path);
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
			let status = res[id].status;
			if (status.completed && status.status_str === "success") {
				let nodeid = getNodeID(CONFIG.PROMPT.NODES[user], "TG_ImageSaver");
				if (nodeid != -1) {
					let images = res[id].outputs[nodeid].images || [];
					sendResultToUser(message, images);
				}
			} else {
				botTextMessagReply(message, "Workflow failed/interrupted to generate result. Please try again!");
			}
		} else {
			setTimeout(watch, 1000, message, data);
		}
	} catch (error) {
		botTextMessagReply(message, "Workflow failed/interrupted to generate result. Please try again!");
	}
}

function setCommand(message, origin) {

	try {

		const text = message.text;

		let sliced = text.split(" ");
		let command = sliced[0];

		let user = message.from.id + "";

		switch (command) {
			case "/c":
			case "/start":
				botTextMessagReply(message, allCommands());
				break;
			case "/wfs":
				CONFIG.MODELS[user] = readModels(CONFIG.WORKFLOWS_DIRECTORY);
				let models = formatModelObject(CONFIG.MODELS[user]);
				botTextMessagReply(
					message,
					"Here are your workflows:\n\n" +
					"ID | Model Name\n\n" +
					models +
					"\n\nTo select workfloe write /wf id"
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
						`Workflow ${CONFIG.PROMPT.MODEL[user]} selected!`
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
						"\n\nTo get the datail of a particular node write /wn id"
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
				if (mode == 2) {
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
		CONFIG.TG.on("photo", async (msg) => {
			try {
				// console.log(msg)
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
		CONFIG.TG.on("message", (msg) => {
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
		const filename = data.name;
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
		const filePath = path.join(CONFIG.WORKFLOWS_DIRECTORY, name + ".json");
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

	CONFIG.EXPRESS.listen(CONFIG.PORT, () => {
		console.log(`Server running at http://localhost:${CONFIG.PORT}`);
	});
}
