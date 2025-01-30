// content.js

(function() {
    const TC = {
        ver: "1.5",
        promptSelector: '#prompt-textarea', // Selector for the prompt field
        responseSelector: '.markdown',      // Selector for the response elements
        modelSelector: 'span.text-token-text-secondary', // Updated selector for the model name
        words: [],
        tokens: [],
        tokenLimit: 8192, // Default token limit (will be updated based on model)
        updateInterval: 5000, // 5 seconds
        progressBarId: 'token-progress-container',

        init: function() {
            // Load the token limit from storage (if implemented)
            // this.loadTokenLimit(); // Uncomment if using persistent storage

            // Select the prompt element
            this.promptElement = document.querySelector(this.promptSelector);
            
            // Initialize by selecting all current response elements
            this.responseElements = document.querySelectorAll(this.responseSelector);
            this.len = this.responseElements.length;
            
            // Add event listener for real-time updates on the prompt field
            if (this.promptElement) {
                this.promptElement.addEventListener('input', this.run.bind(this));
            }

            // Create the floating progress bar
            this.createProgressBar();
            
            // Initial run to populate the progress bar
            this.run();
            
            // Start automatic updates at specified intervals
            this.startAutoUpdate();

            // Set up MutationObserver to watch for model changes
            this.setupModelObserver();
        },

        run: function() {
            // Clear previous counts
            this.words = [];
            this.tokens = [];
            let promptWords = 0, responseWords = 0;
            let promptTokens = 0, responseTokens = 0;

            // Count words and tokens in the prompt field
            if (this.promptElement) {
                const pw = this.countWords(this.promptElement.value || this.promptElement.innerText);
                promptWords += pw;
                this.words.push(pw);
                const pt = this.estimateTokens(pw);
                promptTokens += pt;
                this.tokens.push(pt);
            }

            // Re-select response elements to include any new responses
            this.responseElements = document.querySelectorAll(this.responseSelector);
            this.len = this.responseElements.length;

            // Count words and tokens in each response
            this.responseElements.forEach(response => {
                const rw = this.countWords(response.innerText);
                responseWords += rw;
                this.words.push(rw);
                const rt = this.estimateTokens(rw);
                responseTokens += rt;
                this.tokens.push(rt);
            });

            // Calculate totals
            const totals = {
                usedTokens: promptTokens + responseTokens,
                maxTokens: this.tokenLimit
            };

            // Update the progress bar with the new totals
            this.updateProgressBar(totals.usedTokens, totals.maxTokens);
        },

        estimateTokens: function(wordCount) {
            const averageTokensPerWord = 1.33; // Average token estimation
            return Math.round(wordCount * averageTokensPerWord);
        },

        countWords: function(str) {
            str = str.trim();
            if (str === "") return 0;
            // Regex to match words, considering contractions and hyphenated words
            const words = str.match(/\b[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*\b/g);
            return words ? words.length : 0;
        },

        createProgressBar: function() {
            // Prevent multiple instances of the progress bar
            if (document.getElementById(this.progressBarId)) return;

            // Create container for the progress bar
            this.progressContainer = document.createElement('div');
            this.progressContainer.id = this.progressBarId;
            Object.assign(this.progressContainer.style, {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                width: '250px',
                padding: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                borderRadius: '8px',
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                zIndex: '10000',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer' // Indicate that the div is clickable
            });

            // Create title for the progress bar
            const title = document.createElement('div');
            title.innerHTML = 'Context Window - <a style="font-size:9px; color: #fff;" target="_blank" href="https://adestefa.github.io/GitServer/">Wut?</a>';
            Object.assign(title.style, {
                marginBottom: '8px',
                fontWeight: 'bold'
            });
            this.progressContainer.appendChild(title);

            // Create the background of the progress bar
            this.progressBarBackground = document.createElement('div');
            Object.assign(this.progressBarBackground.style, {
                width: '100%',
                height: '20px',
                backgroundColor: '#ddd',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '8px'
            });
            this.progressContainer.appendChild(this.progressBarBackground);

            // Create the fill element of the progress bar
            this.progressBarFill = document.createElement('div');
            Object.assign(this.progressBarFill.style, {
                height: '100%',
                width: '0%',
                backgroundColor: '#4caf50',
                borderRadius: '10px 0 0 10px',
                transition: 'width 0.5s ease, background-color 0.5s ease'
            });
            this.progressBarBackground.appendChild(this.progressBarFill);

            // Create text to display used and max tokens
            this.progressText = document.createElement('div');
            this.progressText.innerText = `0 / ${this.tokenLimit} tokens`;
            Object.assign(this.progressText.style, {
                fontSize: '12px'
            });
            this.progressContainer.appendChild(this.progressText);

            // Optional: Add click event listener to the progress container to set token limit manually
            // If you want to retain the ability to set token limit manually, uncomment the following line
            // this.progressContainer.addEventListener('click', this.setTokenLimit.bind(this));

            // Append the progress bar container to the body
            document.body.appendChild(this.progressContainer);
        },

        updateProgressBar: function(used, max) {
            // Calculate percentage of tokens used
            let percentage = (used / max) * 100;
            if (percentage > 100) percentage = 100;
            this.progressBarFill.style.width = `${percentage}%`;

            // Change color based on usage thresholds
            if (percentage < 50) {
                this.progressBarFill.style.backgroundColor = '#4caf50'; // Green
            } else if (percentage < 80) {
                this.progressBarFill.style.backgroundColor = '#ff9800'; // Orange
            } else {
                this.progressBarFill.style.backgroundColor = '#f44336'; // Red
            }

            // Update the text to reflect used and max tokens
            this.progressText.innerText = `${used} / ${max} tokens`;
        },

        startAutoUpdate: function() {
            // Set up an interval to run the token count automatically
            setInterval(() => {
                this.run();
            }, this.updateInterval);
        },

        setupModelObserver: function() {
            const observer = new MutationObserver((mutationsList) => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        this.detectModelAndSetLimit();
                        break; // Exit after handling the first relevant mutation
                    }
                }
            });

            // Observe changes to the entire document body to catch dynamic updates
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });

            // Initial detection of the model
            this.detectModelAndSetLimit();
        },

        detectModelAndSetLimit: function() {
            // Use the working selector provided by the user
            const modelElements = document.querySelectorAll('span.text-token-text-secondary');

            if (modelElements.length > 1) {
                const modelName = modelElements[1].innerText.toLowerCase();
                console.log("Model found: " + modelName);

                // Define model to token limit mapping
                const modelTokenMap = {
                    '4o': 8192,
                    'o1-mini': 64000,
                    'o1': 32000
                    
                };

                // Find the matching token limit
                let newTokenLimit = this.tokenLimit; // Default to current limit
                for (const [model, limit] of Object.entries(modelTokenMap)) {
                    if (modelName.indexOf(model.toLowerCase())!== -1) {
                        console.log(modelName + " Found!");
                        newTokenLimit = limit;
                        break;
                    }
                }

                // If the token limit has changed, update it and refresh the progress bar
                if (newTokenLimit !== this.tokenLimit) {
                    this.tokenLimit = newTokenLimit;
                    this.updateProgressBarDisplay(); // Update the progress bar display
                    this.run(); // Re-run to update token counts based on new limit
                }
            } else {
                console.warn("Unable to find the model name using the provided selector.");
            }
        },

        updateProgressBarDisplay: function() {
             // Update the progress text to reflect the new token limit
             if (this.progressText) {
                 // Retrieve the current used tokens from the progress bar text
                 const currentText = this.progressText.innerText;
                 const usedTokensMatch = currentText.match(/^(\d+)\s*\/\s*\d+\s*tokens$/);
                 let usedTokens = 0;
                 if (usedTokensMatch && usedTokensMatch[1]) {
                     usedTokens = parseInt(usedTokensMatch[1], 10);
                 }

                 this.progressText.innerText = `${usedTokens} / ${this.tokenLimit} tokens`;
             }
        },

        // Optional: Methods to load and save token limit using chrome.storage
        // Uncomment and implement if you want to persist the token limit
        /*
        loadTokenLimit: function() {
            // Use chrome.storage to load the token limit
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['tokenLimit'], (result) => {
                    if (result.tokenLimit && Number.isInteger(result.tokenLimit) && result.tokenLimit > 0) {
                        this.tokenLimit = result.tokenLimit;
                        // If the progress bar already exists, update the text
                        const existingProgressText = document.getElementById(this.progressBarId)?.querySelector('div:nth-child(4)');
                        if (existingProgressText) {
                            existingProgressText.innerText = `${this.tokenLimit} tokens left`;
                        }
                        // Re-run to apply the new token limit
                        this.run();
                    }
                });
            }
        },

        saveTokenLimit: function() {
            // Use chrome.storage to save the token limit
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ tokenLimit: this.tokenLimit }, () => {
                    console.log(`Token limit set to ${this.tokenLimit}`);
                });
            }
        },
        */
    };

    // Initialize the Token Counter when the content script loads
    TC.init();
})();
