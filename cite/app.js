pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);
const container = document.getElementById('graph-container');
const network = new vis.Network(container, { nodes, edges }, {
    nodes: { shape: 'dot', size: 16, font: { size: 12 } },
    edges: { arrows: 'to', color: '#848484' },
    physics: { stabilization: true }
});

document.getElementById('file-input').addEventListener('change', async (e) => {
    const files = e.target.files;
    document.getElementById('status').innerText = `Processing ${files.length} files...`;

    for (const file of files) {
        const text = await extractText(file);
        const fileName = file.name.replace('.pdf', '');
        
        // 1. Add the uploaded paper as a main node
        if (!nodes.get(fileName)) {
            nodes.add({ id: fileName, label: fileName, color: '#3498db', size: 25 });
        }

        // 2. Extract References
        const refs = parseReferences(text);
        refs.forEach(refTitle => {
            const refId = refTitle.toLowerCase().substring(0, 30); // Simple unique ID
            if (!nodes.get(refId)) {
                nodes.add({ id: refId, label: refTitle.substring(0, 50) + '...', color: '#95a5a6' });
            }
            edges.add({ from: fileName, to: refId });
        });
    }
    document.getElementById('status').innerText = "Graph updated.";
});

async function extractText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(" ") + "\n";
    }
    return fullText;
}

function parseReferences(text) {
    // Find the "References" or "Bibliography" section
    const refIndex = text.search(/references|bibliography/i);
    if (refIndex === -1) return [];

    const refSection = text.substring(refIndex);
    
    // Heuristic: Citations usually start with [1] or Author (Year)
    // This regex looks for common paper title patterns (text inside quotes or between year and volume)
    const titles = [];
    const lines = refSection.split('\n');
    
    // Simple logic: treat each line or numbered block as a potential reference
    const refRegex = /\[\d+\]\s*(.*?)(?=\s*\[\d+\]|$)/gs;
    let match;
    while ((match = refRegex.exec(refSection)) !== null) {
        let cleanTitle = match[1].split('.')[0].trim(); // Take the first sentence/segment
        if (cleanTitle.length > 10) titles.push(cleanTitle);
    }

    // Fallback: If no [1] format, try to split by common author patterns
    if (titles.length === 0) {
        const simpleSplit = refSection.split(/\d{4}/); // Split by years
        simpleSplit.shift(); // Remove text before first year
        simpleSplit.forEach(s => {
            let t = s.trim().split('.')[0];
            if (t.length > 10) titles.push(t);
        });
    }

    return [...new Set(titles)]; // Unique titles only
}

document.getElementById('clear-btn').onclick = () => { nodes.clear(); edges.clear(); };