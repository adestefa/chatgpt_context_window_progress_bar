// content.js

(function() {
    const TC = {
        ver: "1.1",
        promptSelector: '#prompt-textarea', // Selector for the prompt field
        responseSelector: '.markdown',      // Selector for the response elements
        words: [],
        tokens: [],
        tokenLimit: 8192,
        updateInterval: 5000, // 5 seconds
        progressBarId: 'token-progress-container',

        init: function() {
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
        },

        run: function() {
            // Clear previous counts
            this.words = [];
            this.tokens = [];
            let promptWords = 0, responseWords = 0;
            let promptTokens = 0, responseTokens = 0;

            // Count words and tokens in the prompt field
            if (this.promptElement) {
                const pw = this.countWords(this.promptElement.innerText);
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
                words: promptWords + responseWords,
                tokens: promptTokens + responseTokens,
                maxResponse: this.tokenLimit - (promptTokens + responseTokens)
            };

            // Update the progress bar with the new totals
            this.updateProgressBar(totals.tokens, totals.maxResponse);
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
                alignItems: 'center'
            });

            // Create title for the progress bar
            const title = document.createElement('div');
            title.innerText = 'ChatGPT Token Usage';
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
                transition: 'width 0.5s ease'
            });
            this.progressBarBackground.appendChild(this.progressBarFill);

            // Create text to display token count
            this.progressText = document.createElement('div');
            this.progressText.innerText = `0 / ${this.tokenLimit} tokens`;
            Object.assign(this.progressText.style, {
                fontSize: '12px'
            });
            this.progressContainer.appendChild(this.progressText);

            // Append the progress bar container to the body
            document.body.appendChild(this.progressContainer);
        },

        updateProgressBar: function(used, remaining) {
            // Calculate percentage of tokens used
            let percentage = (used / this.tokenLimit) * 100;
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

            // Update the text to reflect current token usage
            this.progressText.innerText = `${used} / ${this.tokenLimit} tokens`;
        },

        startAutoUpdate: function() {
            // Set up an interval to run the token count automatically
            setInterval(() => {
                this.run();
            }, this.updateInterval);
        }
    };

    // Initialize the Token Counter when the content script loads
    TC.init();
})();