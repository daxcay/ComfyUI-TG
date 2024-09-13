class ComfyTG {
    constructor() {

        this.buttons = document.querySelectorAll(".menu .item");
        this.screens = document.querySelectorAll(".screen div");

        this.init();

        this.handleFiles = this.handleFiles.bind(this);
        this.deleteModel = this.deleteModel.bind(this);
        this.submitJsonToServer = this.submitJsonToServer.bind(this);

        const dropZone = document.getElementById('drop-zone');

        dropZone.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.add('hover');
        });

        dropZone.addEventListener('dragleave', (event) => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.remove('hover');
        });

        dropZone.addEventListener('drop', (event) => {
            event.preventDefault();
            event.stopPropagation();
            dropZone.classList.remove('hover');

            const files = event.dataTransfer.files;
            this.handleFiles(files);
        });

    }

    createElement(tag, styles = {}) {
        const element = document.createElement(tag);
        Object.assign(element.style, styles);
        return element;
    }

    async handleFiles(files) {
        files = Array.from(files);
        console.log(files)
        for (const file of files) {
            if (file.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const json = JSON.parse(e.target.result);
                        const cleanedName = file.name.split('.')[0].replace(/[^a-zA-Z0-9.]/g, '').replace(/\s+/g, '_').substr(0,16);
                        await this.submitJsonToServer(json, cleanedName+".json");
                        this.fetchModels()
                    } catch (err) {
                        console.error('Invalid JSON file:', err);
                    }
                };
                reader.readAsText(file);
            } else {
                alert('Please drop a JSON file.');
            }
        }
    }

    formatDateToDDMMYYYY(isoDateString) {
        const date = new Date(isoDateString);

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    }

    async fetchModels() {
        try {
            const response = await fetch('/workflows');
            if (!response.ok) throw new Error('Failed to fetch models');
            const models = await response.json();
            const tableBody = document.querySelector('#models-table tbody');
            tableBody.innerHTML = '';
            models.forEach(model => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${model.name}</td>
                    <td>${this.formatDateToDDMMYYYY(model.dateCreated)}</td>
                    <td>
                        <button class="delete-btn" data-name="${model.name}">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            this.addDeleteEventListeners();
        } catch (error) {
            console.error('Error fetching models:', error);
        }
    }

    addDeleteEventListeners() {
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const name = button.getAttribute('data-name');
                this.deleteModel(name);
            });
        });
    }

    async deleteModel(name) {
        try {
            const response = await fetch(`/workflows/${name}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete model');
            this.fetchModels();
        } catch (error) {
            console.error('Error deleting model:', error);
            alert('Failed to delete model');
        }
    }

    async submitJsonToServer(jsonData, name) {
        try {
            const response = await fetch('/workflows', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data:jsonData, name })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const result = await response.json();
            console.log('Server response:', result);
        } catch (error) {
            console.error('Error submitting JSON to server:', error);
        }
    }

    init() {
        this.buttons.forEach(button => {
            button.addEventListener("click", () => this.activateScreen(button.id));
        });
        this.activateScreen("connection");
    }


    async screenFunctions(id) {
        if( id == 'connection') {            
            const status = await fetch("ready").then(res => res.json());
            let ready = status.ready ? "Active": "Error"
            document.getElementById('status').style.color = status.ready ? "#00ff00":"#ff0000"
            document.getElementById('status').textContent = ready
        } else if (id == 'models') {
            this.fetchModels()
        }
    }

    activateScreen(id) {
        this.buttons.forEach(button => button.classList.remove("active"));
        this.screens.forEach(screen => {
            if (screen.dataset.screen == 1) {
                screen.classList.remove("active");
                setTimeout(() => {
                    if (screen.dataset.id !== id) {
                        screen.style.display = "none";
                    } else {
                        const activeButton = document.getElementById(id);
                        activeButton.classList.add("active");
                        const activeScreen = document.querySelector(`.screen div[data-id="${id}"]`);
                        activeScreen.style.display = "flex";
                        setTimeout(() => activeScreen.classList.add("active"), 20);
                    }
                }, 10);
            }
        });
        this.screenFunctions(id);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new ComfyTG();
});
