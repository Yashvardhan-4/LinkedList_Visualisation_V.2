document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM ELEMENTS ---
    const dom = {
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        inputSection: document.querySelector('.input-section'),
        mainContentWrapper: document.querySelector('.main-content-wrapper'),
        polyInputContainer: document.getElementById('polyInputContainer'),
        polyInputStep1: document.getElementById('polyInputStep1'),
        polyInputLabel: document.getElementById('polyInputLabel'),
        maxPowerInput: document.getElementById('maxPowerInput'),
        nextPolyStepBtn: document.getElementById('nextPolyStepBtn'),
        polyCoeffForm: document.getElementById('polyCoeffForm'),
        submitPolyBtn: document.getElementById('submitPolyBtn'),
        inputSummary: document.getElementById('input-summary'),
        opAddBtn: document.getElementById('opAddBtn'),
        opSubtractBtn: document.getElementById('opSubtractBtn'),
        opMultiplyBtn: document.getElementById('opMultiplyBtn'),
        playBtn: document.getElementById('playBtn'),
        pauseBtn: document.getElementById('pauseBtn'),
        nextBtn: document.getElementById('nextBtn'),
        resetBtn: document.getElementById('resetBtn'),
        speedRange: document.getElementById('speedRange'),
        poly1ListDiv: document.getElementById('poly1List'),
        poly2ListDiv: document.getElementById('poly2List'),
        resultListDiv: document.getElementById('resultList'),
        visualizationArea: document.getElementById('visualizationArea'),
        explanationBox: document.getElementById('explanationBox'),
        operationHeading: document.getElementById('operationHeading'),
        codeSnippetBox: document.getElementById('codeSnippetBox'),
        timeComplexityText: document.getElementById('timeComplexityText'),
        head1: document.getElementById('head1'),
        head2: document.getElementById('head2'),
        headResult: document.getElementById('headResult'),
    };

    // --- 2. STATE AND CONSTANTS ---
    const complexities = {
        Addition: 'O(m + n)',
        Subtraction: 'O(m + n)',
        Multiplication: 'O(m * n)',
        None: 'N/A'
    };

    const cppCodeSnippets = {
        NONE: `// C++ code will be highlighted here.`,
        ADD_SUB_START: [`struct Node { ... };`, `Node* operate(Node* p1, Node* p2) {`, `   Node* resultHead = nullptr;`, `   Node* current = nullptr;`, ],
        ADD_SUB_LOOP: [`   while (p1 != nullptr && p2 != nullptr) {`],
        ADD_EQUAL: [`   int sum = p1->coeff + p2->coeff;`, `   // ... create and append new node ...`, `   p1 = p1->next;`, `   p2 = p2->next;`],
        SUB_EQUAL: [`   int diff = p1->coeff - p2->coeff;`, `   // ... create and append new node ...`, `   p1 = p1->next;`, `   p2 = p2->next;`],
        P1_GREATER: [`   } else if (p1->power > p2->power) {`, `       // ... append node from p1 ...`, `       p1 = p1->next;`],
        P2_GREATER: [`   } else {`, `       // ... append node from p2 ...`, `       p2 = p2->next;`],
        SUB_P2_GREATER: [`   } else {`, `       // ... append NEGATED node from p2 ...`, `       p2 = p2->next;`],
        P1_REMAINDER: [`   while (p1 != nullptr) {`, `   // ... append node from p1 ...`, `   p1 = p1->next;`],
        P2_REMAINDER: [`   while (p2 != nullptr) {`, `   // ... append node from p2 ...`, `   p2 = p2->next;`],
        SUB_P2_REMAINDER: [`   while (p2 != nullptr) {`, `   // ... append NEGATED node from p2 ...`, `   p2 = p2->next;`],
        MULT_OUTER_LOOP: [`Node* multiply(Node* p1, Node* p2) { ...`, `   for (Node* t1 = p1; t1 != nullptr; t1 = t1->next) {`],
        MULT_INNER_LOOP: [`       for (Node* t2 = p2; t2 != nullptr; t2 = t2->next) {`],
        MULT_CALC: [`           int newCoeff = t1->coeff * t2->coeff;`, `           int newPower = t1->power + t2->power;`, `           // Add to intermediate list...`],
        MULT_COMBINE: [`   // After loops, combine like terms...`],
        END: [`   }`, `   return resultHead;`]
    };

    let state = { poly1: [], poly2: [], result: [], steps: [], currentStep: 0, isPlaying: false, animationSpeed: 1.5, currentPolyTarget: 1, typewriterAnimation: null, resultAddresses: [] };

    // --- 3. HELPER FUNCTIONS ---
    const generateAddresses = (length, rangeStart = 4096, rangeEnd = 8192) => {
        if (length === 0) return [];
        const generated = new Set();
        const maxPossible = Math.floor((rangeEnd - rangeStart) / 4);
        if (length > maxPossible) {
            return Array.from({ length }, (_, i) => `0x${(rangeStart + i * 4).toString(16)}`);
        }
        while (generated.size < length) {
            const randomDecimal = Math.floor(Math.random() * (rangeEnd - rangeStart + 1)) + rangeStart;
            const alignedDecimal = randomDecimal - (randomDecimal % 4);
            generated.add(alignedDecimal);
        }
        return Array.from(generated).map(addr => `0x${addr.toString(16)}`);
    };

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    function typewriter(element, text) {
        if (state.typewriterAnimation) { state.typewriterAnimation.pause(); }
        element.innerHTML = '';
        const p = document.createElement("p");
        p.innerHTML = '> <span class="content"></span><span class="cursor">&nbsp;</span>';
        element.appendChild(p);
        const contentSpan = p.querySelector(".content");
        const textLength = text.length;
        state.typewriterAnimation = anime({
            targets: { progress: 0 },
            progress: textLength,
            round: 1,
            duration: textLength * (30 / state.animationSpeed),
            easing: 'linear',
            update: function (anim) {
                contentSpan.innerHTML = text.slice(0, anim.animations[0].currentValue);
            },
            complete: function() {
                 const cursor = p.querySelector('.cursor');
                 if(cursor) { cursor.style.animation = 'none'; cursor.style.opacity = '0'; }
            }
        });
    }

    const logMessage = (message) => typewriter(dom.explanationBox, message);
    const clearLog = () => {
        if (state.typewriterAnimation) state.typewriterAnimation.pause();
        dom.explanationBox.innerHTML = "";
    };

    function createNodeElement({ coef, power }, idx, listType, addresses) {
        const node = document.createElement('div');
        node.className = 'll-node';
        node.id = `${listType}-node-${idx}`;
        const nextAddr = (listType === 'poly1' || listType === 'poly2') ? (addresses[idx + 1] ? addresses[idx + 1] : 'NULL') : 'NULL';
        const ownAddr = addresses[idx] || `0xdeadbeef`;
        node.innerHTML = `<div class="ll-node-compartments"><div class="ll-compartment ll-coeff">Coeff<br>${coef}</div><div class="ll-compartment ll-power">Power<br>${power}</div><div class="ll-compartment ll-next">Next<br><span class="ll-next-addr">${nextAddr}</span></div></div><div class="ll-address">${ownAddr}</div>`;
        return node;
    }

    function createArrowElement() { const arrow = document.createElement('div'); arrow.className = 'll-arrow'; return arrow; }
    function createNullSymbol() { const nullEl = document.createElement('span'); nullEl.className = 'null-symbol'; nullEl.textContent = '⏚ NULL'; return nullEl; }
    function createPointer(id, text) { const ptr = document.createElement('div'); ptr.id = id; ptr.className = 'll-traversal-ptr'; ptr.textContent = text; ptr.style.opacity = '0'; dom.visualizationArea.appendChild(ptr); return ptr; }

    const p1Ptr = createPointer('p1-ptr', 'P1');
    const p2Ptr = createPointer('p2-ptr', 'P2');
    const resultPtr = createPointer('result-ptr', 'Result');

    async function movePointerToNode(ptr, node) {
        const targetOpacity = node ? 1 : 0;
        let left = ptr.offsetLeft; let top = ptr.offsetTop;
        if (node) {
            const areaRect = dom.visualizationArea.getBoundingClientRect();
            const nodeRect = node.getBoundingClientRect();
            left = nodeRect.left - areaRect.left + nodeRect.width / 2 - ptr.offsetWidth / 2;
            top = nodeRect.top - areaRect.top - 40;
        }
        await anime({ targets: ptr, left: left, top: [top - 20, top], opacity: targetOpacity, duration: 600 / state.animationSpeed, easing: 'easeOutElastic(1, .8)' }).finished;
    }

    function updateHeadPointers() {
        ['poly1List', 'poly2List', 'resultList'].forEach(listId => {
            const listDiv = dom[`${listId}Div`];
            if (!listDiv) return;
            const headPointerContainer = listDiv.parentElement.parentElement.querySelector('.head-pointer-container');
            const firstNode = listDiv.querySelector('.ll-node');
            if (firstNode) {
                const containerRect = listDiv.parentElement.parentElement.getBoundingClientRect();
                const nodeRect = firstNode.getBoundingClientRect();
                const top = nodeRect.top - containerRect.top + (nodeRect.height / 2) - (headPointerContainer.offsetHeight / 2);
                headPointerContainer.style.top = `${top}px`;
                headPointerContainer.style.opacity = '1';
            } else {
                headPointerContainer.style.top = '50%';
                headPointerContainer.style.transform = 'translateY(-50%)';
                headPointerContainer.style.opacity = '0';
            }
        });
    }

    // --- 4. CORE ALGORITHM & VISUALIZATION LOGIC ---
    function generateSteps(operation) {
        state.steps = []; let p1 = 0, p2 = 0;
        state.steps.push({ action: 'start', p1, p2, commentary: "Start of function. Pointers p1 and p2 are set to the heads of the two lists.", codeId: 'ADD_SUB_START', line: 1 });
        while (p1 < state.poly1.length && p2 < state.poly2.length) {
            const node1 = state.poly1[p1], node2 = state.poly2[p2];
            state.steps.push({ action: 'highlight', p1, p2, commentary: "Comparing nodes pointed to by p1 and p2.", codeId: 'ADD_SUB_LOOP', line: 0 });
            if (node1.power === node2.power) {
                let res, codeId, opChar;
                if (operation === 'addition') { res = node1.coef + node2.coef; codeId = 'ADD_EQUAL'; opChar = '+'; } 
                else { res = node1.coef - node2.coef; codeId = 'SUB_EQUAL'; opChar = '-'; }
                state.steps.push({ action: 'add_node', from: 'merge', data: { coef: res, power: node1.power }, p1, p2, commentary: `Powers are equal. Calculating coefficients (${node1.coef} ${opChar} ${node2.coef} = ${res}).`, codeId, line: 0 });
                p1++; p2++;
            } else if (node1.power > node2.power) {
                state.steps.push({ action: 'add_node', from: 'p1', data: node1, p1, commentary: `p1's power (${node1.power}) is greater. Copying node from p1.`, codeId: 'P1_GREATER', line: 0 });
                p1++;
            } else {
                const data = operation === 'addition' ? node2 : { ...node2, coef: -node2.coef };
                const commentary = operation === 'addition' ? `p2's power (${node2.power}) is greater. Copying node from p2.` : `p2's power (${node2.power}) is greater. Copying NEGATED node from p2.`;
                state.steps.push({ action: 'add_node', from: 'p2', data, p2, commentary, codeId: operation === 'addition' ? 'P2_GREATER' : 'SUB_P2_GREATER', line: 0 });
                p2++;
            }
        }
        while (p1 < state.poly1.length) {
            state.steps.push({ action: 'highlight', p1, p2: -1, commentary: "List 2 is empty. Processing remainder of List 1.", codeId: 'P1_REMAINDER', line: 0 });
            state.steps.push({ action: 'add_node', from: 'p1', data: state.poly1[p1], p1, commentary: `Copying remaining node ${state.poly1[p1].coef}x^${state.poly1[p1].power} from List 1.`, codeId: 'P1_REMAINDER', line: 1 });
            p1++;
        }
        while (p2 < state.poly2.length) {
            state.steps.push({ action: 'highlight', p1: -1, p2, commentary: "List 1 is empty. Processing remainder of List 2.", codeId: 'P2_REMAINDER', line: 0 });
            const node2 = state.poly2[p2];
            const data = operation === 'addition' ? node2 : { ...node2, coef: -node2.coef };
            const commentary = operation === 'addition' ? `Copying remaining node ${node2.coef}x^${node2.power} from List 2.` : `Copying remaining NEGATED node (${-node2.coef}x^${node2.power}) from List 2.`;
            state.steps.push({ action: 'add_node', from: 'p2', data, p2, commentary, codeId: operation === 'addition' ? 'P2_REMAINDER' : 'SUB_P2_REMAINDER', line: 1 });
            p2++;
        }
        state.steps.push({ action: 'end', commentary: "Both lists processed. Operation complete.", codeId: 'END', line: 1 });
    }

    function generateMultiplicationSteps() {
        state.steps = []; let intermediate = [];
        state.steps.push({ action: 'start', commentary: "Starting multiplication.", codeId: 'MULT_OUTER_LOOP', line: 1 });
        for (let i = 0; i < state.poly1.length; i++) {
            const node1 = state.poly1[i];
            state.steps.push({ action: 'highlight', p1: i, p2: -1, commentary: `Outer loop: selecting term ${node1.coef}x^${node1.power} from Poly 1.`, codeId: 'MULT_OUTER_LOOP', line: 1 });
            for (let j = 0; j < state.poly2.length; j++) {
                const node2 = state.poly2[j];
                state.steps.push({ action: 'highlight', p1: i, p2: j, commentary: `Inner loop: multiplying by ${node2.coef}x^${node2.power} from Poly 2.`, codeId: 'MULT_INNER_LOOP', line: 0 });
                const newCoeff = node1.coef * node2.coef;
                const newPower = node1.power + node2.power;
                intermediate.push({ coef: newCoeff, power: newPower });
                state.steps.push({ action: 'show_intermediate', data: [...intermediate], commentary: `Result is ${newCoeff}x^${newPower}. Adding to intermediate list.`, codeId: 'MULT_CALC', line: 0 });
            }
        }
        intermediate.sort((a, b) => b.power - a.power);
        state.steps.push({ action: 'start_combine', commentary: "All products calculated. Now, combining like terms.", codeId: 'MULT_COMBINE', line: 1 });
        if (intermediate.length > 0) {
            let combined = [];
            for (const term of intermediate) {
                if (combined.length > 0 && combined[combined.length - 1].power === term.power) {
                    combined[combined.length - 1].coef += term.coef;
                    state.steps.push({ action: 'update_node', index: combined.length - 1, data: combined[combined.length - 1], commentary: `Term with power ${term.power} exists. Combining coefficients.`, codeId: 'MULT_COMBINE', line: 1 });
                } else {
                    combined.push({ ...term });
                    state.steps.push({ action: 'add_node', from: 'carry', data: term, commentary: `Adding new term ${term.coef}x^${term.power} to final result.`, codeId: 'MULT_COMBINE', line: 1 });
                }
            }
        }
        state.steps.push({ action: 'end', commentary: "Multiplication complete.", codeId: 'END', line: 1 });
    }

    async function executeStep(step) {
        logMessage(step.commentary);
        if (step.codeId && cppCodeSnippets[step.codeId]) {
            dom.codeSnippetBox.innerHTML = cppCodeSnippets[step.codeId].map((line, idx) => `<span class="code-line ${idx === step.line ? 'active' : ''}">${line}</span>`).join('');
        }
        document.querySelectorAll('.ll-node.highlight').forEach(n => n.classList.remove('highlight'));
        await movePointerToNode(p1Ptr, document.getElementById(`poly1-node-${step.p1}`));
        await movePointerToNode(p2Ptr, document.getElementById(`poly2-node-${step.p2}`));
        await movePointerToNode(resultPtr, document.getElementById(`result-node-${state.result.length - 1}`));
        switch (step.action) {
            case 'highlight':
                document.getElementById(`poly1-node-${step.p1}`)?.classList.add('highlight');
                document.getElementById(`poly2-node-${step.p2}`)?.classList.add('highlight');
                break;
            case 'add_node':
                if (step.data.coef === 0) {
                    logMessage("Resulting coefficient is 0. No node is created to save memory.");
                    await delay(600 / state.animationSpeed);
                    break;
                }
                const resultIdx = state.result.length;
                let ghostNode;
                const areaRect = dom.visualizationArea.getBoundingClientRect();
                if (step.from === 'p1' || step.from === 'p2') {
                    const sourceNode = document.getElementById(`poly${step.from[1]}-node-${step[step.from]}`);
                    ghostNode = sourceNode.cloneNode(true);
                    ghostNode.classList.add('ghost');
                    const sourceRect = sourceNode.getBoundingClientRect();
                    ghostNode.style.position = 'absolute';
                    ghostNode.style.left = `${sourceRect.left - areaRect.left}px`;
                    ghostNode.style.top = `${sourceRect.top - areaRect.top}px`;
                    dom.visualizationArea.appendChild(ghostNode);
                    const targetLeft = dom.resultListDiv.getBoundingClientRect().left - areaRect.left + dom.resultListDiv.scrollWidth;
                    const targetTop = dom.resultListDiv.getBoundingClientRect().top - areaRect.top;
                    await anime({ targets: ghostNode, left: targetLeft, top: targetTop, scale: 0.8, opacity: 0, duration: 800 / state.animationSpeed, easing: 'easeInExpo' }).finished;
                    ghostNode.remove();
                } else if (step.from === 'merge') {
                    const node1 = document.getElementById(`poly1-node-${step.p1}`);
                    const node2 = document.getElementById(`poly2-node-${step.p2}`);
                    const rect1 = node1.getBoundingClientRect();
                    const rect2 = node2.getBoundingClientRect();
                    const midX = ((rect1.left + rect2.left) / 2) - areaRect.left;
                    const midY = ((rect1.top + rect2.top) / 2) - areaRect.top;
                    const tl = anime.timeline({ easing: 'easeInOutSine', duration: 300 / state.animationSpeed });
                    tl.add({ targets: [node1, node2], translateX: (el, i) => i === 0 ? 15 : -15, });
                    tl.add({ targets: [node1, node2], translateX: 0, });
                    ghostNode = createNodeElement(step.data, 'ghost', 'result', []);
                    ghostNode.classList.add('ghost');
                    ghostNode.style.position = 'absolute';
                    ghostNode.style.left = `${midX}px`;
                    ghostNode.style.top = `${midY}px`;
                    ghostNode.style.opacity = 0;
                    dom.visualizationArea.appendChild(ghostNode);
                    const targetLeft = dom.resultListDiv.getBoundingClientRect().left - areaRect.left + dom.resultListDiv.scrollWidth;
                    const targetTop = dom.resultListDiv.getBoundingClientRect().top - areaRect.top;
                    await tl.finished;
                    await anime({ targets: ghostNode, left: targetLeft, top: targetTop, scale: [0.5, 1], opacity: [0.6, 0], duration: 800 / state.animationSpeed, easing: 'easeInExpo' }).finished;
                    ghostNode.remove();
                }
                state.result.push(step.data);
                if (resultIdx === 0) dom.resultListDiv.innerHTML = '';
                const newArrow = resultIdx > 0 ? createArrowElement() : null;
                if (newArrow) dom.resultListDiv.appendChild(newArrow);
                const tempAddresses = [];
                tempAddresses[resultIdx] = state.resultAddresses[resultIdx];
                const newNodeEl = createNodeElement(step.data, resultIdx, 'result', tempAddresses);
                dom.resultListDiv.appendChild(newNodeEl);
                const creationTimeline = anime.timeline({ duration: 500 / state.animationSpeed, complete: updateHeadPointers });
                if (newArrow) { creationTimeline.add({ targets: newArrow, width: [0, 30], easing: 'easeOutQuad' }, 0); }
                creationTimeline.add({ targets: newNodeEl, scale: [0.7, 1], opacity: [0.5, 1], easing: 'easeOutBack' }, 0);
                await creationTimeline.finished;
                if (resultIdx > 0) {
                    const prevNodeEl = document.getElementById(`result-node-${resultIdx - 1}`);
                    if (prevNodeEl) {
                        const newAddress = newNodeEl.querySelector('.ll-address').textContent;
                        prevNodeEl.querySelector('.ll-next-addr').textContent = newAddress;
                        anime({ targets: prevNodeEl.querySelector('.ll-next'), backgroundColor: ['#f59e42', '#64748b'], duration: 600 });
                    }
                }
                break;
            case 'update_node':
                const nodeToUpdate = document.getElementById(`result-node-${step.index}`);
                if (nodeToUpdate) {
                    nodeToUpdate.querySelector('.ll-coeff').innerHTML = `Coeff<br>${step.data.coef}`;
                    await anime({ targets: nodeToUpdate, scale: [1.15, 1], duration: 400, easing: 'easeOutBack' }).finished;
                }
                break;
            case 'show_intermediate':
                dom.resultListDiv.innerHTML = '<div class="list-title" style="width: 100%; text-align: left; margin-bottom: 0.5rem;">Intermediate Products:</div>';
                step.data.forEach((term, i) => { if (i > 0) dom.resultListDiv.appendChild(createArrowElement()); dom.resultListDiv.appendChild(createNodeElement(term, i, 'inter', generateAddresses(step.data.length, 500))); });
                anime({ targets: dom.resultListDiv.querySelectorAll('.ll-node'), scale: [0.5, 1], opacity: [0, 1], delay: anime.stagger(50), complete: updateHeadPointers });
                break;
            case 'start_combine':
                state.result = []; dom.resultListDiv.innerHTML = ''; updateHeadPointers();
                break;
        }
    }

    // --- 5. CONTROL FLOW & UI BINDINGS ---
    function playAnimation() { if (state.isPlaying) return; state.isPlaying = true; updateControlButtons(); const nextAnim = async () => { if (!state.isPlaying || state.currentStep >= state.steps.length) { state.isPlaying = false; updateControlButtons(); return; } await executeStep(state.steps[state.currentStep]); state.currentStep++; setTimeout(nextAnim, 1200 / state.animationSpeed); }; nextAnim(); }
    function pauseAnimation() { state.isPlaying = false; updateControlButtons(); }
    async function nextStep() { if (state.isPlaying || state.currentStep >= state.steps.length) return; dom.nextBtn.disabled = true; try { await executeStep(state.steps[state.currentStep]); state.currentStep++; } finally { updateControlButtons(); } }

    const resetVisualization = (fullReset = false) => {
        pauseAnimation();
        state.result = []; 
        state.steps = []; 
        state.currentStep = 0;

        // Hide traversal pointers
        movePointerToNode(p1Ptr, null);
        movePointerToNode(p2Ptr, null);
        movePointerToNode(resultPtr, null);
        
        updateControlButtons(true);
        document.querySelectorAll('.op-btn').forEach(btn => btn.classList.remove('active'));
        clearLog();
        dom.timeComplexityText.textContent = complexities['None'];
        dom.codeSnippetBox.innerHTML = cppCodeSnippets.NONE;
        dom.operationHeading.textContent = `2. Choose an Operation`;

        if (fullReset) {
            state.poly1 = [];
            state.poly2 = [];
            state.currentPolyTarget = 1;
            dom.polyInputStep1.classList.remove('hidden');
            dom.polyCoeffForm.classList.add('hidden');
            dom.submitPolyBtn.classList.add('hidden');
            dom.polyCoeffForm.innerHTML = '';
            updatePolyInputPrompt();
            logMessage("System reset. Please enter polynomials.");
            if (!dom.mainContentWrapper.classList.contains('hidden')) {
                dom.mainContentWrapper.classList.add('fade-out');
                dom.mainContentWrapper.addEventListener('animationend', () => {
                    dom.mainContentWrapper.classList.add('hidden');
                    dom.mainContentWrapper.classList.remove('fade-out', 'fade-in');
                    dom.inputSection.classList.remove('hidden', 'fade-out');
                    dom.inputSection.classList.add('fade-in');
                }, { once: true });
            }
        }
        showInitialLists();
    };
    
    const updateControlButtons = (forceDisable = false) => {
        const opButtonsDisabled = forceDisable || (state.poly1.length === 0 && state.poly2.length === 0);
        document.querySelectorAll('.op-btn').forEach(btn => btn.disabled = opButtonsDisabled);
        const controlsDisabled = forceDisable || state.steps.length === 0;
        dom.playBtn.disabled = controlsDisabled || state.isPlaying;
        dom.pauseBtn.disabled = controlsDisabled || !state.isPlaying;
        dom.nextBtn.disabled = controlsDisabled || state.isPlaying || state.currentStep >= state.steps.length;
    };

    function showInitialLists() {
        [1, 2].forEach(num => {
            const listDiv = dom[`poly${num}ListDiv`], polyArr = state[`poly${num}`];
            listDiv.innerHTML = '';
            if (polyArr.length === 0) {
                listDiv.appendChild(createNullSymbol());
                return;
            }
            const addresses = num === 1 ? generateAddresses(polyArr.length, 4096, 7168) : generateAddresses(polyArr.length, 8192, 11264);
            polyArr.forEach((term, i) => {
                if (i > 0) listDiv.appendChild(createArrowElement());
                const nodeEl = createNodeElement(term, i, `poly${num}`, addresses);
                nodeEl.style.opacity = 0;
                listDiv.appendChild(nodeEl);
            });
             anime({
                 targets: listDiv.querySelectorAll('.ll-node, .ll-arrow'),
                 translateX: [-50, 0],
                 opacity: [0, 1],
                 delay: anime.stagger(100 / state.animationSpeed, { start: 200 }),
                 duration: 800 / state.animationSpeed,
                 easing: 'easeOutExpo',
                 complete: updateHeadPointers
             });
        });
        dom.resultListDiv.innerHTML = '';
        dom.resultListDiv.appendChild(createNullSymbol());
        updateHeadPointers();
    };

    function updatePolyInputPrompt() { 
        const polyNumText = state.currentPolyTarget === 1 ? "One" : "Two"; 
        dom.polyInputLabel.textContent = `Enter Max Power of Polynomial ${polyNumText}:`; 
        dom.submitPolyBtn.textContent = `Submit Polynomial ${polyNumText}`; 
        dom.maxPowerInput.value = ''; 
        dom.maxPowerInput.focus(); 
    };
    
    const startOperation = (opName, stepGenerator) => {
        resetVisualization(false); // Reset previous operation state

        // Set the active button
        const activeBtn = Array.from(document.querySelectorAll('.op-btn')).find(btn => btn.textContent.includes(opName));
        if (activeBtn) activeBtn.classList.add('active');

        dom.operationHeading.textContent = `2. Performing: ${opName}`;
        dom.timeComplexityText.textContent = complexities[opName] || 'N/A';
        let maxResultSize = (opName === 'Multiplication') ? state.poly1.length * state.poly2.length : state.poly1.length + state.poly2.length;
        state.resultAddresses = generateAddresses(maxResultSize, 16384, 24576);
        
        stepGenerator(opName.toLowerCase());
        updateControlButtons(false);
    };

    // --- 6. EVENT LISTENERS & INITIALIZATION ---
    dom.themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        dom.themeToggleBtn.textContent = isDarkMode ? '☀️' : '🌙';
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });
    
    dom.nextPolyStepBtn.addEventListener('click', () => { 
        const maxPower = parseInt(dom.maxPowerInput.value); 
        if (isNaN(maxPower) || maxPower < 0 || maxPower > 50) { 
            alert("Please enter a valid power between 0 and 50."); 
            return; 
        } 
        dom.polyInputStep1.classList.add('hidden'); 
        
        const fieldsHTML = [];
        for (let p = maxPower; p >= 0; p--) { 
            fieldsHTML.push(`<div><label>Coef of x^${p}: <input type="number" name="coeff_${p}" step="any" value="0"></label></div>`); 
        } 
        dom.polyCoeffForm.innerHTML = fieldsHTML.join('');
        
        dom.polyCoeffForm.classList.remove('hidden'); 
        dom.submitPolyBtn.classList.remove('hidden'); 
    });
    
    dom.submitPolyBtn.addEventListener('click', () => {
        const maxPower = parseInt(dom.maxPowerInput.value); 
        let arr = [];
        for (let p = maxPower; p >= 0; p--) {
            const coef = Number(dom.polyCoeffForm.querySelector(`[name="coeff_${p}"]`).value) || 0;
            if (coef !== 0) arr.push({ coef, power: p });
        }
        state[`poly${state.currentPolyTarget}`] = arr;
        if (state.currentPolyTarget === 1) {
            state.currentPolyTarget = 2; 
            showInitialLists();
            dom.polyInputStep1.classList.remove('hidden');
            dom.polyCoeffForm.innerHTML = ''; 
            dom.polyCoeffForm.classList.add('hidden');
            dom.submitPolyBtn.classList.add('hidden');
            updatePolyInputPrompt();
        } else {
            dom.inputSection.classList.add('fade-out');
            dom.inputSection.addEventListener('animationend', () => {
                dom.inputSection.classList.add('hidden');
                dom.mainContentWrapper.classList.remove('hidden');
                dom.mainContentWrapper.classList.add('fade-in');
                logMessage("Polynomials created. Choose an operation.");
                showInitialLists();
                updateControlButtons(false);
            }, { once: true });
        }
    });

    dom.opAddBtn.addEventListener('click', () => startOperation('Addition', generateSteps));
    dom.opSubtractBtn.addEventListener('click', () => startOperation('Subtraction', generateSteps));
    dom.opMultiplyBtn.addEventListener('click', () => startOperation('Multiplication', generateMultiplicationSteps));

    dom.playBtn.addEventListener('click', playAnimation);
    dom.pauseBtn.addEventListener('click', pauseAnimation);
    dom.nextBtn.addEventListener('click', nextStep);
    dom.resetBtn.addEventListener('click', () => resetVisualization(true));
    dom.speedRange.addEventListener('input', () => state.animationSpeed = Number(dom.speedRange.value));

    const initialize = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            dom.themeToggleBtn.textContent = '☀️';
        } else {
            dom.themeToggleBtn.textContent = '🌙';
        }
        state.animationSpeed = dom.speedRange.value;
        resetVisualization(true);
    };

    initialize();
});