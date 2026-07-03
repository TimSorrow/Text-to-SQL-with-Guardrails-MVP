// App.js for SafeSQL Console Frontend
document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const userInput = document.getElementById("user-input");
    const runBtn = document.getElementById("run-btn");
    const runBtnText = runBtn.querySelector(".btn-text");
    const spinner = runBtn.querySelector(".spinner");
    const modeToggle = document.getElementById("mode-toggle");
    const statusDot = document.getElementById("status-dot");
    const statusText = document.getElementById("status-text");
    
    // Preset & Tab elements
    const tabBtns = document.querySelectorAll(".tab-btn");
    const safePresets = document.getElementById("safe-presets");
    const unsafePresets = document.getElementById("unsafe-presets");
    const presetBtns = document.querySelectorAll(".preset-btn");

    // Pipeline elements
    const stepPrompt = document.getElementById("step-prompt");
    const stepLlm = document.getElementById("step-llm");
    const stepGuardrail = document.getElementById("step-guardrail");
    const stepDb = document.getElementById("step-db");

    // Output containers
    const resultsWelcome = document.getElementById("results-welcome");
    const resultsDetail = document.getElementById("results-detail");
    const resultsBlocked = document.getElementById("results-blocked");
    const sqlOutput = document.getElementById("sql-output");
    const tableResultsContainer = document.getElementById("table-results-container");
    const blockErrorDesc = document.getElementById("block-error-desc");
    const resultsSection = document.getElementById("results-section");

    // Application state
    let isSandboxMode = modeToggle.checked;

    // Tabs functionality
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const tab = btn.dataset.tab;
            if (tab === "safe") {
                safePresets.classList.remove("hidden");
                unsafePresets.classList.add("hidden");
            } else {
                safePresets.classList.add("hidden");
                unsafePresets.classList.remove("hidden");
            }
        });
    });

    // Preset buttons paste text
    presetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            userInput.value = btn.dataset.query;
            userInput.focus();
        });
    });

    // Mode Toggle Logic
    modeToggle.addEventListener("change", () => {
        isSandboxMode = modeToggle.checked;
        updateStatus();
    });

    function updateStatus() {
        const cards = document.querySelectorAll(".glass-card");
        if (isSandboxMode) {
            statusDot.className = "pulse-dot orange";
            statusText.innerText = "Offline Sandbox Mode (Simulated)";
            cards.forEach(card => card.classList.add("sandbox-active-border"));
        } else {
            statusDot.className = "pulse-dot green";
            statusText.innerText = "Live Connection: Local gemma4 Active";
            cards.forEach(card => card.classList.remove("sandbox-active-border"));
        }
    }
    
    // Initial status check
    updateStatus();

    // Helper functions to manage pipeline visual state
    function resetPipelineStyles() {
        const steps = [stepPrompt, stepLlm, stepGuardrail, stepDb];
        steps.forEach(step => {
            step.className = "pipeline-step";
            step.querySelector(".step-status").innerText = "Pending";
        });
    }

    function setStepState(stepElement, state, text) {
        stepElement.className = `pipeline-step ${state}`;
        stepElement.querySelector(".step-status").innerText = text;
    }

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Execution Orchestrator
    runBtn.addEventListener("click", async () => {
        const query = userInput.value.trim();
        if (!query) {
            alert("Please type or select a natural language query first!");
            return;
        }

        // Lock button UI
        runBtn.disabled = true;
        runBtnText.innerText = "Processing...";
        spinner.classList.remove("hidden");

        // Reset outputs
        resetPipelineStyles();
        resultsSection.classList.remove("results-blocked-border");
        resultsWelcome.classList.add("hidden");
        resultsDetail.classList.add("hidden");
        resultsBlocked.classList.add("hidden");

        if (isSandboxMode) {
            await handleSandboxExecution(query);
        } else {
            await handleLiveExecution(query);
        }

        // Unlock button UI
        runBtn.disabled = false;
        runBtnText.innerText = "Execute Pipeline";
        spinner.classList.add("hidden");
    });

    // SANDBOX SIMULATOR PIPELINE
    async function handleSandboxExecution(query) {
        // Step 1: Prompt Construction
        setStepState(stepPrompt, "active", "Processing");
        await sleep(600);
        setStepState(stepPrompt, "success", "Reflected");

        // Step 2: LLM SQL Translation
        setStepState(stepLlm, "active", "Inference");
        await sleep(1000);
        
        let generatedSql = "";
        let isMutating = false;
        let mutationType = "";
        
        // Analyze query to simulate output
        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes("drop") || lowerQuery.includes("таблиц")) {
            generatedSql = "DROP TABLE products;";
            isMutating = true;
            mutationType = "Drop";
        } else if (lowerQuery.includes("delete") || lowerQuery.includes("удал")) {
            generatedSql = "DELETE FROM users WHERE id = 1;";
            isMutating = true;
            mutationType = "Delete";
        } else if (lowerQuery.includes("insert") || lowerQuery.includes("добав")) {
            generatedSql = "INSERT INTO users (name, email) VALUES ('Hacker', 'hacked@malicious.com');";
            isMutating = true;
            mutationType = "Insert";
        } else if (lowerQuery.includes("update") || lowerQuery.includes("обнов")) {
            generatedSql = "UPDATE products SET price = 0 WHERE id = 1;";
            isMutating = true;
            mutationType = "Update";
        } else if (lowerQuery.includes("expensive") || lowerQuery.includes("дорог")) {
            generatedSql = "SELECT title, price FROM products ORDER BY price DESC LIMIT 1;";
        } else if (lowerQuery.includes("email") || lowerQuery.includes("почт")) {
            generatedSql = "SELECT name, email FROM users WHERE email LIKE '%@example.com';";
        } else {
            generatedSql = "SELECT title, price FROM products WHERE price > 600;";
        }

        setStepState(stepLlm, "success", "Generated");

        // Step 3: Guardrail check
        setStepState(stepGuardrail, "active", "Parsing AST");
        await sleep(800);

        if (isMutating) {
            setStepState(stepGuardrail, "failed", "Blocked");
            setStepState(stepDb, "failed", "Aborted");
            resultsSection.classList.add("results-blocked-border");
            
            // Show blocked message
            blockErrorDesc.innerText = `Security Guardrail Violation: Mutating/Unsafe node type '${mutationType}' detected in query.`;
            resultsBlocked.classList.remove("hidden");
        } else {
            setStepState(stepGuardrail, "success", "Passed");
            
            // Step 4: DB execution
            setStepState(stepDb, "active", "Running");
            await sleep(600);
            setStepState(stepDb, "success", "Done");

            // Mock DB results
            let mockData = [];
            if (generatedSql.includes("LIMIT 1")) {
                mockData = [{ title: "Laptop", price: 999 }];
            } else if (generatedSql.includes("users")) {
                mockData = [
                    { name: "Alice Smith", email: "alice@example.com" },
                    { name: "Bob Jones", email: "bob@example.com" }
                ];
            } else {
                mockData = [{ title: "Laptop", price: 999 }];
            }

            renderResults(generatedSql, mockData);
        }
    }

    // LIVE PIPELINE (Calls FastAPI Backend)
    async function handleLiveExecution(query) {
        try {
            // Step 1: Prompt Construction
            setStepState(stepPrompt, "active", "Processing");
            await sleep(300);
            setStepState(stepPrompt, "success", "Reflected");

            // Step 2: LLM SQL Translation
            setStepState(stepLlm, "active", "Inference");
            
            const response = await fetch(`/v1/query?user_query=${encodeURIComponent(query)}`, {
                method: "POST",
                headers: {
                    "accept": "application/json"
                }
            });

            const data = await response.json();

            if (response.status === 200) {
                // Successful read-only query
                setStepState(stepLlm, "success", "Generated");
                setStepState(stepGuardrail, "success", "Passed");
                setStepState(stepDb, "success", "Done");
                
                renderResults(data.generated_sql, data.results);
            } else if (response.status === 400 && data.detail.includes("Guardrail")) {
                // Blocked by Guardrail
                setStepState(stepLlm, "success", "Generated");
                setStepState(stepGuardrail, "failed", "Blocked");
                setStepState(stepDb, "failed", "Aborted");
                resultsSection.classList.add("results-blocked-border");

                blockErrorDesc.innerText = data.detail;
                resultsBlocked.classList.remove("hidden");
            } else {
                // General error (Ollama offline or db failure)
                setStepState(stepLlm, "failed", "Error");
                setStepState(stepGuardrail, "failed", "Aborted");
                setStepState(stepDb, "failed", "Aborted");
                
                showGeneralError(data.detail || "An unexpected error occurred during processing.");
            }

        } catch (error) {
            console.error("Live execution failed: ", error);
            setStepState(stepLlm, "failed", "Offline");
            setStepState(stepGuardrail, "failed", "Aborted");
            setStepState(stepDb, "failed", "Aborted");

            showGeneralError("Could not connect to FastAPI server. Ensure the backend is running at http://localhost:8000/ or switch to Sandbox Mode.");
        }
    }

    // Render results in interactive HTML Table
    function renderResults(sql, data) {
        sqlOutput.innerText = sql;
        tableResultsContainer.innerHTML = "";

        if (!data || data.length === 0) {
            tableResultsContainer.innerHTML = "<p class='code-font'>Empty set returned (no records found).</p>";
            resultsDetail.classList.remove("hidden");
            return;
        }

        const table = document.createElement("table");
        table.className = "results-table";

        // Generate Headers
        const headerRow = document.createElement("tr");
        const keys = Object.keys(data[0]);
        keys.forEach(key => {
            const th = document.createElement("th");
            th.innerText = key;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        // Generate Rows
        data.forEach(row => {
            const tr = document.createElement("tr");
            keys.forEach(key => {
                const td = document.createElement("td");
                td.innerText = row[key];
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        tableResultsContainer.appendChild(table);
        resultsDetail.classList.remove("hidden");
    }

    function showGeneralError(msg) {
        sqlOutput.innerText = "-- Pipeline Interrupted --";
        tableResultsContainer.innerHTML = `<p class='code-font' style='color: var(--accent-rose);'>> ERROR: ${msg}</p>`;
        resultsDetail.classList.remove("hidden");
    }
});
