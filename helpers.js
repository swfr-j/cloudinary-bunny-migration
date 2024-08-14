import PQueue from 'p-queue';
import bcdn from './bunnyNet';
import cloudinary from './cloudinary';
import db from './db';

const queue = new PQueue({ concurrency: 10 });

export const getBatch = async (DB_BATCH_SIZE, count) => {
    const query = `
    SELECT "cloudinaryId", url 
    FROM files
    WHERE url LIKE 'https://res.cloudinary.com/nolt%'
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
    console.log(`Downloading file ${url}`);
    let bunnyPath = url.replace('https://res.cloudinary.com/', '/cldn/');
    // divide bunnyPath into path and fileName
    const path = bunnyPath.split('/').slice(0, -1).join('/');
    const fileName = bunnyPath.split('/').pop();
    console.log(`Uploading file to BunnyNet ${bunnyPath} ${path} ${fileName}`);
}

export const processBatch = async (batch) => {
    for(const item of batch) {
        queue.add(() => processItem(item));
    }

    await queue.onIdle();
};