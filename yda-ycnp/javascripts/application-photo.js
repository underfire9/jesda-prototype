document.addEventListener('DOMContentLoaded', function () {
    var storageKey = 'applicationPhoto';
    var input = document.getElementById('application-photo');
    var display = document.querySelector('.photo-display');
    var storedPhoto;

    try {
        var storedValue = sessionStorage.getItem(storageKey);
        storedPhoto = storedValue ? JSON.parse(storedValue) : null;
        if (storedPhoto && (typeof storedPhoto.name !== 'string' ||
            typeof storedPhoto.data !== 'string' || !storedPhoto.data.startsWith('data:image/'))) {
            throw new Error('Invalid stored photo');
        }
    } catch (error) {
        var storageStatus = input ? document.getElementById('application-photo-status') :
            display.querySelector('.photo-display-status');
        storageStatus.textContent = '無法讀取暫存照片，請重新選擇。';
        storedPhoto = null;
    }

    if (display) {
        var displayImage = display.querySelector('.photo-display-image');
        var placeholder = display.querySelector('.photo-display-placeholder');
        var displayStatus = display.querySelector('.photo-display-status');
        if (storedPhoto) {
            displayImage.addEventListener('error', function () {
                displayImage.hidden = true;
                placeholder.hidden = false;
                displayStatus.textContent = '無法顯示暫存照片，請返回重新選擇。';
            });
            displayImage.src = storedPhoto.data;
            displayImage.hidden = false;
            placeholder.hidden = true;
            displayStatus.textContent = storedPhoto.name;
        }
    }

    if (!input) return;

    var dropzone = document.querySelector('.photo-upload-dropzone');
    var preview = document.querySelector('.photo-upload-preview');
    var image = document.querySelector('.photo-upload-image');
    var name = document.querySelector('.photo-upload-name');
    var remove = document.querySelector('.photo-upload-remove');
    var status = document.getElementById('application-photo-status');
    var selectedFile = null;
    var generation = 0;
    var dragDepth = 0;

    function renderPhoto(photo) {
        preview.hidden = !photo;
        if (photo) {
            image.hidden = false;
            image.src = photo.data;
            name.textContent = photo.name;
        } else {
            image.removeAttribute('src');
            name.textContent = '';
        }
    }

    image.addEventListener('error', function () {
        image.hidden = true;
        status.textContent = '無法顯示暫存照片，請重新選擇。';
    });

    function restoreInput() {
        input.value = '';
        if (!selectedFile) return true;
        try {
            var transfer = new DataTransfer();
            transfer.items.add(selectedFile);
            input.files = transfer.files;
            return input.files.length === 1;
        } catch (error) {
            return false;
        }
    }

    function failSelection(message) {
        if (!restoreInput()) message += ' 請重新選擇原照片。';
        status.textContent = message;
    }

    function selectPhoto(file) {
        var operation = ++generation;
        if (!file.type.startsWith('image/')) {
            failSelection('請選擇圖片檔案。');
            return;
        }

        status.textContent = '正在讀取照片...';
        var reader = new FileReader();
        reader.onerror = function () {
            if (operation === generation) failSelection('無法讀取照片，請重新選擇。');
        };
        reader.onload = function () {
            if (operation !== generation) return;
            var photo = { name: file.name, data: reader.result };
            var testImage = new Image();
            testImage.onerror = function () {
                if (operation === generation) failSelection('無法顯示此圖片，請重新選擇。');
            };
            testImage.onload = function () {
                if (operation !== generation) return;
                try {
                    sessionStorage.setItem(storageKey, JSON.stringify(photo));
                } catch (error) {
                    failSelection('無法暫存照片供預覽，請確認瀏覽器儲存空間或選擇較小的圖片。');
                    return;
                }
                selectedFile = file;
                renderPhoto(photo);
                status.textContent = '照片已選擇，可再次拖曳或點擊更換。';
            };
            testImage.src = photo.data;
        };
        reader.readAsDataURL(file);
    }

    renderPhoto(storedPhoto);

    input.addEventListener('change', function () {
        if (input.files.length) selectPhoto(input.files[0]);
    });

    dropzone.addEventListener('dragenter', function (event) {
        event.preventDefault();
        dragDepth += 1;
        dropzone.classList.add('is-dragover');
    });
    dropzone.addEventListener('dragover', function (event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    });
    dropzone.addEventListener('dragleave', function (event) {
        event.preventDefault();
        dragDepth = Math.max(0, dragDepth - 1);
        if (!dragDepth) dropzone.classList.remove('is-dragover');
    });
    dropzone.addEventListener('drop', function (event) {
        event.preventDefault();
        dragDepth = 0;
        dropzone.classList.remove('is-dragover');
        var files = event.dataTransfer.files;
        if (files.length !== 1) {
            ++generation;
            failSelection('請拖曳一張圖片。');
            return;
        }
        try {
            input.files = files;
        } catch (error) {
            ++generation;
            failSelection('無法加入拖曳的照片，請點擊選擇照片。');
            return;
        }
        var droppedFile = input.files[0];
        if (!droppedFile || droppedFile.name !== files[0].name ||
            droppedFile.size !== files[0].size || droppedFile.type !== files[0].type ||
            droppedFile.lastModified !== files[0].lastModified) {
            ++generation;
            failSelection('無法加入拖曳的照片，請點擊選擇照片。');
            return;
        }
        selectPhoto(input.files[0]);
    });

    remove.addEventListener('click', function () {
        ++generation;
        try {
            sessionStorage.removeItem(storageKey);
        } catch (error) {
            failSelection('無法刪除暫存照片，請檢查瀏覽器儲存設定。');
            return;
        }
        selectedFile = null;
        input.value = '';
        renderPhoto(null);
        status.textContent = '照片已刪除。';
        input.focus();
    });
});
