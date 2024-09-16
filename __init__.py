# Copyright 2024 Daxton Caylor
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

"""
@author: Daxton Caylor
@title: ComfyUI-TG
@nickname: ComfyUI-TG
@description: This node enables someone to run comfyui in telegram.
"""

import os, platform, json
from .classes.NodeInstaller import NodeInstaller
from .classes.NodeScriptRunner import NodeScriptRunner
from .classes.TG_ImageSaver import N_CLASS_MAPPINGS as TG_ImageSaverMappins, N_DISPLAY_NAME_MAPPINGS as TG_ImageSaverNameMappings
from .config import *

import folder_paths

if NODE_JS_ACTIVE:

    print("=============================================================================================================")

    canRunScripts = 0
    nodeInstaller = NodeInstaller(NODE_JS_INSTALLER_URL)
    nodeScriptRunner = NodeScriptRunner()

    DATA_FOLDER = './Telegram'
    INPUT_FOLDER = folder_paths.get_input_directory()
    CONFIG_FILE = os.path.join(DATA_FOLDER, 'telegram.json')

    NODE_JS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), NODE_JS_FOLDER)

    PD = os.path.abspath(DATA_FOLDER)
    CI = os.path.abspath(INPUT_FOLDER)

    if not os.path.exists(DATA_FOLDER):
        os.makedirs(DATA_FOLDER)

    if not os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'w') as f:
            config_data = {
                "BOT_TOKEN":"bot_token"
            }
            json.dump(config_data, f, indent=4)
    
    updates = {
        "scripts" : {
            "production": f"node app.js --pd={PD} --ci={CI}"
        }
    }

    edit_package_json(os.path.join(NODE_JS_FOLDER,'project','package.json'),updates)
    
    if platform.system() == "Windows":
        if nodeInstaller.check_for_node_js() is not True:
            print("[COMFYUI_TG] --> DOWNLOADING NODEJS")
            nodeInstaller.download_nodejs()
            print("[COMFYUI_TG] --> INSTALLING NODEJS")
            nodeInstaller.install_nodejs()
        else: 
            print("[COMFYUI_TG] --> NODEJS WAS FOUND IN YOUR OS")
        
        canRunScripts = 1
    else:
        if nodeInstaller.check_for_node_js() is not True:
            print("[COMFYUI_TG] --> NODEJS WAS NOT FOUND IN YOUR OS PLEASE INSTALL NODEJS TO RUN THIS NODE CORRECTLY")
        else: 
            canRunScripts = 1

    if canRunScripts:
        projects = nodeInstaller.get_dependencies_and_production_scripts(NODE_JS_FOLDER)

        for project_name, project_info in projects.items():

            dependencies = project_info['dependencies']
            packages = []
            if dependencies:
                print(f"[COMFYUI_TG] --> Dependencies for project '{project_name}':")
                for dependency, version in dependencies.items():
                    version = version.replace('^', '@')
                    # nodeInstaller.install_npm_package(f"{dependency}@{version}")
                    packages.append(dependency)
                    print(f"{dependency}: {version}")
            else:
                print(f"[COMFYUI_TG] --> No dependencies found for project '{project_name}'")
            
            nodeInstaller.install_all_packages(packages)

            production = project_info['production']
            if production:
                print(f"[COMFYUI_TG] --> Script for project '{project_name}':")
                nodeScriptRunner.add(os.path.join(NODE_JS_FOLDER, project_name),production.split())
            else:
                print(f"[COMFYUI_TG] --> No scripts found for project '{project_name}'")

        nodeScriptRunner.run()
        
    else:
        print("[COMFYUI_TG] --> CONTACT DEVELOPER FOR ASSISTANCE")

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

NODE_CLASS_MAPPINGS.update(TG_ImageSaverMappins)
NODE_DISPLAY_NAME_MAPPINGS.update(TG_ImageSaverNameMappings)

WEB_DIRECTORY = "./web"