class MessageEncryption {
    constructor() {
        this.keyPair = null;
        this.publicKeys = {}; // Store other users' public keys
        this.groupKeys = {}; // Store group encryption keys
    }

    async initialize() {
        // Load existing keys if available
        const savedPrivateKey = localStorage.getItem('privateKey');
        const savedPublicKey = localStorage.getItem('publicKey');
        
        if (savedPrivateKey && savedPublicKey) {
            // Import existing keys
            this.keyPair = {
                privateKey: await this.importKey(JSON.parse(savedPrivateKey), 'private'),
                publicKey: await this.importKey(JSON.parse(savedPublicKey), 'public')
            };
        } else {
            // Generate new key pair
            await this.generateKeyPair();
        }
        
        // Register public key with server
        await this.registerPublicKey();
    }

    async generateKeyPair() {
        // Generate RSA key pair for asymmetric encryption
        this.keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true, // extractable
            ["encrypt", "decrypt"]
        );
        
        // Export keys for storage
        const exportedPrivateKey = await window.crypto.subtle.exportKey(
            "jwk", 
            this.keyPair.privateKey
        );
        
        const exportedPublicKey = await window.crypto.subtle.exportKey(
            "jwk", 
            this.keyPair.publicKey
        );
        
        // Save keys to localStorage
        localStorage.setItem('privateKey', JSON.stringify(exportedPrivateKey));
        localStorage.setItem('publicKey', JSON.stringify(exportedPublicKey));
    }
    
    async importKey(jwkKey, type) {
        const algorithm = {
            name: "RSA-OAEP",
            hash: "SHA-256"
        };
        
        const usages = type === 'private' ? ['decrypt'] : ['encrypt'];
        
        return window.crypto.subtle.importKey(
            "jwk",
            jwkKey,
            algorithm,
            true,
            usages
        );
    }
    
    async registerPublicKey() {
        // Export public key in a format suitable for transmission
        const exportedPublicKey = await window.crypto.subtle.exportKey(
            "jwk", 
            this.keyPair.publicKey
        );
        
        // Send to server - FIX: Change to the correct endpoint
        await fetch('/api/messages/register-key', {  // Changed from /api/users/register-key
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                publicKey: exportedPublicKey
            })
        });
    }
    
    async fetchPublicKey(userId) {
        // Check if we already have this user's key
        if (this.publicKeys[userId]) {
            return this.publicKeys[userId];
        }
        
        try {
            console.log(`Fetching public key for user ID: ${userId}`);
            
            // Fetch from server
            const response = await fetch(`/api/messages/public-key/${userId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.error(`Public key fetch failed with status: ${response.status}`);
                
                if (response.status === 404) {
                    // If the user doesn't have a key yet, we could implement a fallback
                    console.log("User doesn't have a registered public key");
                    throw new Error(`User ${userId} hasn't set up encryption yet`);
                }
                
                throw new Error(`Failed to fetch public key: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log("Public key received:", data.publicKey ? "Yes" : "No");
            
            if (!data.publicKey) {
                throw new Error('No public key in response');
            }
            
            // Import the key
            const importedKey = await this.importKey(data.publicKey, 'public');
            
            // Cache it
            this.publicKeys[userId] = importedKey;
            
            return importedKey;
        } catch (error) {
            console.error(`Error in fetchPublicKey for ${userId}:`, error);
            throw error;
        }
    }
    
    async encryptMessage(message, recipientId) {
        // Get recipient's public key
        const publicKey = await this.fetchPublicKey(recipientId);
        
        // For longer messages, we need to use hybrid encryption
        // 1. Generate a random AES key
        const aesKey = await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );
        
        // 2. Encrypt the message with the AES key
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();
        const messageData = encoder.encode(message);
        
        const encryptedMessage = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            aesKey,
            messageData
        );
        
        // 3. Export the AES key
        const rawKey = await window.crypto.subtle.exportKey("raw", aesKey);
        
        // 4. Encrypt the AES key with recipient's public RSA key
        const encryptedKey = await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP"
            },
            publicKey,
            rawKey
        );
        
        // 5. Combine everything for transmission
        const result = {
            key: this.arrayBufferToBase64(encryptedKey),
            iv: this.arrayBufferToBase64(iv),
            data: this.arrayBufferToBase64(encryptedMessage)
        };
        
        return JSON.stringify(result);
    }
    
    async decryptMessage(encryptedMessage) {
        try {
            // First check if this is actually JSON before trying to parse it
            if (typeof encryptedMessage !== 'string' || 
                !encryptedMessage.trim().startsWith('{') ||
                !encryptedMessage.trim().endsWith('}')) {
                throw new Error('Content is not in encrypted JSON format');
            }
            
            // Parse the message components
            const { key, iv, data } = JSON.parse(encryptedMessage);
            
            // Make sure all required encryption components exist
            if (!key || !iv || !data) {
                throw new Error('Encrypted message is missing required components');
            }
            
            // 1. Decrypt the AES key using our private key
            const encryptedKeyBuffer = this.base64ToArrayBuffer(key);
            const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
                {
                    name: "RSA-OAEP"
                },
                this.keyPair.privateKey,
                encryptedKeyBuffer
            );
            
            // 2. Import the decrypted AES key
            const aesKey = await window.crypto.subtle.importKey(
                "raw",
                decryptedKeyBuffer,
                {
                    name: "AES-GCM",
                    length: 256
                },
                false,
                ["decrypt"]
            );
            
            // 3. Decrypt the message using the AES key
            const ivBuffer = this.base64ToArrayBuffer(iv);
            const encryptedDataBuffer = this.base64ToArrayBuffer(data);
            
            const decryptedData = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: new Uint8Array(ivBuffer)
                },
                aesKey,
                encryptedDataBuffer
            );
            
            // 4. Convert back to text
            const decoder = new TextDecoder();
            return decoder.decode(decryptedData);
        } catch (error) {
            console.error("Decryption error:", error);
            throw new Error("Failed to decrypt message: " + error.message);
        }
    }
    
    // Helper functions for base64 conversion
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    async generateGroupKey(groupId) {
        // Generate a symmetric AES key for the group
        const groupKey = await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256
            },
            true, // extractable
            ["encrypt", "decrypt"]
        );
        
        // Store the key
        this.groupKeys[groupId] = groupKey;
        
        return groupKey;
    }
    
    async exportGroupKey(groupKey) {
        // Export the group key as raw bytes
        return window.crypto.subtle.exportKey("raw", groupKey);
    }
    
    async encryptGroupKey(groupKey, recipientId) {
        // Get recipient's public key
        const publicKey = await this.fetchPublicKey(recipientId);
        
        // Export the group key
        const rawGroupKey = await this.exportGroupKey(groupKey);
        
        // Encrypt the group key with recipient's public key
        const encryptedGroupKey = await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP"
            },
            publicKey,
            rawGroupKey
        );
        
        // Convert to base64 for transmission
        return this.arrayBufferToBase64(encryptedGroupKey);
    }
    
    async decryptGroupKey(encryptedGroupKey) {
        // Convert from base64
        const encryptedData = this.base64ToArrayBuffer(encryptedGroupKey);
        
        // Decrypt with our private key
        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP"
            },
            this.keyPair.privateKey,
            encryptedData
        );
        
        // Import as AES key
        return window.crypto.subtle.importKey(
            "raw",
            decryptedData,
            {
                name: "AES-GCM",
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );
    }
    
    async encryptGroupMessage(message, groupId) {
        // Get group key or generate if not exists
        let groupKey = this.groupKeys[groupId];
        if (!groupKey) {
            // This should never happen in practice - key should be received during group creation
            throw new Error('Group key not found');
        }
        
        // Generate a random initialization vector
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        // Convert message to ArrayBuffer
        const encoder = new TextEncoder();
        const messageData = encoder.encode(message);
        
        // Encrypt message with the group key
        const encryptedData = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            groupKey,
            messageData
        );
        
        // Combine IV and encrypted data for transmission
        const result = {
            iv: this.arrayBufferToBase64(iv),
            data: this.arrayBufferToBase64(encryptedData)
        };
        
        return JSON.stringify(result);
    }
    
    async decryptGroupMessage(encryptedMessage, groupId) {
        // Get the group key
        const groupKey = this.groupKeys[groupId];
        if (!groupKey) {
            throw new Error('Group key not found');
        }
        
        // Parse the message
        const { iv, data } = JSON.parse(encryptedMessage);
        
        // Convert from base64
        const ivBuffer = this.base64ToArrayBuffer(iv);
        const encryptedData = this.base64ToArrayBuffer(data);
        
        // Decrypt
        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: new Uint8Array(ivBuffer)
            },
            groupKey,
            encryptedData
        );
        
        // Convert to text
        const decoder = new TextDecoder();
        return decoder.decode(decryptedData);
    }
    
}
// Create singleton instance
window.messageEncryption = window.messageEncryption || new MessageEncryption();
