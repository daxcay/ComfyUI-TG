<a id="readme-top"></a>

<br />
<div align="center">
  <a href="https://github.com/daxcay/ComfyUI-TG">
    <img src="https://github.com/user-attachments/assets/c35f3c6f-9a8b-426f-9dc8-79c7b2e535d1" width="256px" height="128px">
  </a>

  <h3 align="center">ComfyUI in Telegram</h3>

  <p align="center">
    <a href="https://github.com/daxcay/ComfyUI-TG/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    ·
    <a href="https://github.com/daxcay/ComfyUI-TG/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/version-1.0.0-green" >
    <img src="https://img.shields.io/badge/last_update-Sept_2024-green" >
  </p>
  
</div>

# Security hardening (this fork)

This fork adds four security changes on top of upstream `beb0d8e`:

1. **Telegram user allowlist.** Only Telegram user ids listed in `ALLOWED_USER_IDS` in `telegram.json` can use the bot. Every other update is dropped silently.
2. **Private chats only.** Group and channel messages are ignored, even from allowlisted users. This replaces upstream's group-chat support.
3. **Dashboard is localhost-only.** The web dashboard binds to `127.0.0.1` and has no authentication. To reach it from another machine, use an SSH tunnel, for example `ssh -L 4001:127.0.0.1:4001 user@host`, and then open `http://localhost:4001`.
4. **Path traversal fixes and image delivery via the ComfyUI API.** Workflow names in `POST /workflows` and `DELETE /workflows/:name` are reduced to a bare file name. Result images are fetched through ComfyUI's `/view` endpoint. If a workflow has no `TG_ImageSaver` node, the first stock `SaveImage` node is used.

`ALLOWED_USER_IDS` is an array of numeric Telegram user ids:

```json
{
    "BOT_TOKEN": "bot_token",
    "COMFY_URL": "http://127.0.0.1:8188",
    "ALLOWED_USER_IDS": [123456789]
}
```

If the list is empty or missing, **nobody** can use the bot (it fails closed). The generated `telegram.json` template now ships with `"ALLOWED_USER_IDS": []`, so add your own id before you use the bot.

# About The Project

This project enables the use of ComfyUI Workflows in Telegram.

<br />

> [!IMPORTANT]
> This node works on **Bot** provided by **Telegram** so if you want to change Bot register New bot using **BotFather** and change **BOT_TOKEN** in `telegram.json` 

> [!IMPORTANT]
> Supports group chat. add bot to a group and any user can give commands of that group.

<br />

# Installation

  - ### Installing Using `comfy-cli`
    - `comfy node registry-install ComfyUI-TG`
    - https://registry.comfy.org/publishers/daxcay/nodes/comfyui-tg
  
  - ### Manual Method
    - Go to your `ComfyUI\custom_nodes` and Run CMD.
    - Copy and paste this command: `git clone https://github.com/daxcay/ComfyUI-TG.git`
  
  - ### Automatic Method with [Comfy Manager](https://github.com/ltdrdata/ComfyUI-Manager)
    - Inside ComfyUI > Click the Manager Button on the side.
    - Click `Custom Nodes Manager` and search for `ComfyUI-TG`, then install this node.

  - ### Node Installation
    - For someone facing automated node installation error or is not on windows os. 
    - Install lateset version of node js.
    - https://nodejs.org/en/download/package-manager
      
  > [!CAUTION]
  > Update to nodejs version v20.17.0 if you already have it. https://nodejs.org/dist/v20.17.0/node-v20.17.0-x64.msi

  
  <br>
  
  >[!IMPORTANT]
  > #### **Restart ComfyUI and Stop ComfyUI before proceeding to next step**

<br />

# Setup

## Enable Dev Mode

>[!IMPORTANT]
> #### **Enable dev mode and save workflow in `api` format to make it compatible.**

