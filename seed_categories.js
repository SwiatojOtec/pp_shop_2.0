const categories = [
    'Паркетна дошка',
    'Ламінат',
    'Вінілова підлога',
    'Двері',
    'Стінові панелі',
    'Аксесуари'
];

async function seed() {
    for (const name of categories) {
        try {
            const res = await fetch('http://localhost:5000/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                console.log(`Added: ${name}`);
            } else {
                console.log(`Exists or Error: ${name}`);
            }
        } catch (err) {
            console.log(`Failed: ${name}`, err.message);
        }
    }
}

seed();
