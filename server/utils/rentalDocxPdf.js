const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const PizZip = require('pizzip');
const libre = require('libreoffice-convert');
const { flattenDocxNumbering } = require('./docxNumberingFlatten');
const { wrapContractHtml } = require('./contractHtmlStyles');

const convertAsync = promisify(libre.convert);

function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

async function fillDocxTemplate(templatePath, tokens) {
    const templateBuffer = await fs.readFile(templatePath);
    const zip = new PizZip(templateBuffer);
    let xml = zip.file('word/document.xml').asText();

    for (const [token, rawValue] of Object.entries(tokens)) {
        xml = xml.split(token).join(escapeXml(rawValue));
    }

    zip.file('word/document.xml', xml);
    return zip.generate({ type: 'nodebuffer' });
}

async function convertDocxToPdfViaHtml(docxBuffer) {
    const mammoth = require('mammoth');
    const puppeteer = require('puppeteer');
    const { value: html } = await mammoth.convertToHtml({ buffer: docxBuffer });
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();
        await page.setContent(wrapContractHtml(html), { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '18mm', bottom: '18mm', left: '20mm', right: '15mm' },
            preferCSSPageSize: true,
        });
        return Buffer.from(pdf);
    } finally {
        await browser.close();
    }
}

async function convertDocxToPdf(docxBuffer) {
    const prepared = flattenDocxNumbering(docxBuffer);
    try {
        return await convertAsync(prepared, '.pdf', undefined);
    } catch (libreErr) {
        if (process.env.GOTENBERG_URL) {
            const form = new FormData();
            form.append('files', new Blob([prepared]), 'document.docx');
            const res = await fetch(`${process.env.GOTENBERG_URL}/forms/libreoffice/convert`, {
                method: 'POST',
                body: form,
            });
            if (res.ok) {
                return Buffer.from(await res.arrayBuffer());
            }
        }

        try {
            return await convertDocxToPdfViaHtml(prepared);
        } catch (htmlErr) {
            const error = new Error(
                'Не вдалося конвертувати документ у PDF. Встановіть LibreOffice або перевірте Puppeteer.'
            );
            error.status = 500;
            error.cause = htmlErr;
            throw error;
        }
    }
}

async function generatePdfFromTemplate(templatePath, tokens) {
    const docxBuffer = await fillDocxTemplate(templatePath, tokens);
    const pdfBuffer = await convertDocxToPdf(docxBuffer);
    return { docxBuffer, pdfBuffer };
}

module.exports = {
    escapeXml,
    fillDocxTemplate,
    convertDocxToPdf,
    generatePdfFromTemplate,
};
