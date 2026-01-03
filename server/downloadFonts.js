const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, 'fonts');
if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir);

const download = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                download(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
};

async function main() {
    console.log('Downloading fonts...');
    try {
        await download('https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Regular.ttf', path.join(fontsDir, 'Roboto-Regular.ttf'));
        console.log('Roboto-Regular.ttf downloaded');
        await download('https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf', path.join(fontsDir, 'Roboto-Bold.ttf'));
        console.log('Roboto-Bold.ttf downloaded');
    } catch (err) {
        console.error('Error downloading fonts:', err);
    }
}

main();
