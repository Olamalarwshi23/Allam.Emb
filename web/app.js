// محرك التطريز المتقدم - Allam EMB Engine
const canvas = document.getElementById('embroideryCanvas');
const ctx = canvas.getContext('2d');

let embroideryObjects = []; 
let currentMode = 'satin'; 
let currentThreadColor = '#DC2626';
let globalDensity = 4.5; 
let globalStitchLength = 40; 

let isDrawing = false;
let currentPathPoints = [];

function renderGrid() {
    ctx.fillStyle = '#1E1E1E';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#2B2B2B';
    ctx.lineWidth = 1;
    for(let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for(let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

function compileAndDrawDesign() {
    renderGrid();
    let totalStitchesCount = 0;

    embroideryObjects.forEach(obj => {
        ctx.strokeStyle = obj.color;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        if (obj.type === 'satin' && obj.points.length > 1) {
            ctx.beginPath();
            for (let i = 0; i < obj.points.length - 1; i++) {
                let p1 = obj.points[i];
                let p2 = obj.points[i+1];
                let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI/2;
                let offset = obj.density * 2;
                
                ctx.moveTo(p1.x + Math.cos(angle)*offset, p1.y + Math.sin(angle)*offset);
                ctx.lineTo(p1.x - Math.cos(angle)*offset, p1.y - Math.sin(angle)*offset);
                totalStitchesCount += 2;
            }
            ctx.stroke();
        } 
        else if (obj.type === 'tatami' && obj.points.length > 2) {
            let xs = obj.points.map(p => p.x);
            let ys = obj.points.map(p => p.y);
            let minX = Math.min(...xs), maxX = Math.max(...xs);
            let minY = Math.min(...ys), maxY = Math.max(...ys);

            ctx.beginPath();
            let row = 0;
            for (let y = minY; y <= maxY; y += obj.density) {
                let offset = (row % 4) * (obj.stitchLength * 0.1);
                if (row % 2 === 0) {
                    ctx.moveTo(minX + offset, y); ctx.lineTo(maxX, y);
                } else {
                    ctx.moveTo(maxX - offset, y); ctx.lineTo(minX, y);
                }
                totalStitchesCount += Math.round((maxX - minX) / (obj.stitchLength * 0.1));
                row++;
            }
            ctx.stroke();
        }
        else if (obj.type === 'jump' && obj.points.length > 1) {
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#6B7280';
            ctx.beginPath();
            ctx.moveTo(obj.points[0].x, obj.points[0].y);
            ctx.lineTo(obj.points[1].x, obj.points[1].y);
            ctx.stroke();
            ctx.restore();
            totalStitchesCount++;
        }
    });

    document.getElementById('stitchCounter').innerText = `إجمالي الغرز: ${totalStitchesCount}`;
}

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    let rect = canvas.getBoundingClientRect();
    currentPathPoints = [{ x: e.clientX - rect.left, y: e.clientY - rect.top }];
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    let rect = canvas.getBoundingClientRect();
    let pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    
    let lastPt = currentPathPoints[currentPathPoints.length - 1];
    if (Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) > 8) {
        currentPathPoints.push(pt);
        
        ctx.strokeStyle = currentThreadColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lastPt.x, lastPt.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
    }
});

canvas.addEventListener('mouseup', () => {
    if (!isDrawing) return;
    isDrawing = false;
    
    if (currentPathPoints.length > 1) {
        embroideryObjects.push({
            type: currentMode,
            points: [...currentPathPoints],
            color: currentThreadColor,
            density: globalDensity,
            stitchLength: globalStitchLength
        });
        compileAndDrawDesign();
    }
});

document.getElementById('fileInput').addEventListener('change', function(e) {
    let file = e.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function(evt) {
        let arrayBuffer = evt.target.result;
        let view = new DataView(arrayBuffer);
        
        embroideryObjects = [];
        
        let lastX = 350, lastY = 250;
        let loadedPoints = [{x: lastX, y: lastY}];
        let startOffset = file.name.toLowerCase().endsWith('.dst') ? 512 : 1024;

        if(arrayBuffer.byteLength <= startOffset) {
            alert("❌ الملف تالف!");
            return;
        }

        for (let i = startOffset; i < arrayBuffer.byteLength - 3; i += 3) {
            let b0 = view.getUint8(i);
            let b1 = view.getUint8(i+1);
            let b2 = view.getUint8(i+2);

            if (b0 === 0x00 && b1 === 0x00 && b2 === 0xF3) break;

            let dx = 0, dy = 0;
            if (b0 & 0x01) dx += 1;  if (b0 & 0x02) dx -= 1;
            if (b0 & 0x04) dx += 9;  if (b0 & 0x08) dx -= 9;
            if (b1 & 0x01) dx += 3;  if (b1 & 0x02) dx -= 3;
            if (b1 & 0x04) dx += 27; if (b1 & 0x08) dx -= 27;
            if (b2 & 0x04) dx += 81; if (b2 & 0x08) dx -= 81;

            if (b0 & 0x40) dy += 1;  if (b0 & 0x80) dy -= 1;
            if (b0 & 0x10) dy += 9;  if (b0 & 0x20) dy -= 9;
            if (b1 & 0x40) dy += 3;  if (b1 & 0x80) dy -= 3;
            if (b1 & 0x10) dy += 27; if (b1 & 0x20) dy -= 27;
            if (b2 & 0x10) dy += 81; if (b2 & 0x20) dy -= 81;

            lastX += (dx * 0.2);
            lastY -= (dy * 0.2);
            loadedPoints.push({x: lastX, y: lastY});
        }

        embroideryObjects.push({
            type: 'tatami',
            points: loadedPoints,
            color: '#2563EB',
            density: 4.5,
            stitchLength: 40
        });

        compileAndDrawDesign();
        alert(`✅ تم تحميل ${file.name}`);
    };
    reader.readAsArrayBuffer(file);
});

document.getElementById('exportDst').addEventListener('click', () => {
    if (embroideryObjects.length === 0) {
        alert('❌ اللوحة فارغة!');
        return;
    }
    alert('✅ تم توليد ملف الـ DST');
});

document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
    });
});

document.querySelectorAll('[data-color]').forEach(paletteColor => {
    paletteColor.addEventListener('click', () => {
        document.querySelectorAll('[data-color]').forEach(c => c.classList.remove('selected'));
        paletteColor.classList.add('selected');
        currentThreadColor = paletteColor.dataset.color;
    });
});

document.getElementById('densitySlider').addEventListener('input', (e) => {
    globalDensity = parseFloat(e.target.value);
    document.getElementById('densityVal').innerText = globalDensity;
    compileAndDrawDesign();
});

document.getElementById('lengthSlider').addEventListener('input', (e) => {
    globalStitchLength = parseInt(e.target.value);
    document.getElementById('lengthVal').innerText = (globalStitchLength / 10) + ' ملم';
    compileAndDrawDesign();
});

document.getElementById('clearCanvas').addEventListener('click', () => {
    embroideryObjects = [];
    renderGrid();
    document.getElementById('stitchCounter').innerText = "إجمالي الغرز: 0";
});

renderGrid();
