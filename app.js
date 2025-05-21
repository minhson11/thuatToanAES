document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const keyInput = document.getElementById('keyInput');
    const encryptBtn = document.getElementById('encryptBtn');
    const decryptBtn = document.getElementById('decryptBtn');
    const fileInfo = document.getElementById('fileInfo');
    const loading = document.getElementById('loading');
    const resultAlert = document.getElementById('result');
    const errorAlert = document.getElementById('error');
    
    let currentFile = null;
    
    // Handle file selection
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            currentFile = e.target.files[0];
            fileInfo.textContent = `Selected file: ${currentFile.name} (${formatFileSize(currentFile.size)})`;
        } else {
            currentFile = null;
            fileInfo.textContent = '';
        }
        clearAlerts();
    });
    
    // Handle encryption
    encryptBtn.addEventListener('click', function() {
        if (!validateInputs()) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            processFile(e.target.result, true);
        };
        reader.readAsArrayBuffer(currentFile);
    });
    
    // Handle decryption
    decryptBtn.addEventListener('click', function() {
        if (!validateInputs()) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            processFile(e.target.result, false);
        };
        reader.readAsArrayBuffer(currentFile);
    });
    
    // Validate inputs before processing
    function validateInputs() {
        clearAlerts();
        
        if (!currentFile) {
            showError('Please select a file first');
            return false;
        }
        
        if (!keyInput.value.trim()) {
            showError('Please enter an encryption key');
            return false;
        }
        
        return true;
    }
    
    // Process file (encrypt or decrypt)
    function processFile(fileData, isEncrypt) {
        showLoading();
        
        // Use setTimeout to allow UI to update before heavy processing
        setTimeout(function() {
            try {
                const key = deriveKey(keyInput.value.trim());
                let result;
                
                if (isEncrypt) {
                    result = encryptData(new Uint8Array(fileData), key);
                } else {
                    result = decryptData(new Uint8Array(fileData), key);
                }
                
                createDownloadLink(result, isEncrypt);
                hideLoading();
            } catch (e) {
                hideLoading();
                showError(`Error during ${isEncrypt ? 'encryption' : 'decryption'}: ${e.message}`);
                console.error(e);
            }
        }, 100);
    }
    // Derive 256-bit key from user input using SHA-256
    function deriveKey(keyStr) {
        const keyHash = CryptoJS.SHA256(keyStr);
        return CryptoJS.enc.Hex.parse(keyHash.toString(CryptoJS.enc.Hex));
    }
    
    // Encrypt data using AES-256-CBC
    function encryptData(data, key) {
        // Generate random IV (16 bytes for AES)
        const iv = CryptoJS.lib.WordArray.random(16);
        
        // Convert data to CryptoJS format
        const dataWords = CryptoJS.lib.WordArray.create(data);
        
        // Encrypt
        const encrypted = CryptoJS.AES.encrypt(dataWords, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        
        // Combine IV and encrypted data
        const ivAndCiphertext = iv.concat(encrypted.ciphertext);
        
        // Convert to ArrayBuffer for download
        return wordArrayToArrayBuffer(ivAndCiphertext);
    }
    
    // Decrypt data using AES-256-CBC
    function decryptData(data, key) {
        // Convert data to CryptoJS format
        const dataWords = CryptoJS.lib.WordArray.create(data);
        
        // Extract IV (first 16 bytes)
        const iv = CryptoJS.lib.WordArray.create(dataWords.words.slice(0, 4));
        const ciphertext = CryptoJS.lib.WordArray.create(dataWords.words.slice(4));
        
        // Decrypt
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext },
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );
        
        // Convert to ArrayBuffer for download
        return wordArrayToArrayBuffer(decrypted);
    }
    
    // Create download link for processed file
    function createDownloadLink(data, isEncrypt) {
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const extension = isEncrypt ? '.enc' : '.dec';
        const filename = currentFile.name + extension;
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showResult(`File ${isEncrypt ? 'encrypted' : 'decrypted'} successfully. Download started automatically.`);
    }
    
    // Convert CryptoJS WordArray to ArrayBuffer
    function wordArrayToArrayBuffer(wordArray) {
        const words = wordArray.words;
        const length = wordArray.sigBytes;
        const buffer = new ArrayBuffer(length);
        const view = new Uint8Array(buffer);
        
        for (let i = 0; i < length; i++) {
            view[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }
        
        return buffer;
    }
    
    // Helper functions for UI
    function showLoading() {
        loading.style.display = 'block';
        }
    
    function showResult(message) {
        resultAlert.textContent = message;
        resultAlert.classList.remove('d-none');
        errorAlert.classList.add('d-none');
    }
    
    function showError(message) {
        errorAlert.textContent = message;
        errorAlert.classList.remove('d-none');
        resultAlert.classList.add('d-none');
    }
    
    function clearAlerts() {
        resultAlert.classList.add('d-none');
        errorAlert.classList.add('d-none');
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});