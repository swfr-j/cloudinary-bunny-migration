import path from 'path';
import { EOL } from 'os';
import { existsSync, createReadStream } from 'fs';
import { createObjectCsvWriter } from 'csv-writer';

const csvFilePath = path.resolve(__dirname, 'data.csv');
export const csvWriter = createObjectCsvWriter({
    path: csvFilePath,
    header: [
        { id: 'public_id', title: 'public_id' },
        { id: 'cloudinary_url', title: 'cloudinary_url' },
        { id: 'bunny_url', title: 'bunny_url' }
    ],
    append: existsSync(csvFilePath), // Append if the file already exists
});

const parseChunk = (text, index, processDataCallback) => {
    if (index === 0) {
        // First chunk contains the header
        let headerLine = text.substring(0, text.indexOf(EOL));

        text = text.replace(headerLine+EOL, '');
    }

    let lines = text.split(EOL);
    for(let line of lines) {
        let values = line.split(',');
        const [public_id, cloudinary_url, bunny_url] = values;
        processDataCallback(public_id, cloudinary_url, bunny_url);
    }
}

export const csvReader = async (processDataCallback) => {
    return new Promise((resolve, reject) => {
        let chunkCount = 0;
        const readStream = createReadStream(csvFilePath);

        readStream.on('data', chunk => {
            const text = chunk.toString();
            parseChunk(text, chunkCount, processDataCallback);
            chunkCount++;
        });

        readStream.on('end', () => {
            resolve();
        });

        readStream.on('error', error => {
            reject(error);
        });
    })
}