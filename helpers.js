import PQueue from 'p-queue';
import bcdn from './bunnyNet';
import cloudinary from './cloudinary';
import db from './db';
import axios from 'axios';

const queue = new PQueue({ concurrency: 10 });

export const getBatch = async (DB_BATCH_SIZE, count) => {
    const query = `
    SELECT "cloudinaryId", url 
    FROM files
    WHERE url LIKE 'https://res.cloudinary.com/nolt%' AND "dateDeleted" IS NULL
    LIMIT ${DB_BATCH_SIZE}
    OFFSET ${count};
    `;

    const data = await db.query(query, {
        type: db.QueryTypes.SELECT,
    });

    return data;
};

const writeLogToFile = (data) => {
    
}

const processItem = async (item) => {
    const { cloudinaryId, url } = item;
    const bunnyPath = url.replace('https://res.cloudinary.com/', '/cldn/');
    // divide bunnyPath into path and fileName
    const fileName = bunnyPath.split('/').pop();
    
    let data;
    try {
        const file = await axios.get(url, {
            responseType: 'arraybuffer',
        });

        data = await bcdn.uploadFile(file.data, fileName, bunnyPath);
    } catch (error) {
        console.error("Error: ", error.status, error.message); 
    }

    console.log("Uploaded: ", url, data);
}

export const processBatch = async (batch) => {
    for(const item of batch) {
        queue.add(() => processItem(item));
    }

    await queue.onIdle();
};