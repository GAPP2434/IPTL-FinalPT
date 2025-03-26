class MessageEncryption {
    constructor() {
        this.keyPair = null;
        this.publicKeys = {}; // Store other users' public keys
        this.groupKeys = {}; // Store group encryption keys
    }

    async initialize() {
        try {
            // Load existing keys if available
            const savedPrivateKey = localStorage.getItem('privateKey');
            const savedPublicKey = localStorage.getItem('publicKey');
            const keyVersion = localStorage.getItem('keyVersion') || '1';
            
            // Initialize properties
            this.keyVersion = parseInt(keyVersion);
            this.legacyKeys = [];
            this.decryptionCache = new Map(); // Add caching to improve performance
            
            // Load legacy keys if available
            const savedLegacyKeys = localStorage.getItem('legacyKeys');
            if (savedLegacyKeys) {
                try {
                    this.legacyKeys = JSON.parse(savedLegacyKeys);
                    console.log(`Loaded ${this.legacyKeys.length} legacy keys`);
                } catch (e) {
                    console.error('Failed to load legacy keys:', e);
                }
            }
            
            if (savedPrivateKey && savedPublicKey) {
                // Import existing keys
                this.keyPair = {
                    privateKey: await this.importKey(JSON.parse(savedPrivateKey), 'private'),
                    publicKey: await this.importKey(JSON.parse(savedPublicKey), 'public'),
                    version: this.keyVersion
                };
                console.log(`Loaded encryption key (version ${this.keyVersion})`);
            } else {
                // Generate new key pair
                console.log('No existing keys found, generating new key pair');
                await this.generateKeyPair();
            }
            
            // Register public key with server
            await this.registerPublicKey();
            
            return true;
        } catch (error) {
            console.error('Error initializing encryption:', error);
            throw error;
        }
    }

    // Add new method to generate a hash for cache keys
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
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
    
    // Add method to rotate keys (for security)
    async rotateKeys() {
        console.log('Rotating encryption keys');
        
        // Store current key as legacy before generating new one
        if (this.keyPair) {
            // Export current key for legacy storage
            const exportedPrivateKey = await window.crypto.subtle.exportKey(
                "jwk", 
                this.keyPair.privateKey
            );
            
            const exportedPublicKey = await window.crypto.subtle.exportKey(
                "jwk", 
                this.keyPair.publicKey
            );
            
            // Add to legacy keys
            this.legacyKeys.push({
                privateKey: exportedPrivateKey,
                publicKey: exportedPublicKey,
                version: this.keyVersion
            });
            
            // Save legacy keys
            localStorage.setItem('legacyKeys', JSON.stringify(this.legacyKeys));
            console.log(`Added key version ${this.keyVersion} to legacy keys`);
        }
        
        // Increment key version
        this.keyVersion = (this.keyVersion || 0) + 1;
        localStorage.setItem('keyVersion', this.keyVersion.toString());
        
        // Generate new key pair
        await this.generateKeyPair();
        
        // Clear public key cache to force fresh fetches
        this.publicKeys = {};
        
        // Register new public key with server
        await this.registerPublicKey();
        
        console.log(`Key rotation complete, new key version: ${this.keyVersion}`);
        return true;
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
                // Store that this user doesn't have encryption set up
                // to avoid repeated failed requests
                this.publicKeys[userId] = 'unavailable';
                
                if (response.status === 404) {
                    // User hasn't set up encryption yet - return a special value
                    // instead of throwing an error
                    console.log(`User ${userId} hasn't set up encryption yet`);
                    return 'unavailable';
                }
                
                throw new Error(`Failed to fetch public key: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log("Public key received:", data.publicKey ? "Yes" : "No");
            
            if (!data.publicKey) {
                this.publicKeys[userId] = 'unavailable';
                return 'unavailable';
            }
            
            // Import the key
            const importedKey = await this.importKey(data.publicKey, 'public');
            
            // Cache it
            this.publicKeys[userId] = importedKey;
            
            return importedKey;
        } catch (error) {
            console.error(`Error in fetchPublicKey for ${userId}:`, error);
            // Don't throw the error, just return 'unavailable'
            return 'unavailable';
        }
    }
    
    async encryptMessage(message, recipientId) {
        try {
            // Get recipient's public key
            const publicKey = await this.fetchPublicKey(recipientId);
            
            // Check if encryption is unavailable for this recipient
            if (publicKey === 'unavailable') {
                console.log(`Encryption unavailable for recipient ${recipientId}, sending in plain text`);
                // Return a special object that the sender can recognize
                return {
                    plaintext: message,
                    encryptionUnavailable: true
                };
            }
            
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
            
            // Continue with encryption as before...
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
            
            // 4. Encrypt the AES key with recipient's public key
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
        } catch (error) {
            console.error("Encryption error:", error);
            // Return the message in plain text
            return {
                plaintext: message,
                encryptionUnavailable: true,
                error: error.message
            };
        }
    }
    
    async decryptMessage(encryptedMessage) {
        try {
            // First check if this is actually JSON before trying to parse it
            if (typeof encryptedMessage !== 'string' || 
                !encryptedMessage.trim().startsWith('{') ||
                !encryptedMessage.trim().endsWith('}')) {
                return encryptedMessage; // Not encrypted, return as is
            }
            
            // Parse the message components
            let parsed;
            try {
                parsed = JSON.parse(encryptedMessage);
            } catch (error) {
                console.log('Invalid JSON format in encrypted message');
                return encryptedMessage; // Return original if not valid JSON
            }
            
            const { key, iv, data } = parsed;
            
            // Make sure all required encryption components exist
            if (!key || !iv || !data) {
                console.log('Missing encryption components');
                return encryptedMessage;
            }
            
            // Check if we have a private key
            if (!this.keyPair || !this.keyPair.privateKey) {
                console.error('No private key available for decryption');
                return "🔒 Message cannot be decrypted (no decryption key)";
            }
            
            // 1. Decrypt the AES key using our private key
            try {
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
                console.error("Key decryption failed:", error);
                return "🔒 This message was encrypted with a different key and can't be decrypted.";
            }
        } catch (error) {
            console.error("Decryption error:", error);
            return "🔒 Couldn't decrypt this message.";
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
