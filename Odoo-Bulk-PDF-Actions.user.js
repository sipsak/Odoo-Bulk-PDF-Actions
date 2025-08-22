// ==UserScript==
// @name            Odoo Bulk PDF Actions
// @name:tr         Odoo Toplu PDF İşlemleri
// @namespace       https://github.com/sipsak
// @version         1.3.2
// @description     Adds the ability to open and download selected invoices in bulk on the Incoming Invoices, Supplier Invoices and Customer Invoices screens
// @description:tr  Gelen Faturalar, Tedarikçi Faturaları ve Müşteri Faturaları ekranlarında seçilen faturaları toplu olarak açma ve indirme özellikleri ekler
// @author          Burak Şipşak
// @match           https://portal.bskhvac.com.tr/*
// @match           https://*.odoo.com/*
// @grant           none
// @require         https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @require         https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @require         https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js
// @icon            https://raw.githubusercontent.com/sipsak/odoo-image-enlarger/refs/heads/main/icon.png
// @updateURL       https://raw.githubusercontent.com/sipsak/Odoo-Bulk-PDF-Actions/main/Odoo-Bulk-PDF-Actions.user.js
// @downloadURL     https://raw.githubusercontent.com/sipsak/Odoo-Bulk-PDF-Actions/main/Odoo-Bulk-PDF-Actions.user.js
// ==/UserScript==

