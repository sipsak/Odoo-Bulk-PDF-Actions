// ==UserScript==
// @name            Odoo Bulk PDF Actions
// @name:tr         Odoo Toplu PDF İşlemleri
// @namespace       https://github.com/sipsak
// @version         1.5
// @description     Adds the ability to open and download selected invoices in bulk on the Incoming Invoices, Vendor Bills, Customers Invoices and Incoming Waybills screens
// @description:tr  Gelen Faturalar, Tedarikçi Faturaları, Müşteri Faturaları ve Gelen İrsaliyeler ekranlarında seçilen faturaları toplu olarak açma ve indirme özellikleri ekler
// @author          Burak Şipşak
// @match           https://portal.bskhvac.com.tr/*
// @match           https://*.odoo.com/*
// @grant           none
// @require         https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @require         https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @require         https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js
// @icon            data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNDQuNTIxIDUuNWE0LjQ3NyA0LjQ3NyAwIDAgMSAwIDYuMzMybC0zNC4xOSAzNC4xOUg0VjM5LjY5TDM4LjE5IDUuNWE0LjQ3NyA0LjQ3NyAwIDAgMSA2LjMzMSAwWiIgZmlsbD0iIzJFQkNGQSIvPjxwYXRoIGQ9Ik0xMC45IDE1LjEyMiA0Ljg5OCA5LjEyYTkuMDA0IDkuMDA0IDAgMCAwIDEwLjQ4IDEyLjU2OGwyMy4wMDEgMjNhNC40NzcgNC40NzcgMCAwIDAgNi4zMzEtNi4zM2wtMjMtMjMuMDAxQTkuMDA0IDkuMDA0IDAgMCAwIDkuMTQxIDQuODc3bDYuMDAyIDYuMDAyLTQuMjQzIDQuMjQzWiIgZmlsbD0iIzk4NTE4NCIvPjxwYXRoIGQ9Ik0yNS4wMjMgMTguNjcgMTguNjkgMjVsNi4zMzIgNi4zMzFMMzEuMzUyIDI1bC02LjMzLTYuMzMxWiIgZmlsbD0iIzE0NDQ5NiIvPjwvc3ZnPgo=
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
        if (href.includes("model=gib.incoming.despatch")) {
            return "despatch";
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
        return (type === "incoming" || type === "supplier" || type === "customer" || type === "despatch");
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
        const existingModals = document.querySelectorAll('.custom-alert-modal');
        existingModals.forEach(modal => modal.remove());

        const existingBackdrops = document.querySelectorAll('.modal-backdrop.custom-alert');
        existingBackdrops.forEach(backdrop => backdrop.remove());

        const backdrop = createModalBackdrop();
        backdrop.classList.add('custom-alert');
        document.body.appendChild(backdrop);

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

        const closeModal = () => {
            container.remove();
            backdrop.remove();
        };

        okButton.addEventListener('click', closeModal);
        closeButton.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);

        okButton.focus();
    }

    function showConfirmDialog(message, onConfirm, onCancel) {
        const existingModals = document.querySelectorAll('.custom-confirm-modal');
        existingModals.forEach(modal => modal.remove());

        const existingBackdrops = document.querySelectorAll('.modal-backdrop.custom-confirm');
        existingBackdrops.forEach(backdrop => backdrop.remove());

        const backdrop = createModalBackdrop();
        backdrop.classList.add('custom-confirm');
        document.body.appendChild(backdrop);

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
        });

        backdrop.addEventListener('click', () => {
            closeModal();
        });

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
		return document.getElementById("o_bulk_blockui") !== null;
    }

	const bulkProgress = {
		startTime: null,
		totalFiles: 0,
		container: null,
		batchCountSpan: null,
		batchTotalSpan: null,
		timeLeftSpan: null,
		percentSpan: null,
		progressBarInner: null,
		abortController: null,
	};

	function formatTimeRemaining(totalSeconds) {
		if (totalSeconds < 60) {
			return `${Math.round(totalSeconds)} saniye`;
		}
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = Math.round(totalSeconds % 60);
		return `${minutes} dakika ${seconds} saniye`;
	}

	function showFullScreenProgress(totalFiles) {
		const mainContainer = document.querySelector('.o-main-components-container');
		if (document.getElementById('o_bulk_blockui')) return;
		bulkProgress.startTime = Date.now();
		bulkProgress.totalFiles = totalFiles;
		bulkProgress.abortController = new AbortController();

		const wrapper = document.createElement('div');
		wrapper.id = 'o_bulk_blockui';
		wrapper.className = 'o_blockUI fixed-top d-flex justify-content-center align-items-center flex-column vh-100 bg-black-50';

		const spinner = document.createElement('div');
		spinner.className = 'o_spinner mb-4';
		spinner.innerHTML = '<img src="/web/static/img/spin.svg" alt="Yükleniyor...">';
		wrapper.appendChild(spinner);

		const content = document.createElement('div');
		const message = document.createElement('div');
		message.className = 'o_message text-center px-4';
		message.textContent = 'İndiriliyor...';
		content.appendChild(message);

		const progressWrap = document.createElement('div');
		progressWrap.className = 'o_import_data_progress d-flex align-items-center flex-column';

		const batch = document.createElement('div');
		batch.className = 'o_import_progress_dialog_batch text-center';
		batch.innerHTML = '<span class="o_import_progress_dialog_batch_total">0</span> öğeden <span class="o_import_progress_dialog_batch_count">0</span> tanesi indirildi <div class="o_import_progress_dialog_time_left"><span>Tahmini kalan süre:</span><span class="o_import_progress_dialog_time_left_text mx-1">-</span></div>';
		progressWrap.appendChild(batch);

		const barRow = document.createElement('div');
		barRow.className = 'd-flex align-items-center mt-2';
		const barOuter = document.createElement('div');
		barOuter.className = 'progress flex-grow-1 rounded-3';
		const barInner = document.createElement('div');
		barInner.className = 'progress-bar progress-bar-striped';
		barInner.setAttribute('role', 'progressbar');
		barInner.setAttribute('aria-valuenow', '0');
		barInner.setAttribute('aria-valuemin', '0');
		barInner.setAttribute('aria-valuemax', '100');
		barInner.setAttribute('aria-label', 'İlerleme Çubuğu');
		barInner.setAttribute('style', 'width: 0%');
		const percentSpan = document.createElement('span');
		percentSpan.className = 'fs-4';
		percentSpan.textContent = '0%';
		barInner.appendChild(percentSpan);
		barOuter.appendChild(barInner);
		barRow.appendChild(barOuter);

		const cancelButton = document.createElement('a');
		cancelButton.className = 'o_progress_stop_import ms-2';
		cancelButton.setAttribute('role', 'button');
		cancelButton.innerHTML = '<i class="fa fa-close fs-2 text-danger" aria-label="İptal et" title="İptal et"></i>';
		cancelButton.addEventListener('click', () => {
			bulkProgress.abortController.abort();
			hideFullScreenProgress();
		});
		barRow.appendChild(cancelButton);

		progressWrap.appendChild(barRow);
		content.appendChild(progressWrap);
		wrapper.appendChild(content);

		(btoa('x') && mainContainer ? mainContainer : document.body).appendChild(wrapper);

		bulkProgress.container = wrapper;
		bulkProgress.batchCountSpan = wrapper.querySelector('.o_import_progress_dialog_batch_count');
		bulkProgress.batchTotalSpan = wrapper.querySelector('.o_import_progress_dialog_batch_total');
		bulkProgress.timeLeftSpan = wrapper.querySelector('.o_import_progress_dialog_time_left_text');
		bulkProgress.percentSpan = percentSpan;
		bulkProgress.progressBarInner = barInner;

		bulkProgress.batchCountSpan.textContent = '0';
		bulkProgress.batchTotalSpan.textContent = String(totalFiles);
	}

	function updateFullScreenProgress(doneCount) {
		if (!bulkProgress.container) return;
		const total = bulkProgress.totalFiles || 1;
		const percent = Math.round((doneCount / total) * 100);
		const elapsedMs = Date.now() - bulkProgress.startTime;
		const perItemMs = doneCount > 0 ? elapsedMs / doneCount : 0;
		const remainingMs = perItemMs * Math.max(total - doneCount, 0);
		const remainingSeconds = remainingMs / 1000;

		bulkProgress.batchCountSpan.textContent = String(doneCount);
		bulkProgress.percentSpan.textContent = `${percent}%`;
		bulkProgress.progressBarInner.setAttribute('style', `width: ${percent}%`);
		bulkProgress.progressBarInner.setAttribute('aria-valuenow', String(percent));
		bulkProgress.timeLeftSpan.textContent = doneCount === 0 ? '-' : formatTimeRemaining(remainingSeconds);
	}

	function hideFullScreenProgress() {
		if (!bulkProgress.container) return;
		const node = bulkProgress.container;
		bulkProgress.container = null;
		setTimeout(() => node && node.remove(), 300);
	}

    function getInvoiceId(row) {
        const cell = row.querySelector(`td[name="${getIdColumnName()}"]`);
        return cell ? cell.textContent.trim() : "";
    }

    function getInvoiceNo(row) {
        if (window.location.href.includes("model=account.move")) {
            const cell = row.querySelector('td[name="gib_invoice_name"]');
            return cell ? cell.textContent.trim() : "";
        } else if (window.location.href.includes("model=gib.incoming.despatch")) {
            const cell = row.querySelector('td[name="name"]');
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
        } else if (type === "despatch") {
            return `${baseUrl}/gib_picking_2kb/pdf/gid/${invoiceId}`;
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

            if (selectedRows.length > 10) {
                showConfirmDialog(
                    `Toplam ${selectedRows.length} adet kayıt yeni sekmede açılacak, onaylıyor musunuz?`,
                    () => {
                        selectedRows.forEach(row => {
                            const invoiceId = getInvoiceId(row);
                            const url = getPdfUrl(invoiceId);
                            window.open(url, '_blank');
                        });
                    },
                    () => {
                    }
                );
            } else {
                selectedRows.forEach(row => {
                    const invoiceId = getInvoiceId(row);
                    const url = getPdfUrl(invoiceId);
                    window.open(url, '_blank');
                });
            }
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
		showFullScreenProgress(totalFiles);
		updateFullScreenProgress(0);
		selectedRows.forEach(row => {
			const invoiceId = getInvoiceId(row);
			const invoiceNo = getInvoiceNo(row);
			const url = getPdfUrl(invoiceId);
			fetch(url, { signal: bulkProgress.abortController.signal })
				.then(response => response.blob())
				.then(blob => {
					if (bulkProgress.abortController.signal.aborted) return;
					zip.file(`${invoiceNo}.pdf`, blob);
					count++;
					updateFullScreenProgress(count);
					if (count === totalFiles) {
						zip.generateAsync({ type: "blob" }).then(content => {
							saveAs(content, "Faturalar.zip");
							hideFullScreenProgress();
						});
					}
				})
				.catch(error => {
					if (!bulkProgress.abortController.signal.aborted) {
						console.error("PDF indirme hatası:", error);
					}
				});
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
        showFullScreenProgress(selectedRows.length);
        updateFullScreenProgress(0);
        const mergedPdf = await PDFLib.PDFDocument.create();
        let count = 0;
        const totalFiles = selectedRows.length;

        for (const row of selectedRows) {
            if (bulkProgress.abortController.signal.aborted) break;
            const invoiceId = getInvoiceId(row);
            const url = getPdfUrl(invoiceId);
            try {
                const response = await fetch(url, { signal: bulkProgress.abortController.signal });
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
                if (!bulkProgress.abortController.signal.aborted) {
                    console.error(`PDF indirme hatası: ${error}`);
                }
            }
            count++;
            updateFullScreenProgress(count);
        }

        if (!bulkProgress.abortController.signal.aborted) {
            const mergedPdfBytes = await mergedPdf.save();
            const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
            const filename = firstPageOnly ? "Faturalar_Birlesik_IlkSayfalar.pdf" : "Faturalar_Birlesik.pdf";
            saveAs(blob, filename);
        }
        hideFullScreenProgress();
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
            if(getInvoiceType() === "customer" || getInvoiceType() === "despatch") {
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
