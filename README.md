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
     - **Discord Server**: https://discord.gg/Z44Zjpurjp
    
  - ### Support
     - **Patreon**: https://patreon.com/daxtoncaylor
     - **Buy me a coffee**: https://buymeacoffee.com/daxtoncaylor

<br/>

# Disclaimer

This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Telegram or any of its subsidiaries or its affiliates. The official Telegram website can be found at https://telegram.org/. "Telegram" as well as related names, marks, emblems and images are registered trademarks of their respective owners. 

I have used `NodeJS` and 'Python` combined to make this project the library, I am using the following library in nodejs to enable telegram functionality. 

https://github.com/yagop/node-telegram-bot-api
