import { EOL } from 'os';
import { existsSync, createReadStream } from 'fs';
import { createObjectCsvWriter } from 'csv-writer';
import PQueue from "p-queue";

const queue = new PQueue({ concurrency: 10 });

export const csvWriter = (csvPath) => {
    const headers = [
        { id: 'public_id', title: 'public_id' },
        { id: 'cloudinary_url', title: 'cloudinary_url' },
        { id: 'bunny_url', title: 'bunny_url' }
    ];

    if (csvPath.endsWith('errors.csv')) {
        headers.push({ id: 'error', title: 'error' });
    }

    return createObjectCsvWriter({
        path: csvPath,
        header: headers,
        append: existsSync(csvPath),
    });
}

const parseChunk = async (text, index, processDataCallback) => {
    if (index === 0) {
        // First chunk contains the header
        let headerLine = text.substring(0, text.indexOf(EOL));

        text = text.replace(headerLine+EOL, '');
    }

    let lines = text.split(EOL);
    for(let line of lines) {
        let values = line.split(',');
        const [public_id, cloudinary_url, bunny_url] = values;
        queue.add(async () => processDataCallback(public_id, cloudinary_url, bunny_url));
    }

    await queue.onIdle();
}

export const csvReader = async (csvFilePath, processDataCallback) => {
    return new Promise((resolve, reject) => {
        let chunkCount = 0;
        const readStream = createReadStream(csvFilePath);

        readStream.on('data', async chunk => {
            const text = chunk.toString();
            await parseChunk(text, chunkCount, processDataCallback);
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