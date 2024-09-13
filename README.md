<a id="readme-top"></a>

<br />
<div align="center">
  <a href="https://github.com/daxcay/ComfyUI-TG">
    <img src="https://github.com/user-attachments/assets/c35f3c6f-9a8b-426f-9dc8-79c7b2e535d1" width="256px" height="128px">
  </a>

  <h3 align="center">Telegram in ComfyUI</h3>

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

# About The Project

This project enables the use of ComfyUI Workflows in Telegram.

<br />

> [!IMPORTANT]
> This node works on **Bot** provided by **Telegram** so if you want to change Bot register New bot using **BotFather** and change **BOT_TOKEN** in `telegram.json` 

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
    - For someone facing automated node installation error. 
    - Install lateset version of node js.
    - https://nodejs.org/en/download/package-manager
  
  <br>
  
  >[!IMPORTANT]
  > #### **Restart ComfyUI and Stop ComfyUI before proceeding to next step**

<br />

# Setup

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

![image](https://github.com/user-attachments/assets/42a54f56-8dcc-4831-9d20-1c24ede24b46)

Now upload it in workflow section

![image](https://github.com/user-attachments/assets/10d7a0e6-5279-4d4e-a580-2b1235229a78)

<br />

# Telegram Commands

Writing **/c** will also provide the list of all commands:

![image](https://github.com/user-attachments/assets/d6ffb055-6285-4648-8396-9aa4bd48091d)

- Write **/wfs** to get a numbered list of uploaded workflows.

![image](https://github.com/user-attachments/assets/f4bafaf7-35e9-4a52-a7a0-7f81544870d9)

- Write **/wf id** to select the workflow.

![image](https://github.com/user-attachments/assets/73fdd686-02d0-4eba-a871-0c8dcc6b403c)

- Write **/wns** to get numbered list of selected workflow nodes.

![image](https://github.com/user-attachments/assets/cebc3fc5-16c9-4257-ad05-01689e4a4861)

- Write **/wn id** to get numbered list of inputs available.

![image](https://github.com/user-attachments/assets/37201990-4e30-4485-a176-730f7e400df1)

- Write **/s node_id input_id value** to set value for input selected.

![image](https://github.com/user-attachments/assets/c5efac5f-fbfc-4b7a-aa2f-835d4a207c99)

- Write **/sce** enable auto ksampler seed change.

![image](https://github.com/user-attachments/assets/8a2975e4-9f5a-4e7b-81be-ac5cf90dd07a)

- Write **/scd** disable auto ksampler seed change.

![image](https://github.com/user-attachments/assets/965b293b-217a-4f52-90ee-7dcb4740f48d)

- Write **/r** to reset all to default settings.

![image](https://github.com/user-attachments/assets/0488b0c2-b42c-487c-b5ca-5330fcfed0d0)

- Write **/q** to queue.

![image](https://github.com/user-attachments/assets/d740d8c9-8e8c-4d5b-b8be-5251b6f2d3e7)

- Write **/i** to interrupt queue.

![image](https://github.com/user-attachments/assets/b6f25a49-1066-4c33-955a-90c652ff3aee)

- Write **/m number** to set bot usage mode. **1**: Single User, **2**: Multi User.'

![image](https://github.com/user-attachments/assets/09c8a252-2fc0-41be-84af-1fac38e74b36)

# Contact

### Daxton Caylor - ComfyUI Node Developer 

  - ### Contact
     - **Email** - daxtoncaylor+Github@gmail.com
     - **Discord Server**: https://discord.gg/Z44Zjpurjp
    
  - ### Support
     - **Patreon**: https://patreon.com/daxtoncaylor
     - **Buy me a coffee**: https://buymeacoffee.com/daxtoncaylor


# Disclaimer

This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Telegram or any of its subsidiaries or its affiliates. The official Telegram website can be found at https://telegram.org/. "Telegram" as well as related names, marks, emblems and images are registered trademarks of their respective owners. 

I have used `NodeJS` and 'Python` combined to make this project the library, I am using the following library in nodejs to enable telegram functionality. 

https://github.com/yagop/node-telegram-bot-api
