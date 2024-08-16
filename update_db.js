import path from 'path';
import { createReadStream } from 'fs';
import { EOL } from 'os';
import logger from './logger';
import db from './db';

const csvCheckedFilePath = path.resolve(__dirname, 'check_success.csv');

const migrateDB = async (data, transaction) => {
    // using literal, write a query to update all the data in one go using case statement
    const query = `
    UPDATE files
    SET url = 
        CASE
            ${data.map(([public_id, cloudinary_url, bunny_url]) => `WHEN "cloudinaryId" = '${public_id}' THEN '${bunny_url}'`)}
        END
    WHERE "cloudinaryId" IN (${data.map(([public_id, cloudinary_url, bunny_url]) => `'${public_id}'`)});
    `;

    console.log(query);
    // await db.query(query, {
    //     type: db.QueryTypes.UPDATE,
    //     transaction,
    // });
}

const parseChunk = async (text, index, transaction) => {
    if (index === 0) {
        // First chunk contains the header
        let headerLine = text.substring(0, text.indexOf(EOL));

        text = text.replace(headerLine+EOL, '');
    }

    const res = [];

    let lines = text.split(EOL);
    for(let line of lines) {
        let values = line.split(',');
        const [public_id, cloudinary_url, bunny_url] = values;

        if (!public_id || !cloudinary_url || !bunny_url) {
            logger.error('Invalid CSV line:', line);
            continue;
        }

        res.push([public_id, cloudinary_url, bunny_url]);
    }

    await migrateDB(res, transaction);
}

export const csvReader = async (transaction) => {
    return new Promise((resolve, reject) => {
        let chunkCount = 0;
        const readStream = createReadStream(csvCheckedFilePath);

        readStream.on('data', async chunk => {
            const text = chunk.toString();
            await parseChunk(text, chunkCount, transaction);
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

const readCsvInBatches = async () => {
    const transaction = db.transaction();
    try {
        await csvReader(transaction);
        logger.info('CSV processing completed.');
        await transaction.commit();
    } catch (error) {
        logger.error('Error processing CSV:', error);
    }
}

readCsvInBatches();