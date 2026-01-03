const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, 'fonts');
if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir);

const download = (url, dest) => {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                download(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            const file = fs.createWriteStream(dest);
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
    console.log('Downloading fonts from GitHub UserContent...');
    try {
        await download('https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/Roboto-Regular.ttf', path.join(fontsDir, 'Roboto-Regular.ttf'));
        console.log('Roboto-Regular.ttf downloaded');
        await download('https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/Roboto-Bold.ttf', path.join(fontsDir, 'Roboto-Bold.ttf'));
        console.log('Roboto-Bold.ttf downloaded');

        // Verify file content
        const content = fs.readFileSync(path.join(fontsDir, 'Roboto-Regular.ttf')).slice(0, 10).toString();
        if (content.includes('<!DOCTYPE')) {
            throw new Error('Downloaded file is HTML, not a font!');
        }
        console.log('Verification successful.');
    } catch (err) {
        console.error('Error downloading fonts:', err);
        process.exit(1);
    }
}

main();
