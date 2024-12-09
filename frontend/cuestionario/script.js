document.addEventListener('DOMContentLoaded', () => {
    const sendButton = document.querySelector('.button-container .round-button:last-child');
    const textarea = document.querySelector('textarea');

    // Función para crear modal de error
    const createModal = () => {
        const modal = document.createElement('div');
        modal.id = 'custom-modal';
        modal.classList.add('custom-modal');

        const modalContent = document.createElement('div');
        modalContent.classList.add('modal-content');
        modalContent.innerHTML = `
            <h2>Atención</h2>
            <p>Por favor, escribe un tema antes de continuar.</p>
            <button id="modal-close">Entendido</button>
        `;

        const overlay = document.createElement('div');
        overlay.classList.add('modal-overlay');

        modal.appendChild(modalContent);
        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        const closeButton = document.getElementById('modal-close');
        closeButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        });
    };

    sendButton.addEventListener('click', () => {
        const topic = textarea.value.trim();
        if (topic !== '') {
            localStorage.setItem('selectedTopic', topic);
            window.location.href = 'preguntas.html';
        } else {
            createModal();
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const loadButton = document.getElementById('load-button');
    const pdfInput = document.getElementById('pdf-input');
    const textarea = document.querySelector('textarea');

    const loadPdf = (file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const pdfData = new Uint8Array(event.target.result);
            pdfjsLib.getDocument(pdfData).promise.then((pdf) => {
                let fullText = "";
                const numPages = pdf.numPages;
                let processedPages = 0;

                for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                    pdf.getPage(pageNum).then((page) => {
                        page.getTextContent().then((textContent) => {
                            textContent.items.forEach(item => {
                                fullText += item.str + " ";
                            });
                            processedPages++;

                            if (processedPages === numPages) {
                                textarea.value = fullText;
                                localStorage.setItem('selectedTopic', fullText);
                                window.location.href = 'preguntas.html';
                            }
                        });
                    });
                }
            });
        };
        reader.readAsArrayBuffer(file);
    };

    loadButton.addEventListener('click', () => {
        pdfInput.click();
    });

    pdfInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            loadPdf(file);
        } else {
            alert('Por favor, selecciona un archivo PDF.');
        }
    });
});

