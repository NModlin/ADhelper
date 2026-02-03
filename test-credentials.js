// Check if running in Electron
const isElectron = !!(window.electronAPI);

// Update status
const statusDiv = document.getElementById('status');
const statusText = document.getElementById('statusText');

if (isElectron) {
    statusDiv.className = 'status electron';
    statusText.textContent = '✅ Running in Electron - Windows Credential Manager Available';
} else {
    statusDiv.className = 'status browser';
    statusText.textContent = '⚠️ Running in Browser - Using localStorage (less secure)';
}

// Mock electronAPI for browser mode
const mockElectronAPI = {
    saveCredential: async (target, username, password) => {
        try {
            const credentials = JSON.parse(localStorage.getItem('credentials') || '{}');
            credentials[target] = { username, password };
            localStorage.setItem('credentials', JSON.stringify(credentials));
            return { success: true, message: 'Credential saved to browser storage' };
        } catch (error) {
            return { success: false, error: 'Failed to save credential' };
        }
    },
    
    getCredential: async (target) => {
        try {
            const credentials = JSON.parse(localStorage.getItem('credentials') || '{}');
            const cred = credentials[target];
            if (cred) {
                return { success: true, username: cred.username, password: cred.password };
            }
            return { success: true, username: null, password: null };
        } catch (error) {
            return { success: false, error: 'Failed to retrieve credential' };
        }
    },
    
    deleteCredential: async (target) => {
        try {
            const credentials = JSON.parse(localStorage.getItem('credentials') || '{}');
            delete credentials[target];
            localStorage.setItem('credentials', JSON.stringify(credentials));
            return { success: true, message: 'Credential deleted from browser storage' };
        } catch (error) {
            return { success: false, error: 'Failed to delete credential' };
        }
    }
};

// Use real electronAPI if available, otherwise use mock
const api = window.electronAPI || mockElectronAPI;

// Helper function to show result
function showResult(elementId, message, type) {
    const resultDiv = document.getElementById(elementId);
    resultDiv.textContent = message;
    resultDiv.className = `result ${type}`;
    resultDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        resultDiv.style.display = 'none';
    }, 5000);
}

// Save credential
async function saveCredential() {
    const target = document.getElementById('saveTarget').value;
    const username = document.getElementById('saveUsername').value;
    const password = document.getElementById('savePassword').value;
    
    if (!username || !password) {
        showResult('saveResult', '❌ Please enter both username and password', 'error');
        return;
    }
    
    try {
        const result = await api.saveCredential(target, username, password);
        
        if (result.success) {
            showResult('saveResult', `✅ ${result.message || 'Credential saved successfully'}`, 'success');
            // Clear form
            document.getElementById('saveUsername').value = '';
            document.getElementById('savePassword').value = '';
        } else {
            showResult('saveResult', `❌ ${result.error || 'Failed to save credential'}`, 'error');
        }
    } catch (error) {
        showResult('saveResult', `❌ Error: ${error.message || error}`, 'error');
    }
}

// Get credential
async function getCredential() {
    const target = document.getElementById('getTarget').value;
    
    try {
        const result = await api.getCredential(target);
        
        if (result.success) {
            if (result.username && result.password) {
                const message = `✅ Credential found!\n\nUsername: ${result.username}\nPassword: ${'*'.repeat(result.password.length)} (hidden)`;
                showResult('getResult', message, 'success');
            } else {
                showResult('getResult', 'ℹ️ No credential found for this target', 'info');
            }
        } else {
            showResult('getResult', `❌ ${result.error || 'Failed to retrieve credential'}`, 'error');
        }
    } catch (error) {
        showResult('getResult', `❌ Error: ${error.message || error}`, 'error');
    }
}

// Delete credential
async function deleteCredential() {
    const target = document.getElementById('deleteTarget').value;
    
    if (!confirm(`Are you sure you want to delete the credential for "${target}"?`)) {
        return;
    }
    
    try {
        const result = await api.deleteCredential(target);
        
        if (result.success) {
            showResult('deleteResult', `✅ ${result.message || 'Credential deleted successfully'}`, 'success');
        } else {
            showResult('deleteResult', `❌ ${result.error || 'Failed to delete credential'}`, 'error');
        }
    } catch (error) {
        showResult('deleteResult', `❌ Error: ${error.message || error}`, 'error');
    }
}

// Add Enter key support
document.getElementById('savePassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveCredential();
});

console.log('Credential Manager Test Page Loaded');
console.log('Running in:', isElectron ? 'Electron' : 'Browser');

