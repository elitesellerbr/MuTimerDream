function initDonate() {
    const modal = document.getElementById('donateModal');
    const valueInput = document.getElementById('donateValue');
    const currencySelect = document.getElementById('donateCurrency');
    const methodEU = document.getElementById('donateMethodEU');
    const methodBR = document.getElementById('donateMethodBR');
    const pixResult = document.getElementById('pixResult');

    document.getElementById('btnDonate').addEventListener('click', () => {
        modal.style.display = 'flex';
        pixResult.style.display = 'none';
    });

    // Premium button in header opens the 3-tier pricing modal
    document.getElementById('btnHeaderPremium')?.addEventListener('click', () => {
        if (typeof showPricingModal === 'function') showPricingModal();
    });

    document.getElementById('closeDonate').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    document.querySelectorAll('.donate-amount').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.donate-amount').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const val = btn.dataset.value;
            if (val !== 'custom') {
                valueInput.value = val;
            }
            valueInput.focus();
        });
    });

    currencySelect.addEventListener('change', () => {
        const isBRL = currencySelect.value === 'BRL';
        methodEU.style.display = isBRL ? 'none' : '';
        methodBR.style.display = isBRL ? '' : 'none';
        pixResult.style.display = 'none';

        document.querySelectorAll('.donate-amount').forEach(btn => {
            const v = btn.dataset.value;
            if (v !== 'custom') {
                btn.textContent = isBRL ? `R$${v * 5}` : `€${v}`;
                btn.dataset.value = isBRL ? v * 5 : v;
            }
        });
        if (!isBRL) {
            document.querySelectorAll('.donate-amount').forEach(btn => {
                const v = btn.dataset.value;
                if (v !== 'custom') {
                    const original = [2, 5, 10];
                    const idx = Array.from(btn.parentElement.children).indexOf(btn);
                    if (idx < original.length) {
                        btn.textContent = `€${original[idx]}`;
                        btn.dataset.value = original[idx];
                    }
                }
            });
        }
    });

    // IBAN/BIC copy buttons
    document.querySelectorAll('.iban-copy').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.copy);
            if (!target) return;
            navigator.clipboard.writeText(target.textContent.trim()).then(() => {
                btn.textContent = t('donateCopied');
                setTimeout(() => { btn.textContent = t('donateCopy'); }, 2000);
            });
        });
    });

    document.getElementById('btnPayPix').addEventListener('click', async () => {
        const amount = parseFloat(valueInput.value);
        if (!amount || amount < 1) return alert(t('donateInvalidValue'));
        await generatePix(amount);
    });

    document.getElementById('btnCopyPix').addEventListener('click', () => {
        const code = document.getElementById('pixCode').value;
        navigator.clipboard.writeText(code).then(() => {
            const btn = document.getElementById('btnCopyPix');
            btn.textContent = t('donateCopied');
            setTimeout(() => { btn.textContent = t('donateCopy'); }, 2000);
        });
    });
}

async function generatePix(amount) {
    const btn = document.getElementById('btnPayPix');
    btn.disabled = true;
    btn.querySelector('span:last-child').textContent = t('donateGenerating');

    try {
        const res = await fetch('/api/donate/pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });
        const data = await res.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        document.getElementById('pixCode').value = data.payload;
        document.getElementById('pixResult').style.display = 'block';

        renderPixQR(data.payload);
    } catch {
        alert('Erro ao gerar PIX');
    } finally {
        btn.disabled = false;
        btn.querySelector('span:last-child').textContent = t('donatePayPix');
    }
}

function renderPixQR(text) {
    const canvas = document.getElementById('pixQrCanvas');
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const modules = generateQRMatrix(text);
    if (!modules) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code', size / 2, size / 2 - 8);
        ctx.fillText('Use o código abaixo', size / 2, size / 2 + 8);
        return;
    }

    const cellSize = size / modules.length;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000';

    for (let y = 0; y < modules.length; y++) {
        for (let x = 0; x < modules[y].length; x++) {
            if (modules[y][x]) {
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }
}

function generateQRMatrix(text) {
    if (typeof qrcode !== 'undefined') {
        try {
            const qr = qrcode(0, 'M');
            qr.addData(text);
            qr.make();
            const count = qr.getModuleCount();
            const matrix = [];
            for (let r = 0; r < count; r++) {
                const row = [];
                for (let c = 0; c < count; c++) {
                    row.push(qr.isDark(r, c));
                }
                matrix.push(row);
            }
            return matrix;
        } catch { return null; }
    }
    return null;
}

document.addEventListener('DOMContentLoaded', initDonate);
