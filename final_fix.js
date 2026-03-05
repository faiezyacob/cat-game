const fs = require('fs');

// Cleanup script.js
const scriptPath = 'script.js';
if (fs.existsSync(scriptPath)) {
    let script = fs.readFileSync(scriptPath, 'utf8').split('\n');
    // Remove the duplicate header at lines 516-518 (0-indexed)
    // We want to keep one header.
    // Looking at the file, there are two headers back-to-back.
    script.splice(515, 3);
    fs.writeFileSync(scriptPath, script.join('\n'));
}

// Append to style.css
const stylePath = 'style.css';
if (fs.existsSync(stylePath)) {
    let style = fs.readFileSync(stylePath, 'utf8');
    if (!style.includes('.pixel-toast')) {
        style += `
/* Toast Notifications */
.pixel-toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--primary);
    color: white;
    padding: 1rem 2rem;
    border-radius: 30px;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    z-index: 9999;
    font-weight: 600;
    cursor: pointer;
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from { transform: translate(-50%, -100%); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
}
`;
        fs.writeFileSync(stylePath, style);
    }
}
console.log('FINAL_CLEANUP_SUCCESS');