![download (1)](https://github.com/user-attachments/assets/15d6fda5-86af-4514-9884-32e7bb4cde84)

<br>

### Getting bot token from BotFather

![Untitled design (6)](https://github.com/user-attachments/assets/ea381db3-4d28-4535-9c87-490ff2af9df4)

### Location of Telegram folder

#### ComfyUI Folder
  - `Drive:/ComfyUI_windows_portable/Telegram`

#### Stable Matrix
   -  **Full Version**: `Drive:/StabilityMatrix/Packages/ComfyUI/Telegram`
   -  **Portable Version**: `Drive:/StabilityMatrix/Data/Packages/ComfyUI/Telegram`

From `ComfyUI/Telegram` folder open `telegram.json`

![image](https://github.com/user-attachments/assets/a30ca344-d07a-48a2-8f65-39b3a564d83b)

> [!IMPORTANT]
> Fill `BOT_TOKEN` and save it.

>[!IMPORTANT]
> #### **Start ComfyUI before proceeding to next step**

<br />

## Uploading WorkFlow

To upload a workflow to be used in in telegram use the `workflow` button in telegram dashboard.

>[!IMPORTANT]
> #### **Attach `TG-ImageSaver` Node before saving the workflow in api format**

![image](https://github.com/user-attachments/assets/2ae18c4b-dd0d-4385-b404-0c4c09a08e5a)

Now upload it in workflow section

![image](https://github.com/user-attachments/assets/d0cae95f-3dea-42d5-9948-69093486ab52)

<br />

# Easy mode

Easy mode is on by default in this fork. Any plain text message (one that does not start with `/`) from an allowlisted user becomes the prompt. The bot then:

- selects the easy-mode workflow (`EASY_WORKFLOW_INDEX`, default `0`) if no suitable workflow is selected,
- prefixes the text with `EASY_PROMPT_PREFIX`, unless the text already starts with the prefix's first tag,
- sets the negative prompt to `EASY_NEGATIVE`, picks a random seed and sets `EASY_STEPS` steps,
- queues it, replies "Making it… about a minute." and sends the image back captioned with your idea.

While a picture is being made, or anything else is queued in ComfyUI, new ideas get a "Still making the last picture" reply instead of being queued. The busy guard clears itself after 5 minutes.

The easy-mode workflow must be in API format with node `3` as the positive `CLIPTextEncode`, node `4` as the negative `CLIPTextEncode`, node `5` as the `EmptyLatentImage` and node `6` as the `KSampler`.

## Easy mode commands

These are also registered as the bot's command menu (`setMyCommands`) at startup. Commands sent as `/cmd@yourbot` are accepted too.

| Command | What it does |
|---|---|
| `/help` or `/start` | Short easy-mode help |
| `/again` | Same idea, new seed |
| `/wide` | Landscape (1216x832) for the next pictures |
| `/tall` | Portrait (832x1216) for the next pictures, the default |
| `/stop` | Cancel the current picture (same as `/i`) |

`/c` still lists the full command set below, and `/wf`, `/s`, `/q` and the rest are unchanged. Orientation and the last idea are kept in memory and reset when the bot restarts.

## Easy mode settings in `telegram.json`

Every key is optional. When a key is missing, the default shown is used.

| Key | Default | Meaning |
|---|---|---|
| `EASY_MODE` | `true` | Set to `false` to turn easy mode off. Plain text is then ignored, the easy commands are not recognised, `/start` shows the classic command list and no command menu is registered. |
| `EASY_WORKFLOW_INDEX` | `0` | Index (as listed by `/wfs`) of the workflow to use for easy mode |
| `EASY_PROMPT_PREFIX` | `"score_9, score_8_up, score_7_up, "` | Text put in front of every idea. Use `""` for no prefix. |
| `EASY_NEGATIVE` | `"score_4, score_5, score_6, blurry, lowres, bad anatomy, extra limbs, deformed hands, text, watermark, signature"` | Negative prompt |
| `EASY_STEPS` | `25` | Sampler steps |

The default prefix and negative are tuned for Pony-style SDXL models. Change them to suit your model.

# Telegram Commands

Writing **/c** or **/start** will also provide the list of all commands:

![image](https://github.com/user-attachments/assets/e1eae84a-e0f2-41a8-9389-144eb5afd8bd)

- Write **/wfs** to get a numbered list of uploaded workflows.

![image](https://github.com/user-attachments/assets/4227503e-df68-4692-8c10-d5fd2ace5754)

- Write **/wf id** to select the workflow.

![image](https://github.com/user-attachments/assets/d5c63d1c-98e1-422f-8986-e38dc86f6986)

- Write **/wns** to get numbered list of selected workflow nodes.

![image](https://github.com/user-attachments/assets/04577a8d-53a2-41f2-ab8f-92c409598ef0)

- Write **/wn id** to get numbered list of inputs available.

![image](https://github.com/user-attachments/assets/85b19d92-39ee-48c9-965d-27ffaed24b1d)

- Write **/s node_id input_id value** to set value for input selected.

![image](https://github.com/user-attachments/assets/e3e6de3f-792a-4b1c-8696-5ed4540a4c3f)

- Sending Image to Load Image

  https://github.com/user-attachments/assets/e3b1d267-11b6-46b8-8a80-8d2c4b9512c5
  
  - find node id of load image you want.
  - find input id of load image node (0 most of time could be other if using custom node )
  - attach image and in caption write `/s 25 0` and send like this
  - Once uploaded you can use it like `/s 25 0 {file}` as it reside in `Comfy/Input` folder.

<br>

- Write **/sce** enable auto ksampler seed change.

![image](https://github.com/user-attachments/assets/5792d046-ceb6-4923-aae9-bb3c9f7d83ff)

- Write **/scd** disable auto ksampler seed change.

![image](https://github.com/user-attachments/assets/f2e8209e-1dd7-4f3e-bd3d-fc30916789f5)

- Write **/q** to queue.

![image](https://github.com/user-attachments/assets/1fcd1e64-eb2b-4216-b958-b6ff820397f5)

- Write **/r** to reset all to default settings.

![image](https://github.com/user-attachments/assets/e615e2f1-cd4b-4f42-9572-e2f684542ff9)

- Write **/i** to interrupt queue.

![image](https://github.com/user-attachments/assets/d9710b51-c7b5-4750-8c96-47a3e040dacc)

<br/>

# Contact

### Daxton Caylor - ComfyUI Node Developer 

  - ### Contact
     - **Email** - daxtoncaylor+Github@gmail.com
     - **Discord Server**: https://discord.gg/UyGkJycvyW
    
  - ### Support
     - **Patreon**: https://patreon.com/daxtoncaylor
     - **Buy me a coffee**: https://buymeacoffee.com/daxtoncaylor

<br/>

# Disclaimer

This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Telegram or any of its subsidiaries or its affiliates. The official Telegram website can be found at https://telegram.org/. "Telegram" as well as related names, marks, emblems and images are registered trademarks of their respective owners. 

I have used `NodeJS` and 'Python` combined to make this project the library, I am using the following library in nodejs to enable telegram functionality. 

https://github.com/yagop/node-telegram-bot-api