(function() {
    'use strict';

    function getActionParam() {
        const href = window.location.href;
        const match = href.match(/action=(\d+)/);
        return match ? match[1] : null;
    }

    function getInvoiceType() {
        const href = window.location.href;
        if (href.includes("model=gib.incoming.invoice")) {
            return "incoming";
        }
        if (href.includes("model=account.move")) {
            const action = getActionParam();
            if (action === "245") {
                return "supplier";
            } else if (action === "243") {
                return "customer";
            }
        }
        return null;
    }

    function isInvoicePage() {
        const type = getInvoiceType();
        return (type === "incoming" || type === "supplier" || type === "customer");
    }

    function getIdColumnName() {
        const type = getInvoiceType();
        return type === "supplier" ? "x_studio_pdf_id" : "id";
    }

    function getSelectedRows() {
        return document.querySelectorAll('tr.o_data_row.o_data_row_selected');
    }

    function createModalBackdrop() {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.style.zIndex = '1040';
        return backdrop;
    }

    function createModalContainer() {
        const container = document.createElement('div');
        container.className = 'modal fade show';
        container.style.display = 'block';
        container.style.zIndex = '1050';
        container.setAttribute('tabindex', '-1');
        container.setAttribute('aria-modal', 'true');
        container.setAttribute('role', 'dialog');

        const dialog = document.createElement('div');
        dialog.className = 'modal-dialog modal-dialog-centered modal-sm';

        container.appendChild(dialog);
        return { container, dialog };
    }

    function showCustomAlert(message) {
        // Remove existing modals
        const existingModals = document.querySelectorAll('.custom-alert-modal');
        existingModals.forEach(modal => modal.remove());

        const existingBackdrops = document.querySelectorAll('.modal-backdrop.custom-alert');
        existingBackdrops.forEach(backdrop => backdrop.remove());

        // Create backdrop
        const backdrop = createModalBackdrop();
        backdrop.classList.add('custom-alert');
        document.body.appendChild(backdrop);

        // Create modal
        const { container, dialog } = createModalContainer();
        container.classList.add('custom-alert-modal');

        const content = document.createElement('div');
        content.className = 'modal-content';

        const header = document.createElement('header');
        header.className = 'modal-header';

        const title = document.createElement('h4');
        title.className = 'modal-title text-break';
        title.textContent = 'Bilgi';

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close';
        closeButton.setAttribute('aria-label', 'Close');

        header.appendChild(title);
        header.appendChild(closeButton);

        const body = document.createElement('main');
        body.className = 'modal-body';
        body.textContent = message;

        const footer = document.createElement('footer');
        footer.className = 'modal-footer justify-content-start';

        const okButton = document.createElement('button');
        okButton.className = 'btn btn-primary';
        okButton.textContent = 'Tamam';

        footer.appendChild(okButton);

        content.appendChild(header);
        content.appendChild(body);
        content.appendChild(footer);
        dialog.appendChild(content);

        document.body.appendChild(container);

        // Event handlers
        const closeModal = () => {
            container.remove();
            backdrop.remove();
        };

        okButton.addEventListener('click', closeModal);
        closeButton.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);

        // Focus on OK button
        okButton.focus();
    }

    function showConfirmDialog(message, onConfirm, onCancel) {
        // Remove existing modals
        const existingModals = document.querySelectorAll('.custom-confirm-modal');
        existingModals.forEach(modal => modal.remove());

        const existingBackdrops = document.querySelectorAll('.modal-backdrop.custom-confirm');
        existingBackdrops.forEach(backdrop => backdrop.remove());

        // Create backdrop
        const backdrop = createModalBackdrop();
        backdrop.classList.add('custom-confirm');
        document.body.appendChild(backdrop);

        // Create modal
        const { container, dialog } = createModalContainer();
        container.classList.add('custom-confirm-modal');

        const content = document.createElement('div');
        content.className = 'modal-content';

        const header = document.createElement('header');
        header.className = 'modal-header';

        const title = document.createElement('h4');
        title.className = 'modal-title text-break';
        title.textContent = 'Onay';

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close';
        closeButton.setAttribute('aria-label', 'Close');

        header.appendChild(title);
        header.appendChild(closeButton);

        const body = document.createElement('main');
        body.className = 'modal-body';
        body.textContent = message;

        const footer = document.createElement('footer');
        footer.className = 'modal-footer justify-content-start';

        const yesButton = document.createElement('button');
        yesButton.className = 'btn btn-primary me-2';
        yesButton.textContent = 'Evet';

        const noButton = document.createElement('button');
        noButton.className = 'btn btn-secondary';
        noButton.textContent = 'Hayır';

        footer.appendChild(yesButton);
        footer.appendChild(noButton);

        content.appendChild(header);
        content.appendChild(body);
        content.appendChild(footer);
        dialog.appendChild(content);

        document.body.appendChild(container);

        // Event handlers
        const closeModal = () => {
            container.remove();
            backdrop.remove();
        };

        yesButton.addEventListener('click', () => {
            closeModal();
            if (onConfirm) onConfirm();
        });

        noButton.addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
        });

        closeButton.addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
        });

        backdrop.addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
        });

        // Focus on Yes button
        yesButton.focus();
    }

    function isIdColumnVisible() {
        const targetColumn = getIdColumnName();
        const headers = document.querySelectorAll('th.o_column_sortable');
        for (let i = 0; i < headers.length; i++) {
            if (headers[i].getAttribute('data-name') === targetColumn) {
                return true;
            }
        }
        return false;
    }

    function checkIdColumnAndProcess(callback) {
        if (!isIdColumnVisible()) {
            if(window.location.href.includes("model=account.move") && getInvoiceType() === "supplier") {
                showCustomAlert("Bu butonun çalışabilmesi için PDF ID sütununu göstermeniz gerekir.");
            } else {
                showCustomAlert("Bu butonun çalışabilmesi için ID sütununu göstermeniz gerekir.");
            }
            return false;
        }
        callback();
        return true;
    }

    function isProcessing() {
        return document.getElementById("download-progress-container") !== null;
    }

    function createProgressBar() {
        let progressContainer = document.getElementById("download-progress-container");
        if (!progressContainer) {
            progressContainer = document.createElement("div");
            progressContainer.id = "download-progress-container";
            progressContainer.style.position = "fixed";
            progressContainer.style.bottom = "20px";
            progressContainer.style.left = "50%";
            progressContainer.style.transform = "translateX(-50%)";
            progressContainer.style.background = "rgba(0, 0, 0, 0.8)";
            progressContainer.style.color = "white";
            progressContainer.style.padding = "10px";
            progressContainer.style.borderRadius = "5px";
            progressContainer.style.fontSize = "14px";
            progressContainer.style.zIndex = "9999";
            progressContainer.style.width = "400px";
            progressContainer.style.textAlign = "center";

            const progressText = document.createElement("div");
            progressText.id = "download-progress-text";
            progressText.textContent = "İşlem devam ediyor... (0%)\nİşlem tamamlanana kadar seçiminizi değiştirmeyin.";
            progressText.style.whiteSpace = 'pre-line';
            progressContainer.appendChild(progressText);

            const progressBar = document.createElement("div");
            progressBar.id = "download-progress-bar";
            progressBar.style.width = "100%";
            progressBar.style.background = "#444";
            progressBar.style.borderRadius = "3px";
            progressBar.style.marginTop = "5px";

            const progressFill = document.createElement("div");
            progressFill.id = "download-progress-fill";
            progressFill.style.height = "8px";
            progressFill.style.width = "0%";
            progressFill.style.background = "#4CAF50";
            progressFill.style.borderRadius = "3px";

            progressBar.appendChild(progressFill);
            progressContainer.appendChild(progressBar);
            document.body.appendChild(progressContainer);
        }
    }

    function updateProgressBar(percent) {
        const progressText = document.getElementById("download-progress-text");
        const progressFill = document.getElementById("download-progress-fill");
        if (progressText && progressFill) {
            progressText.textContent = `İşlem devam ediyor... (${percent}%)\nİşlem tamamlanana kadar seçiminizi değiştirmeyin.`;
            progressFill.style.width = `${percent}%`;
        }
    }

    function hideProgressBar() {
        setTimeout(() => document.getElementById("download-progress-container")?.remove(), 1000);
    }

    function getInvoiceId(row) {
        const cell = row.querySelector(`td[name="${getIdColumnName()}"]`);
        return cell ? cell.textContent.trim() : "";
    }

    function getInvoiceNo(row) {
        if (window.location.href.includes("model=account.move")) {
            const cell = row.querySelector('td[name="gib_invoice_name"]');
            return cell ? cell.textContent.trim() : "";
        } else {
            const cell = row.querySelector('td[name="name"]');
            return cell ? cell.textContent.trim() : "";
        }
    }

    function getPdfUrl(invoiceId) {
        const baseUrl = window.location.origin;
        const type = getInvoiceType();
        if (type === "supplier") {
            return `${baseUrl}/web/content/${invoiceId}`;
        } else if (type === "incoming") {
            return `${baseUrl}/gib_invoice_2kb/pdf/incoming/${invoiceId}`;
        } else if (type === "customer") {
            return `${baseUrl}/gib_invoice_2kb/pdf2/${invoiceId}`;
        }
    }

    function openSelectedPDFs() {
        if(isProcessing()){
            showCustomAlert("Önce mevcut işlemin tamamlanmasını bekleyin");
            return;
        }
        checkIdColumnAndProcess(() => {
            const selectedRows = getSelectedRows();
            if (selectedRows.length === 0) {
                showCustomAlert("Lütfen en az bir fatura seçiniz!");
                return;
            }
            selectedRows.forEach(row => {
                const invoiceId = getInvoiceId(row);
                const url = getPdfUrl(invoiceId);
                window.open(url, '_blank');
            });
        });
    }

    function downloadSelectedPDFs() {
        if(isProcessing()){
            showCustomAlert("Önce mevcut işlemin tamamlanmasını bekleyin");
            return;
        }
        if (!checkIdColumnAndProcess(() => {})) return;
        const selectedRows = getSelectedRows();
        if (selectedRows.length === 0) {
            showCustomAlert("Lütfen en az bir fatura seçiniz!");
            return;
        }
        if (selectedRows.length === 1) {
            const invoiceId = getInvoiceId(selectedRows[0]);
            const invoiceNo = getInvoiceNo(selectedRows[0]);
            const url = getPdfUrl(invoiceId);
            downloadSinglePDF(url, `${invoiceNo}.pdf`);
        } else {
            downloadMultiplePDFsAsZip(selectedRows);
        }
    }

    function downloadSinglePDF(url, filename) {
        if (window.location.href.includes("model=account.move")) {
            fetch(url)
                .then(response => response.blob())
                .then(blob => {
                    saveAs(blob, filename);
                })
                .catch(error => console.error("PDF indirme hatası:", error));
        } else {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    function downloadMultiplePDFsAsZip(selectedRows) {
        const zip = new JSZip();
        let count = 0;
        const totalFiles = selectedRows.length;
        createProgressBar();
        updateProgressBar(0);
        selectedRows.forEach(row => {
            const invoiceId = getInvoiceId(row);
            const invoiceNo = getInvoiceNo(row);
            const url = getPdfUrl(invoiceId);
            fetch(url)
                .then(response => response.blob())
                .then(blob => {
                    zip.file(`${invoiceNo}.pdf`, blob);
                    count++;
                    updateProgressBar(Math.round((count / totalFiles) * 100));
                    if (count === totalFiles) {
                        zip.generateAsync({ type: "blob" }).then(content => {
                            saveAs(content, "Faturalar.zip");
                            hideProgressBar();
                        });
                    }
                })
                .catch(error => console.error("PDF indirme hatası:", error));
        });
    }

    async function mergePDFsIntoOne() {
        if(isProcessing()){
            showCustomAlert("Önce mevcut işlemin tamamlanmasını bekleyin");
            return;
        }
        if (!checkIdColumnAndProcess(() => {})) return;
        const selectedRows = getSelectedRows();
        if (selectedRows.length === 0) {
            showCustomAlert("Lütfen en az bir fatura seçiniz!");
            return;
        }

        showConfirmDialog(
            "Sadece ilk sayfalar baz alınsın mı?",
            () => mergePDFs(selectedRows, true),
            () => mergePDFs(selectedRows, false)
        );
    }

    async function mergePDFs(selectedRows, firstPageOnly) {
        createProgressBar();
        updateProgressBar(0);
        const mergedPdf = await PDFLib.PDFDocument.create();
        let count = 0;
        const totalFiles = selectedRows.length;

        for (const row of selectedRows) {
            const invoiceId = getInvoiceId(row);
            const url = getPdfUrl(invoiceId);
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

                if (firstPageOnly) {
                    const [firstPage] = await mergedPdf.copyPages(pdfDoc, [0]);
                    mergedPdf.addPage(firstPage);
                } else {
                    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                    copiedPages.forEach(page => mergedPdf.addPage(page));
                }
            } catch (error) {
                console.error(`PDF indirme hatası: ${error}`);
            }
            count++;
            updateProgressBar(Math.round((count / totalFiles) * 100));
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
        const filename = firstPageOnly ? "Faturalar_Birlesik_IlkSayfalar.pdf" : "Faturalar_Birlesik.pdf";
        saveAs(blob, filename);
        hideProgressBar();
    }

    function removeFocusFromOriginalButtons() {
        const originalButtons = document.querySelectorAll('.o_cp_action_menus .dropdown-item.o_menu_item');
        originalButtons.forEach(button => {
            button.classList.remove('focus');
        });
    }

    function addPdfButtons() {
        if (!isInvoicePage()) return;
        const menus = document.querySelectorAll('.o_cp_action_menus .dropdown-menu');
        menus.forEach(menu => {
            if (menu.closest('.o_control_panel_breadcrumbs_actions')) return;
            if (menu.querySelector('.pdf-download-button')) return;
            let buttons = [
                { className: 'pdf-open-button', icon: 'fa-file-pdf-o', text: 'PDF aç', onClick: openSelectedPDFs },
                { className: 'pdf-download-button', icon: 'fa-download', text: 'PDF indir', onClick: downloadSelectedPDFs },
                { className: 'pdf-merge-button', icon: 'fa-files-o', text: 'Birleştirip indir', onClick: mergePDFsIntoOne }
            ];
            if(getInvoiceType() === "customer") {
                buttons = buttons.filter(btn => btn.className !== "pdf-open-button");
            }
            buttons.reverse().forEach(btn => {
                const button = document.createElement('span');
                button.className = `dropdown-item o_menu_item ${btn.className}`;
                button.innerHTML = `<i class="fa ${btn.icon} me-1 fa-fw oi-fw"></i>${btn.text}`;
                menu.prepend(button);
                button.addEventListener('click', btn.onClick);
                button.addEventListener('mouseover', removeFocusFromOriginalButtons);
            });
        });
    }

    new MutationObserver(addPdfButtons).observe(document.body, { childList: true, subtree: true });
})();
